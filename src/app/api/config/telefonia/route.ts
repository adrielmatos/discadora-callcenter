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
      .select("id, empresa_id, sip_host, sip_port, sip_user, sip_password, sip_protocol");

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
        sip_host: "",
        sip_port: "5060",
        sip_user: "",
        sip_protocol: "wss",
        has_sip_password: false
      });
    }

    return NextResponse.json({
      id: data.id,
      sip_host: data.sip_host || "",
      sip_port: data.sip_port || "5060",
      sip_user: data.sip_user || "",
      sip_protocol: data.sip_protocol || "wss",
      has_sip_password: !!data.sip_password
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
      sip_host: body.sip_host?.trim() || null,
      sip_port: body.sip_port?.trim() || "5060",
      sip_user: body.sip_user?.trim() || null,
      sip_protocol: body.sip_protocol || "wss",
      updated_at: new Date().toISOString()
    };

    if (empresaId) {
      payload.empresa_id = empresaId;
    }

    // Só atualiza a senha se um novo valor for enviado (evita sobrescrever com máscara)
    if (body.sip_password && body.sip_password !== "••••••••") {
      payload.sip_password = body.sip_password.trim();
    }

    // Verifica se já existe registro para a empresa
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

    return NextResponse.json({ success: true, message: "Configurações de telefonia atualizadas com sucesso." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
