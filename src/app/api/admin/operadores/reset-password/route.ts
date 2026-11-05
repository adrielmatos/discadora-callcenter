import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * POST /api/admin/operadores/reset-password
 * Redefinição administrativa server-side da senha de um operador.
 * Valida autorização de admin/dono e garante isolamento estrito de tenant.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Configuração do servidor incompleta (service_role ausente)." }, { status: 500 });
    }

    // 1. Validação do Token do Solicitante
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Não autorizado: Token Bearer ausente no cabeçalho." }, { status: 401 });
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Token inválido ou sessão expirada." }, { status: 401 });
    }

    const callerUser = userData.user;
    const appMeta = callerUser.app_metadata || {};

    let role = (appMeta.role || appMeta.perfil || "").toLowerCase();
    let callerEmpresaId = appMeta.empresa_id || null;

    if (!role || !callerEmpresaId) {
      const { data: opData } = await admin
        .from("operadores_app")
        .select("perfil, empresa_id")
        .eq("email", callerUser.email?.toLowerCase().trim())
        .maybeSingle();

      if (opData) {
        if (!role) role = (opData.perfil || "").toLowerCase();
        if (!callerEmpresaId) callerEmpresaId = opData.empresa_id;
      }
    }

    const { data: superAdminRow } = await admin
      .from("superadmins")
      .select("id")
      .eq("auth_user_id", callerUser.id)
      .maybeSingle();

    const isSuperAdmin = !!superAdminRow || role === "dono" || role === "proprietario";
    const isAdmin = isSuperAdmin || role === "admin" || role === "gestor";

    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado: apenas administradores podem redefinir senhas." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { email, new_password } = body;

    if (!email?.trim()) {
      return NextResponse.json({ error: "O e-mail do operador é obrigatório." }, { status: 400 });
    }
    if (!new_password?.trim() || new_password.trim().length < 6) {
      return NextResponse.json({ error: "A nova senha deve ter no mínimo 6 caracteres." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = new_password.trim();

    // 2. Localiza o operador e valida se pertence ao mesmo tenant
    const { data: operadorData, error: opError } = await admin
      .from("operadores_app")
      .select("id, nome, email, empresa_id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (opError) {
      return NextResponse.json({ error: `Erro ao buscar operador: ${opError.message}` }, { status: 500 });
    }

    if (!operadorData) {
      return NextResponse.json({ error: "Operador não encontrado com este e-mail." }, { status: 404 });
    }

    if (!isSuperAdmin && callerEmpresaId && operadorData.empresa_id !== callerEmpresaId) {
      return NextResponse.json(
        { error: "Acesso negado: você não tem permissão para alterar a senha de operadores de outra empresa." },
        { status: 403 }
      );
    }

    // 3. Localiza o usuário em auth.users
    // Usa RPC ou busca direta segura via admin.auth.admin.listUsers filtrando por email
    const { data: listData, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: `Falha ao consultar Auth: ${listError.message}` }, { status: 500 });
    }

    const targetAuthUser = listData.users.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!targetAuthUser) {
      return NextResponse.json({ error: "Conta de autenticação não encontrada para este operador." }, { status: 404 });
    }

    // 4. Atualiza a senha no Supabase Auth e força troca no primeiro login
    const { error: updateError } = await admin.auth.admin.updateUserById(targetAuthUser.id, {
      password: cleanPassword,
      user_metadata: {
        ...(targetAuthUser.user_metadata || {}),
        needs_password_change: true
      }
    });

    if (updateError) {
      return NextResponse.json({ error: `Falha ao redefinir senha: ${updateError.message}` }, { status: 400 });
    }

    logAuditEvent({
      action: "OPERADOR_SENHA_REDEFINIDA",
      resource: "auth.users",
      resourceId: targetAuthUser.id,
      actorUserId: callerUser.id,
      empresaId: operadorData.empresa_id,
      metadata: { operador_email: cleanEmail }
    });

    return NextResponse.json({
      success: true,
      message: `Senha de ${operadorData.nome} redefinida com sucesso.`
    });

  } catch (err: any) {
    console.error("[POST /api/admin/operadores/reset-password] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor." }, { status: 500 });
  }
}
