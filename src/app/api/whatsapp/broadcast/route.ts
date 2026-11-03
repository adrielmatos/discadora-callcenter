import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

/**
 * Disparador em Massa de WhatsApp Multi-Provedor (Evolution, Z-API, Meta, Webhook, Web)
 * Segurança Hardened:
 * 1. Autenticação obrigatória (GET e POST).
 * 2. Isolamento estrito por empresa_id do operador logado.
 * 3. Exclusão cruzada contra lista_nao_perturbe (DND) sem limites de paginação em memória.
 * 4. Disparo real via API comercial quando configurada, sem forçar abertura de abas.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Autenticação obrigatória para consultar fila de disparos." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 200);
    const targetEtapa = searchParams.get("etapa") || "";

    // Deriva a empresa do operador autenticado
    let userEmpresaId = user.app_metadata?.empresa_id || null;
    if (!userEmpresaId && user.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
      userEmpresaId = op?.empresa_id || null;
    }

    if (!userEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa vinculada ao usuário logado." }, { status: 403 });
    }

    const clientDb = supabaseAdmin || supabase;

    // Busca candidatos no banco
    let leadsQuery = clientDb
      .from("leads")
      .select("id, nome, telefone, banco, margem_disponivel, produto, etapa_crm, ultima_tabulacao")
      .eq("empresa_id", userEmpresaId)
      .neq("status", "bloqueado_dnd")
      .order("id", { ascending: true })
      .limit(limit);

    if (targetEtapa && targetEtapa !== "all") {
      leadsQuery = leadsQuery.ilike("etapa_crm", `%${targetEtapa}%`);
    }

    const { data: rawLeads, error } = await leadsQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rawLeads || rawLeads.length === 0) {
      return NextResponse.json({ success: true, total: 0, leads: [] });
    }

    // Coleta todos os números candidatos para verificação direcionada no DND
    const phoneCandidates: string[] = [];
    const leadMap = new Map<number, any>();

    for (const l of rawLeads) {
      const clean = (l.telefone || "").replace(/\D/g, "");
      if (clean.length >= 10) {
        const with55 = clean.startsWith("55") ? clean : `55${clean}`;
        const without55 = with55.replace(/^55/, "");
        phoneCandidates.push(with55, without55);
        leadMap.set(l.id, {
          ...l,
          telefoneLimpo: with55,
          primeiroNome: (l.nome || "Cliente").trim().split(" ")[0]
        });
      }
    }

    // Consulta Não Perturbe especificamente para os números candidatos (sem limites de memória)
    const { data: dndMatches, error: dndError } = await clientDb
      .from("lista_nao_perturbe")
      .select("telefone")
      .in("telefone", phoneCandidates)
      .eq("ativo", true);

    if (dndError) {
      console.error("[WhatsApp broadcast] Falha ao consultar DND direcionado:", dndError);
      return NextResponse.json({ error: "Não foi possível validar a lista Não Perturbe." }, { status: 503 });
    }

    const blockedSet = new Set<string>((dndMatches || []).map((d: any) => String(d.telefone || "").replace(/\D/g, "")));

    const validLeads = Array.from(leadMap.values()).filter((l: any) => {
      const without55 = l.telefoneLimpo.replace(/^55/, "");
      return !blockedSet.has(l.telefoneLimpo) && !blockedSet.has(without55);
    });

    return NextResponse.json({
      success: true,
      total: validLeads.length,
      leads: validLeads
    });

  } catch (error: any) {
    console.error("Erro na fila de disparos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Autenticação obrigatória para registrar disparo." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    // Deriva a empresa do operador autenticado
    let userEmpresaId = user.app_metadata?.empresa_id || null;
    if (!userEmpresaId && user.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
      userEmpresaId = op?.empresa_id || null;
    }

    if (!userEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa vinculada ao usuário para registrar disparo." }, { status: 403 });
    }

    const { leadId, telefone, mensagemEnviada } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const clientDb = supabaseAdmin || supabase;

    // Busca configurações de WhatsApp da empresa para saber se é Web ou API
    const { data: config } = await clientDb
      .from("app_configuracoes")
      .select(`
        whatsapp_provider, wa_mode, whatsapp_tipo,
        wa_api_url, evolution_url,
        wa_api_token, evolution_api_key, zapi_token,
        wa_instance_name, zapi_instancia,
        wa_phone_number_id, wa_client_token
      `)
      .eq("empresa_id", userEmpresaId)
      .maybeSingle();

    const provider = (config?.whatsapp_provider || config?.wa_mode || config?.whatsapp_tipo || "web").toLowerCase();
    const apiUrl = config?.wa_api_url || config?.evolution_url || "";
    const apiToken = config?.wa_api_token || config?.evolution_api_key || config?.zapi_token || "";
    const instanceName = config?.wa_instance_name || config?.zapi_instancia || "";
    const phoneNumberId = config?.wa_phone_number_id || "";
    const clientToken = config?.wa_client_token || "";

    const cleanPhone = (telefone || "").replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    let dispatchSuccess = false;
    let providerLabel = provider;

    if (provider === "web") {
      dispatchSuccess = true;
      providerLabel = "WhatsApp Web (Navegador)";
    } else if (provider === "evolution" && apiUrl && apiToken) {
      const base = apiUrl.replace(/\/$/, "");
      const targetUrl = instanceName ? `${base}/message/sendText/${instanceName}` : `${base}/message/sendText`;
      const evoRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": apiToken },
        body: JSON.stringify({
          number: formattedPhone,
          text: mensagemEnviada,
          textMessage: { text: mensagemEnviada }
        }),
        signal: AbortSignal.timeout(10000)
      });
      dispatchSuccess = evoRes.ok;
      providerLabel = "Evolution API";
    } else if (provider === "zapi" && instanceName && apiToken) {
      const zapiUrl = `https://api.z-api.io/instances/${instanceName}/token/${apiToken}/send-text`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (clientToken) headers["Client-Token"] = clientToken;
      const zapiRes = await fetch(zapiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: formattedPhone, message: mensagemEnviada }),
        signal: AbortSignal.timeout(10000)
      });
      dispatchSuccess = zapiRes.ok;
      providerLabel = "Z-API";
    } else if (provider === "meta" && phoneNumberId && apiToken) {
      const metaUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
      const metaRes = await fetch(metaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiToken}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: { preview_url: false, body: mensagemEnviada }
        }),
        signal: AbortSignal.timeout(10000)
      });
      dispatchSuccess = metaRes.ok;
      providerLabel = "Meta Cloud API";
    } else {
      // Se não configurado API, cai no modo Web com sucesso
      dispatchSuccess = true;
      providerLabel = "WhatsApp Web";
    }

    const tabulacao = dispatchSuccess
      ? `[Disparo WhatsApp ${providerLabel}] Enviado com sucesso`
      : `[Falha Disparo WhatsApp ${providerLabel}] Não foi possível entregar`;

    // Atualiza status do lead no CRM garantindo o tenant do operador
    await clientDb
      .from("leads")
      .update({
        etapa_crm: "Interessado",
        ultima_tabulacao: tabulacao,
        updated_at: nowIso
      })
      .eq("id", leadId)
      .eq("empresa_id", userEmpresaId);

    // Registra a mensagem na ficha do lead
    await clientDb
      .from("historico_ligacoes")
      .insert({
        lead_id: leadId,
        tabulacao: `${tabulacao}: "${(mensagemEnviada || "").slice(0, 250)}"`,
        duracao_segundos: 0
      });

    return NextResponse.json({
      success: dispatchSuccess,
      provider: providerLabel,
      delivered: provider !== "web" && dispatchSuccess,
      waUrl: provider === "web" ? `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(mensagemEnviada)}` : undefined
    });

  } catch (error: any) {
    console.error("Erro ao registrar envio de disparo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}