import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

/**
 * Envio de Mensagem Individual WhatsApp (API / Web)
 * Segurança Hardened:
 * 1. Autenticação obrigatória (operador logado ou secret interno).
 * 2. Isolamento estrito por empresa_id do operador.
 * 3. Verificação centralizada de Não Perturbe (DND).
 * 4. Distinção clara entre link gerado (web) e mensagem confirmada (api).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
    const adminSecret = process.env.ADMIN_WEBHOOK_SECRET;

    let authUser = null;
    const isInternalAuthorized = Boolean(
      token && adminSecret &&
      Buffer.from(token).length === Buffer.from(adminSecret).length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(adminSecret))
    );

    if (token && !isInternalAuthorized) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authUser = user;
        }
      } catch {}
    }

    // Bloqueia requisições não autenticadas
    if (!authUser && !isInternalAuthorized) {
      return NextResponse.json({ error: "Autenticação obrigatória para envio de WhatsApp." }, { status: 401 });
    }

    const { telefone, mensagem, lead_id, empresa_id } = await req.json();

    if (typeof telefone !== "string" || typeof mensagem !== "string" || !telefone.trim() || !mensagem.trim()) {
      return NextResponse.json({ error: "Telefone e mensagem são obrigatórios" }, { status: 400 });
    }
    if (mensagem.length > 4000) {
      return NextResponse.json({ error: "A mensagem excede o limite de 4.000 caracteres." }, { status: 400 });
    }

    // Isolamento estrito de tenant (operador não pode enviar por outro tenant)
    let callerEmpresaId = authUser?.app_metadata?.empresa_id || null;
    if (!callerEmpresaId && authUser?.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", authUser.email)
        .maybeSingle();
      callerEmpresaId = op?.empresa_id;
    }

    const targetEmpresaId = callerEmpresaId || (isInternalAuthorized ? empresa_id : null);
    if (!targetEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa identificada para o envio." }, { status: 403 });
    }

    const cleanNumber = telefone.replace(/\D/g, "");
    if (cleanNumber.length < 10 || cleanNumber.length > 13) {
      return NextResponse.json({ error: "Número de telefone inválido." }, { status: 400 });
    }
    const formattedPhone = cleanNumber.startsWith("55") ? cleanNumber : "55" + cleanNumber;

    if (lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("id", lead_id)
        .eq("empresa_id", targetEmpresaId)
        .maybeSingle();
      if (leadError) return NextResponse.json({ error: "Não foi possível validar o lead para o envio." }, { status: 502 });
      if (!lead) return NextResponse.json({ error: "Lead não encontrado nesta empresa." }, { status: 404 });
    }

    // Falhar fechado se a lista Não Perturbe não puder ser consultada.
    const { data: dndEntry, error: dndError } = await supabase
      .from("lista_nao_perturbe")
      .select("id")
      .eq("telefone", formattedPhone)
      .eq("ativo", true)
      .maybeSingle();

    if (dndError) {
      console.error("[WhatsApp] Falha ao consultar lista Não Perturbe:", dndError);
      return NextResponse.json({ error: "Não foi possível verificar a lista Não Perturbe; envio bloqueado por segurança." }, { status: 503 });
    }

    if (dndEntry) {
      return NextResponse.json({
        success: false,
        error: "Contato cadastrado na lista Não Perturbe (DND). Envio bloqueado por conformidade Bacen/LGPD.",
        dndBlocked: true
      }, { status: 403 });
    }

    // 2. Busca configurações de WhatsApp da empresa autenticada
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select("whatsapp_tipo, zapi_instancia, zapi_token, evolution_url, evolution_api_key")
      .eq("empresa_id", targetEmpresaId)
      .maybeSingle();

    const tipo = config?.whatsapp_tipo || "web";

    // MODO WEB (WhatsApp Web / Sofia Extension): Gera link wa.me para abertura assistida
    if (tipo === "web") {
      const encodedMsg = encodeURIComponent(mensagem);
      const waLink = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
      const waMobileLink = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

      if (lead_id) {
        await supabase
          .from("leads")
          .update({
            ultima_tabulacao: "[WhatsApp Web] Link de atendimento gerado",
            updated_at: new Date().toISOString()
          })
          .eq("id", lead_id)
          .eq("empresa_id", targetEmpresaId);

        await supabase.from("historico_ligacoes").insert({
          lead_id,
          tabulacao: `[WhatsApp Web]: "${mensagem.slice(0, 200)}"`,
          duracao_segundos: 0
        });
      }

      return NextResponse.json({
        success: true,
        method: "web",
        status: "link_prepared",
        delivered: false,
        link: waLink,
        mobileLink: waMobileLink,
        phone: formattedPhone,
        message: "Link de envio preparado para o WhatsApp Web. O envio final é concluído no navegador do operador."
      });
    }

    // MODO API (Z-API)
    if (tipo === "zapi" && config?.zapi_instancia && config?.zapi_token) {
      const zapiUrl = `https://api.z-api.io/instances/${config.zapi_instancia}/token/${config.zapi_token}/send-messages`;
      
      const zapiRes = await fetch(zapiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formattedPhone, message: mensagem })
      });

      const zapiData = await zapiRes.json().catch(() => ({}));

      if (zapiRes.ok) {
        if (lead_id) {
          await supabase
            .from("leads")
            .update({
              ultima_tabulacao: "[Z-API WhatsApp] Mensagem enviada",
              updated_at: new Date().toISOString()
            })
            .eq("id", lead_id)
            .eq("empresa_id", targetEmpresaId);

          await supabase.from("historico_ligacoes").insert({
            lead_id,
            tabulacao: `[Z-API WhatsApp]: "${mensagem.slice(0, 200)}"`,
            duracao_segundos: 0
          });
        }

        return NextResponse.json({
          success: true,
          method: "zapi",
          status: "sent",
          delivered: true,
          zapiResponse: zapiData
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Falha no envio Z-API: " + (zapiData.message || zapiRes.statusText)
        }, { status: 502 });
      }
    }

    // MODO EVOLUTION API
    if (tipo === "evolution" && config?.evolution_url && config?.evolution_api_key) {
      const evoUrl = `${config.evolution_url.replace(/\/$/, "")}/message/sendText`;

      const evoRes = await fetch(evoUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.evolution_api_key
        },
        body: JSON.stringify({
          number: formattedPhone,
          options: { delay: 1200, presence: "composing", linkPreview: false },
          textMessage: { text: mensagem }
        })
      });

      const evoData = await evoRes.json().catch(() => ({}));

      if (evoRes.ok) {
        if (lead_id) {
          await supabase
            .from("leads")
            .update({
              ultima_tabulacao: "[Evolution API] Mensagem enviada",
              updated_at: new Date().toISOString()
            })
            .eq("id", lead_id)
            .eq("empresa_id", targetEmpresaId);

          await supabase.from("historico_ligacoes").insert({
            lead_id,
            tabulacao: `[Evolution API]: "${mensagem.slice(0, 200)}"`,
            duracao_segundos: 0
          });
        }

        return NextResponse.json({
          success: true,
          method: "evolution",
          status: "sent",
          delivered: true,
          evolutionResponse: evoData
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Falha no envio Evolution: " + (evoData.message || evoRes.statusText)
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      error: `Provedor de WhatsApp '${tipo}' não configurado corretamente para a empresa.`
    }, { status: 400 });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/send:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
