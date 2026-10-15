import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // ─── Identificação de Autenticação (Opcional / Fallback Seguro) ──────────
    const authHeader = req.headers.get("authorization");
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;

    let authUser = null;
    if (token) {
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authUser = user;
        }
      } catch {
        // Fallback gracioso para as configurações padrão da plataforma
      }
    }

    const { telefone, mensagem, lead_id } = await req.json();

    if (!telefone || !mensagem) {
      return NextResponse.json({ error: "Telefone e mensagem são obrigatórios" }, { status: 400 });
    }

    const cleanNumber = telefone.replace(/\D/g, "");
    const formattedPhone = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    // Busca configurações de WhatsApp salvas no banco (com suporte a multitenancy)
    const userEmpresaId = authUser?.user_metadata?.empresa_id;
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

        // Detecção automática de provedor pelo formato da URL
        if (apiUrl.includes("z-api.io") || apiUrl.includes("z-api")) {
          // Padrão Z-API
          endpoint = `${apiUrl.replace(/\/$/, "")}/instances/${instanceName}/token/${apiToken}/send-text`;
          headers["Client-Token"] = apiToken;
          payload = { phone: formattedPhone, message: mensagem };
        } else {
          // Padrão Evolution API / Baileys
          endpoint = `${apiUrl.replace(/\/$/, "")}/message/sendText/${instanceName || "default"}`;
          headers["apikey"] = apiToken;
          payload = { number: formattedPhone, text: mensagem };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (response.ok) {
          // Registra envio no histórico do lead se aplicável
          if (lead_id) {
            await supabase.from("historico_ligacoes").insert({
              lead_id,
              tabulacao: "WhatsApp Enviado (API)",
              duracao_segundos: 0
            });
          }

          return NextResponse.json({
            success: true,
            method: "api",
            message: "Mensagem disparada com sucesso via WhatsApp API!",
            data: resData
          });
        } else {
          console.warn("Aviso ao enviar via API WhatsApp:", resData);
          // Retorna fallback do link wa.me para o operador não ficar na mão
          const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
          return NextResponse.json({
            success: false,
            method: "fallback",
            error: resData?.message || "API de WhatsApp retornou erro",
            waUrl
          });
        }
      } catch (apiErr: any) {
        console.error("Erro de conexão com API WhatsApp:", apiErr);
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
        return NextResponse.json({
          success: false,
          method: "fallback",
          error: apiErr?.message || "Servidor de WhatsApp inacessível",
          waUrl
        });
      }
    }

    // ─── MODO 2: NATIVO (Link wa.me direto para o WhatsApp do operador) ───
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagem)}`;
    return NextResponse.json({
      success: true,
      method: "web",
      waUrl
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
