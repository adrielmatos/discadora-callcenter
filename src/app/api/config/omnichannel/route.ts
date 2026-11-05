import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function verifyGestorOrDono(req: NextRequest) {
  const admin = supabaseAdmin || getSupabaseAdmin();
  if (!admin) return { error: "Servidor não configurado", status: 500 };

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token) return { error: "Não autorizado", status: 401 };

  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return { error: "Sessão inválida", status: 401 };

  // Resolve perfil e empresa via app_metadata seguro
  const role = user.app_metadata?.role || "";
  let empresaId = user.app_metadata?.empresa_id || null;

  const { data: op } = await admin
    .from("operadores")
    .select("perfil, empresa_id, ativo")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const perfil = (op?.perfil || role || "").toLowerCase();
  empresaId = op?.empresa_id || empresaId;

  const isAllowed =
    perfil === "admin" ||
    perfil === "gestor" ||
    perfil === "proprietario" ||
    perfil === "dono";

  if (!isAllowed) {
    return { error: "Acesso proibido: Restrito a DONO e GESTOR.", status: 403 };
  }

  return { admin, user, empresaId, perfil };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyGestorOrDono(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { admin, empresaId } = auth;

    let query = admin
      .from("app_configuracoes")
      .select("*");

    if (empresaId) {
      query = query.eq("empresa_id", empresaId);
    } else {
      query = query.order("id", { ascending: true }).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        wa_mode: "simulated",
        whatsapp_tipo: "simulado",
        ai_enabled: true,
        ai_name: "Sofia",
        ai_tone: "consultivo",
        ai_greeting: "Olá! Sou a Sofia, especialista em crédito consignado.",
        ai_knowledge: "",
        ai_handoff_triggers: "humano, atendente, falar com atendente, falar com pessoa",
        has_gemini_key: false,
        has_groq_key: false,
        has_evolution_key: false,
        has_zapi_token: false
      });
    }

    // Retorna mascarando segredos para nunca expor chaves ao frontend
    return NextResponse.json({
      id: data.id,
      empresa_id: data.empresa_id,
      empresa_nome: data.empresa_nome || "",
      wa_mode: data.wa_mode || "simulated",
      wa_api_url: data.wa_api_url || "",
      wa_instance_name: data.wa_instance_name || "",
      wa_default_message: data.wa_default_message || "",
      whatsapp_tipo: data.whatsapp_tipo || "simulado",
      evolution_url: data.evolution_url || "",
      zapi_instancia: data.zapi_instancia || "",
      ai_enabled: data.ai_enabled ?? true,
      ai_name: data.ai_name || "Sofia",
      ai_tone: data.ai_tone || "consultivo",
      ai_greeting: data.ai_greeting || "",
      ai_knowledge: data.ai_knowledge || "",
      ai_handoff_triggers: data.ai_handoff_triggers || "",
      has_gemini_key: !!data.gemini_api_key,
      has_groq_key: !!data.groq_api_key,
      has_evolution_key: !!data.evolution_api_key,
      has_zapi_token: !!data.zapi_token,
      has_wa_token: !!data.wa_api_token
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyGestorOrDono(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { admin, empresaId } = auth;
    const body = await req.json();

    const payload: any = {
      empresa_nome: body.empresa_nome?.trim() || null,
      wa_mode: body.wa_mode || "simulated",
      wa_api_url: body.wa_api_url?.trim() || null,
      wa_instance_name: body.wa_instance_name?.trim() || null,
      wa_default_message: body.wa_default_message?.trim() || null,
      whatsapp_tipo: body.whatsapp_tipo || "simulado",
      evolution_url: body.evolution_url?.trim() || null,
      zapi_instancia: body.zapi_instancia?.trim() || null,
      ai_enabled: body.ai_enabled ?? true,
      ai_name: body.ai_name?.trim() || "Sofia",
      ai_tone: body.ai_tone || "consultivo",
      ai_greeting: body.ai_greeting?.trim() || null,
      ai_knowledge: body.ai_knowledge?.trim() || null,
      ai_handoff_triggers: body.ai_handoff_triggers?.trim() || null,
      updated_at: new Date().toISOString()
    };

    if (empresaId) {
      payload.empresa_id = empresaId;
    }

    // Só atualiza chaves secretas se um novo valor real (não mascarado) for fornecido
    if (body.gemini_api_key && body.gemini_api_key !== "••••••••") {
      payload.gemini_api_key = body.gemini_api_key.trim();
    }
    if (body.groq_api_key && body.groq_api_key !== "••••••••") {
      payload.groq_api_key = body.groq_api_key.trim();
    }
    if (body.evolution_api_key && body.evolution_api_key !== "••••••••") {
      payload.evolution_api_key = body.evolution_api_key.trim();
    }
    if (body.zapi_token && body.zapi_token !== "••••••••") {
      payload.zapi_token = body.zapi_token.trim();
    }
    if (body.wa_api_token && body.wa_api_token !== "••••••••") {
      payload.wa_api_token = body.wa_api_token.trim();
    }

    let existingQuery = admin.from("app_configuracoes").select("id");
    if (empresaId) {
      existingQuery = existingQuery.eq("empresa_id", empresaId);
    } else {
      existingQuery = existingQuery.order("id", { ascending: true }).limit(1);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing?.id) {
      const { error } = await admin
        .from("app_configuracoes")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      const { error } = await admin
        .from("app_configuracoes")
        .insert(payload);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: "Configurações de Omnichannel salvas com segurança no servidor." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
