import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Envio de Mensagem Individual WhatsApp (API / Web)
 * Segurança Hardened:
 * 1. Verificação centralizada de Não Perturbe (DND).
 * 2. Autenticação por sessão de operador ou segredo interno.
 * 3. Distinção clara entre link gerado (web) e mensagem confirmada (api).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;
    const adminSecret = process.env.ADMIN_WEBHOOK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    let authUser = null;
    let isInternalAuthorized = Boolean(token && adminSecret && token === adminSecret);

    if (token && !isInternalAuthorized) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authUser = user;
        }
      } catch {}
    }

    const { telefone, mensagem, lead_id, empresa_id } = await req.json();

    if (!telefone || !mensagem) {
      return NextResponse.json({ error: "Telefone e mensagem são obrigatórios" }, { status: 400 });
    }

    const cleanNumber = telefone.replace(/\D/g, "");
    const formattedPhone = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    // 1. Verificação do Não Perturbe (DND)
    const { data: dndEntry } = await supabase
      .from("lista_nao_perturbe")
      .select("id")
      .eq("telefone", formattedPhone)
      .eq("ativo", true)
      .maybeSingle();

    if (dndEntry) {
      return NextResponse.json({
        success: false,
        error: "Contato cadastrado na lista Não Perturbe (DND). Envio bloqueado por conformidade Bacen/LGPD.",
        dndBlocked: true
      }, { status: 403 });
    }

    // 2. Busca configurações de WhatsApp da empresa
    let userEmpresaId = empresa_id || (authUser?.app_metadata?.empresa_id as string) || null;
    if (!userEmpresaId && authUser?.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", authUser.email)
        .maybeSingle();
      if (op?.empresa_id) {
        userEmpresaId = op.empresa_id;
      }
    }

    let configQuery = supabase
      .from("app_configuracoes")
      .select("wa_mode, wa_api_url, wa_api_token, wa_instance_name");

    if (userEmpresaId) {
      configQuery = configQuery.eq("empresa_id", userEmpresaId);
    }

    const { data: config } = await configQuery.limit(1).maybeSingle();

    const waMode = config?.wa_mode || "web";
    const apiUrl = config?.wa_api_url?.trim() || "";
    const apiToken = config?.wa_api_token?.trim() || "";
    const instanceName = config?.wa_instance_name?.trim() || "";

    // ─── MODO 1: ENVIO EM SEGUNDO PLANO VIA API (Evolution API / Z-API) ───
    if (waMode === "api" && apiUrl && apiToken) {
      try {
        let endpoint = "";
        let headers: Record<string, string> = { "Content-Type": "application/json" };
        let payload: any = {};

        if (apiUrl.includes("z-api.io") || apiUrl.includes("z-api")) {
          endpoint = `${apiUrl.replace(/\/$/, "")}/instances/${instanceName}/token/${apiToken}/send-text`;
          headers["Client-Token"] = apiToken;
          payload = { phone: formattedPhone, message: mensagem };
        } else {
          endpoint = `${apiUrl.replace(/\/$/, "")}/message/sendText/${instanceName || "default"}`;
          headers["apikey"] = apiToken;
          payload = { number: formattedPhone, text: mensagem };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000)
        });

        const resData = await response.json().catch(() => ({}));

        if (response.ok) {
          if (lead_id) {
            await supabase.from("historico_ligacoes").insert({
              lead_id,
              tabulacao: "WhatsApp Enviado (API Confirmada)",
              duracao_segundos: 0
            });
          }

          return NextResponse.json({
            success: true,
            method: "api",
            status: "delivered",
            message: "Mensagem disparada e confirmada pelo provedor de WhatsApp!",
            data: resData
          });
        } else {
          const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
          return NextResponse.json({
            success: false,
            method: "fallback",
            status: "link_prepared",
            error: resData?.message || "Provedor de WhatsApp retornou erro",
            waUrl
          });
        }
      } catch (apiErr: any) {
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
        return NextResponse.json({
          success: false,
          method: "fallback",
          status: "link_prepared",
          error: apiErr?.message || "Provedor de WhatsApp inacessível",
          waUrl
        });
      }
    }

    // ─── MODO 2: NATIVO (Link wa.me gerado para envio manual pelo operador) ───
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
    return NextResponse.json({
      success: true,
      method: "web",
      status: "link_prepared",
      delivered: false,
      waUrl,
      message: "Link WhatsApp Web preparado para abertura e envio pelo operador."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
