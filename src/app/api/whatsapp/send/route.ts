import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabase } from "@/lib/supabase";

/**
 * Registra o histórico e atualiza a última tabulação de forma atômica
 */
async function logWhatsAppDispatch(
  leadId?: number,
  empresaId?: string,
  tabulacao?: string,
  messagePreview?: string
) {
  if (!leadId) return;
  const nowIso = new Date().toISOString();
  await Promise.allSettled([
    supabase
      .from("leads")
      .update({
        ultima_tabulacao: tabulacao,
        updated_at: nowIso
      })
      .eq("id", leadId)
      .eq("empresa_id", empresaId),
    supabase.from("historico_ligacoes").insert({
      lead_id: leadId,
      tabulacao: `${tabulacao}: "${(messagePreview || "").slice(0, 250)}"`,
      duracao_segundos: 0
    })
  ]);
}

/**
 * Envio de Mensagem Individual WhatsApp Multi-Provedor (Evolution v2, Z-API, Meta Cloud, Webhook, Web)
 * Segurança Hardened:
 * 1. Autenticação obrigatória (operador logado ou secret interno).
 * 2. Isolamento estrito por empresa_id do operador.
 * 3. Verificação centralizada de Não Perturbe (DND).
 * 4. Timeouts estritos com AbortSignal.
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
    // Verifica tanto com DDI (55...) quanto sem DDI para evitar bypass de formato
    const cleanWithoutDdi = formattedPhone.replace(/^55/, "");
    const { data: dndEntry, error: dndError } = await supabase
      .from("lista_nao_perturbe")
      .select("id")
      .or(`telefone.eq.${formattedPhone},telefone.eq.${cleanWithoutDdi}`)
      .eq("ativo", true)
      .limit(1)
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

    // Busca configurações de WhatsApp da empresa autenticada
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select(`
        whatsapp_tipo, zapi_instancia, zapi_token, evolution_url, evolution_api_key,
        wa_mode, wa_api_url, wa_api_token, wa_instance_name,
        whatsapp_provider, wa_phone_number_id, wa_client_token
      `)
      .eq("empresa_id", targetEmpresaId)
      .maybeSingle();

    const tipo = (config?.whatsapp_provider || config?.wa_mode || config?.whatsapp_tipo || "web").toLowerCase();
    const apiUrl = config?.wa_api_url || config?.evolution_url || "";
    const apiToken = config?.wa_api_token || config?.evolution_api_key || config?.zapi_token || "";
    const instanceName = config?.wa_instance_name || config?.zapi_instancia || "";
    const phoneNumberId = config?.wa_phone_number_id || "";
    const clientToken = config?.wa_client_token || "";

    // 1. MODO WEB (Link manual para WhatsApp Web ou Mobile)
    if (tipo === "web") {
      const encodedMsg = encodeURIComponent(mensagem);
      const waLink = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
      const waMobileLink = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

      await logWhatsAppDispatch(lead_id, targetEmpresaId, "[WhatsApp Web] Link gerado", mensagem);

      return NextResponse.json({
        success: true,
        provider: "web",
        method: "web",
        status: "link_prepared",
        delivered: false,
        link: waLink,
        waUrl: waLink,
        mobileLink: waMobileLink,
        phone: formattedPhone,
        message: "Link de envio preparado para o WhatsApp Web."
      });
    }

    // 2. MODO EVOLUTION API (v1 / v2)
    if (tipo === "evolution" && apiUrl && apiToken) {
      const base = apiUrl.replace(/\/$/, "");
      const targetUrl = instanceName ? `${base}/message/sendText/${instanceName}` : `${base}/message/sendText`;

      const evoRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiToken
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: mensagem,
          textMessage: { text: mensagem },
          options: { delay: 1000, presence: "composing" }
        }),
        signal: AbortSignal.timeout(10000)
      });

      const evoData = await evoRes.json().catch(() => ({}));

      if (evoRes.ok) {
        await logWhatsAppDispatch(lead_id, targetEmpresaId, "[Evolution API] Mensagem enviada", mensagem);
        return NextResponse.json({
          success: true,
          provider: "evolution",
          method: "api",
          status: "sent",
          delivered: true,
          messageId: evoData?.key?.id || evoData?.id,
          evolutionResponse: evoData
        });
      }

      return NextResponse.json({
        success: false,
        error: "Falha Evolution API: " + (evoData.message || evoRes.statusText)
      }, { status: 502 });
    }

    // 3. MODO Z-API
    if (tipo === "zapi" && instanceName && apiToken) {
      const zapiUrl = `https://api.z-api.io/instances/${instanceName}/token/${apiToken}/send-text`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (clientToken) headers["Client-Token"] = clientToken;

      const zapiRes = await fetch(zapiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: formattedPhone, message: mensagem }),
        signal: AbortSignal.timeout(10000)
      });

      const zapiData = await zapiRes.json().catch(() => ({}));

      if (zapiRes.ok) {
        await logWhatsAppDispatch(lead_id, targetEmpresaId, "[Z-API] Mensagem enviada", mensagem);
        return NextResponse.json({
          success: true,
          provider: "zapi",
          method: "api",
          status: "sent",
          delivered: true,
          messageId: zapiData?.messageId || zapiData?.zaapId,
          zapiResponse: zapiData
        });
      }

      return NextResponse.json({
        success: false,
        error: "Falha Z-API: " + (zapiData.message || zapiRes.statusText)
      }, { status: 502 });
    }

    // 4. MODO META CLOUD API
    if (tipo === "meta" && phoneNumberId && apiToken) {
      const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { preview_url: false, body: mensagem }
        }),
        signal: AbortSignal.timeout(10000)
      });

      const metaData = await metaRes.json().catch(() => ({}));

      if (metaRes.ok) {
        await logWhatsAppDispatch(lead_id, targetEmpresaId, "[Meta Cloud API] Mensagem enviada", mensagem);
        return NextResponse.json({
          success: true,
          provider: "meta",
          method: "api",
          status: "sent",
          delivered: true,
          messageId: metaData?.messages?.[0]?.id,
          metaResponse: metaData
        });
      }

      return NextResponse.json({
        success: false,
        error: "Falha Meta Cloud API: " + (metaData?.error?.message || metaRes.statusText)
      }, { status: 502 });
    }

    // 5. MODO CUSTOM WEBHOOK
    if (tipo === "webhook" && apiUrl) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;

      const whRes = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: formattedPhone, message: mensagem, lead_id }),
        signal: AbortSignal.timeout(10000)
      });

      const whData = await whRes.json().catch(() => ({}));

      if (whRes.ok) {
        await logWhatsAppDispatch(lead_id, targetEmpresaId, "[Custom Webhook] Mensagem enviada", mensagem);
        return NextResponse.json({
          success: true,
          provider: "webhook",
          method: "api",
          status: "sent",
          delivered: true,
          webhookResponse: whData
        });
      }

      return NextResponse.json({
        success: false,
        error: "Falha Custom Webhook: " + whRes.statusText
      }, { status: 502 });
    }

    return NextResponse.json({
      error: `Provedor de WhatsApp '${tipo}' não configurado corretamente para a empresa.`
    }, { status: 400 });

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/send:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}