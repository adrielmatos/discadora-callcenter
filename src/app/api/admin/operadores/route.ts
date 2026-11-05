import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Helper para validar se o usuário autenticado possui perfil administrativo
 */
async function getAuthorizedUser(admin: any, req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return { error: "Não autorizado: Token Bearer ausente no cabeçalho.", status: 401 };
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: "Token inválido ou sessão expirada.", status: 401 };
  }

  const user = userData.user;
  const appMeta = user.app_metadata || {};

  // Resolve perfil e empresa prioritariamente via app_metadata seguro
  let role = (appMeta.role || appMeta.perfil || "").toLowerCase();
  let callerEmpresaId = appMeta.empresa_id || null;

  // Fallback seguro via consulta ao banco de dados pelo e-mail autenticado
  if (!role || !callerEmpresaId) {
    const { data: opData } = await admin
      .from("operadores_app")
      .select("perfil, empresa_id")
      .eq("email", user.email?.toLowerCase().trim())
      .maybeSingle();

    if (opData) {
      if (!role) role = (opData.perfil || "").toLowerCase();
      if (!callerEmpresaId) callerEmpresaId = opData.empresa_id;
    }
  }

  // Verifica se é superadmin global
  const { data: superAdminRow } = await admin
    .from("superadmins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const isSuperAdmin = !!superAdminRow || role === "dono" || role === "proprietario";
  const isAdmin = isSuperAdmin || role === "admin" || role === "gestor";

  if (!isAdmin) {
    return { error: "Acesso negado: apenas administradores podem gerenciar operadores.", status: 403 };
  }

  return { user, isSuperAdmin, callerEmpresaId };
}

/**
 * GET /api/admin/operadores
 * Lista os operadores da empresa do usuário autenticado
 */
export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Configuração do servidor incompleta." }, { status: 500 });
    }

    const authResult = await getAuthorizedUser(admin, req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { isSuperAdmin, callerEmpresaId } = authResult;
    const url = new URL(req.url);
    const queryEmpresaId = url.searchParams.get("empresa_id");

    const targetEmpresaId = isSuperAdmin && queryEmpresaId ? queryEmpresaId : callerEmpresaId;

    let query = admin.from("operadores_app").select("*").order("created_at", { ascending: false });
    if (targetEmpresaId) {
      query = query.eq("empresa_id", targetEmpresaId);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ operadores: data || [] });
  } catch (err: any) {
    console.error("[GET /api/admin/operadores] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 });
  }
}

/**
 * POST /api/admin/operadores
 * Criação segura server-side de operador com Auth Admin e vinculação à empresa
 */
export async function POST(req: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Configuração do servidor incompleta (service_role ausente)." }, { status: 500 });
    }

    const authResult = await getAuthorizedUser(admin, req);
    if ("error" in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user: callerUser, isSuperAdmin, callerEmpresaId } = authResult;
    const body = await req.json().catch(() => ({}));

    const {
      nome,
      email,
      password,
      perfil = "operador",
      empresa_id,
      can_crm = true,
      can_export = false,
      can_reports = false,
      can_scripts = true,
      can_campanhas = false,
      can_dnd = false
    } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "O nome do operador é obrigatório." }, { status: 400 });
    }
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail de acesso inválido." }, { status: 400 });
    }
    if (!password?.trim() || password.trim().length < 6) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres." }, { status: 400 });
    }

    // Tenant isolation: admin local não pode criar operador em outra empresa
    const targetEmpresaId = isSuperAdmin && empresa_id ? empresa_id : callerEmpresaId;

    if (!targetEmpresaId) {
      return NextResponse.json({ error: "Empresa de destino não identificada." }, { status: 400 });
    }

    // 1. Verificar limite de operadores da empresa
    const { data: empresaData } = await admin
      .from("empresas")
      .select("limite_operadores, status")
      .eq("id", targetEmpresaId)
      .maybeSingle();

    if (empresaData?.limite_operadores) {
      const { count } = await admin
        .from("operadores_app")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", targetEmpresaId)
        .eq("ativo", true);

      if (count !== null && count >= empresaData.limite_operadores) {
        return NextResponse.json(
          { error: `Limite de ${empresaData.limite_operadores} operadores ativos atingido para este plano.` },
          { status: 403 }
        );
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNome = nome.trim();
    const cleanPassword = password.trim();

    // 2. Criação do usuário no Supabase Auth com senha e flags de primeiro acesso
    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true,
      app_metadata: {
        provider: "email",
        providers: ["email"],
        empresa_id: targetEmpresaId,
        role: perfil,
        perfil: perfil,
        needs_password_change: true
      },
      user_metadata: {
        nome: cleanNome,
        email: cleanEmail,
        empresa_id: targetEmpresaId,
        role: perfil,
        perfil: perfil,
        needs_password_change: true
      }
    });

    if (authError || !authCreated?.user) {
      return NextResponse.json(
        { error: `Falha ao criar usuário de acesso: ${authError?.message}` },
        { status: 400 }
      );
    }

    createdAuthUserId = authCreated.user.id;

    // 3. Inserção na tabela operadores_app
    const { data: operadorData, error: operadorError } = await admin
      .from("operadores_app")
      .insert({
        nome: cleanNome,
        email: cleanEmail,
        perfil: perfil,
        ativo: true,
        empresa_id: targetEmpresaId,
        can_crm: !!can_crm,
        can_export: !!can_export,
        can_reports: !!can_reports,
        can_scripts: !!can_scripts,
        can_campanhas: !!can_campanhas,
        can_dnd: !!can_dnd
      })
      .select()
      .single();

    if (operadorError) {
      // Rollback do usuário de auth se o registro de operador falhar
      await admin.auth.admin.deleteUser(createdAuthUserId);
      return NextResponse.json(
        { error: `Falha ao registrar permissões do operador: ${operadorError.message}` },
        { status: 500 }
      );
    }

    // 4. Inserção sincronizada na tabela operadores (legado/suporte com FK auth_user_id)
    await admin
      .from("operadores")
      .insert({
        nome: cleanNome,
        email: cleanEmail,
        perfil: perfil === "admin" ? "admin" : perfil === "gestor" ? "gestor" : "operador",
        ativo: true,
        auth_user_id: createdAuthUserId,
        empresa_id: targetEmpresaId,
        permissoes: {
          can_crm: !!can_crm,
          can_export: !!can_export,
          can_reports: !!can_reports,
          can_scripts: !!can_scripts,
          can_campanhas: !!can_campanhas,
          can_dnd: !!can_dnd
        }
      })
      .select()
      .maybeSingle();

    logAuditEvent({
      action: "OPERADOR_CRIADO",
      resource: "operadores_app",
      resourceId: operadorData.id,
      actorUserId: callerUser.id,
      empresaId: targetEmpresaId,
      metadata: { email: cleanEmail, perfil }
    });

    return NextResponse.json({
      success: true,
      operador: operadorData,
      message: "Operador criado com sucesso."
    });

  } catch (err: any) {
    console.error("[POST /api/admin/operadores] Erro inesperado:", err);
    if (createdAuthUserId) {
      const admin = supabaseAdmin || getSupabaseAdmin();
      if (admin) await admin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 });
  }
}
