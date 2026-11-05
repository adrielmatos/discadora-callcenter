import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Rota Administrativa Server-Side: /api/admin/empresas
 * Criação atômica de empresa + usuário gestor com Supabase Auth Admin.
 * Exige autenticação de SuperAdmin via Bearer JWT.
 */
export async function POST(req: NextRequest) {
  let createdEmpresaId: string | null = null;
  let createdAuthUserId: string | null = null;
  let createdOperadorId: string | null = null;

  try {
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Configuração do servidor incompleta (SUPABASE_SERVICE_ROLE_KEY ausente)." },
        { status: 500 }
      );
    }

    // 1. Validação de Autenticação e Autorização (SuperAdmin)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Não autorizado: Token Bearer ausente no cabeçalho." },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Token inválido ou expirado." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // Verifica se o usuário é SuperAdmin na tabela superadmins ou tem role DONO
    const { data: superAdminRow } = await admin
      .from("superadmins")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    const isDono =
      userData.user.app_metadata?.role === "DONO" ||
      userData.user.user_metadata?.role === "DONO" ||
      userData.user.app_metadata?.perfil === "proprietario";

    if (!superAdminRow && !isDono) {
      return NextResponse.json(
        { error: "Acesso proibido: Operação restrita a SuperAdmin." },
        { status: 403 }
      );
    }

    // 2. Extração e validação do payload
    const body = await req.json();
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      email_gestor,
      senha_gestor,
      status = "ativa",
      plano_id,
      limite_operadores = 5,
      limite_ramais = 5,
      modulos_liberados,
      dias_teste = 7
    } = body;

    if (!razao_social || !razao_social.trim()) {
      return NextResponse.json(
        { error: "O campo 'razao_social' é obrigatório." },
        { status: 400 }
      );
    }

    if (!email_gestor || !email_gestor.trim()) {
      return NextResponse.json(
        { error: "O campo 'email_gestor' é obrigatório." },
        { status: 400 }
      );
    }

    if (!senha_gestor || senha_gestor.trim().length < 6) {
      return NextResponse.json(
        { error: "A senha do gestor deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email_gestor.trim().toLowerCase();
    const cleanNome = (nome_fantasia || razao_social).trim();
    const cleanSenha = senha_gestor.trim();

    // 3. Etapa A: Inserção da Empresa
    const trialExpira = new Date();
    trialExpira.setDate(trialExpira.getDate() + (parseInt(dias_teste) || 7));

    const empresaPayload: any = {
      razao_social: razao_social.trim(),
      nome_fantasia: cleanNome,
      cnpj: cnpj?.trim() || null,
      email_gestor: cleanEmail,
      status: status || "ativa",
      plano_id: plano_id || null,
      limite_operadores: parseInt(limite_operadores) || 5,
      limite_ramais: parseInt(limite_ramais) || 5,
      interna: false,
      modulos_liberados: Array.isArray(modulos_liberados)
        ? modulos_liberados
        : ["dialer", "crm", "tasks", "retornos", "campanhas", "scripts", "dnd", "resultados"],
      dias_teste: status === "trial" ? parseInt(dias_teste) || 7 : 7,
      trial_expira_em: status === "trial" ? trialExpira.toISOString() : null
    };

    const { data: empresaData, error: empresaError } = await admin
      .from("empresas")
      .insert(empresaPayload)
      .select()
      .single();

    if (empresaError || !empresaData) {
      throw new Error(`Falha ao criar registro da empresa: ${empresaError?.message}`);
    }

    createdEmpresaId = empresaData.id;

    // 4. Etapa B: Criação do Usuário no Supabase Auth usando auth.admin.createUser
    // email_confirm: true garante que o cliente pode logar imediatamente sem travar em confirmação
    const { data: authCreated, error: authError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: cleanSenha,
      email_confirm: true,
      app_metadata: {
        provider: "email",
        providers: ["email"],
        empresa_id: createdEmpresaId,
        perfil: "admin",
        role: "admin"
      },
      user_metadata: {
        nome: cleanNome,
        email: cleanEmail,
        empresa_id: createdEmpresaId,
        perfil: "admin",
        role: "admin"
      }
    });

    if (authError || !authCreated?.user) {
      throw new Error(`Falha ao criar usuário no Supabase Auth: ${authError?.message}`);
    }

    createdAuthUserId = authCreated.user.id;

    // 5. Etapa C: Inserção em public.operadores (satisfaz operadores_perfil_check: 'admin' | 'gestor' | 'operador')
    const { data: operadorData, error: operadorError } = await admin
      .from("operadores")
      .insert({
        nome: cleanNome,
        email: cleanEmail,
        perfil: "admin",
        ativo: true,
        auth_user_id: createdAuthUserId,
        empresa_id: createdEmpresaId,
        permissoes: {
          can_crm: true,
          can_export: true,
          can_reports: true,
          can_scripts: true,
          can_campanhas: true,
          can_dnd: true
        }
      })
      .select()
      .single();

    if (operadorError || !operadorData) {
      throw new Error(`Falha ao vincular operador na tabela 'operadores': ${operadorError?.message}`);
    }

    createdOperadorId = operadorData.id;

    // 6. Etapa D: Inserção em public.operadores_app
    const { error: operadorAppError } = await admin
      .from("operadores_app")
      .insert({
        nome: cleanNome,
        email: cleanEmail,
        perfil: "proprietario",
        ativo: true,
        can_crm: true,
        can_export: true,
        can_reports: true,
        can_scripts: true,
        can_campanhas: true,
        can_dnd: true,
        empresa_id: createdEmpresaId
      });

    if (operadorAppError) {
      throw new Error(`Falha ao registrar operador na tabela 'operadores_app': ${operadorAppError?.message}`);
    }

    // 7. Retorno de Sucesso com Dados Completos
    return NextResponse.json({
      success: true,
      empresa: empresaData,
      usuario: {
        id: createdAuthUserId,
        email: cleanEmail,
        nome: cleanNome,
        perfil: "admin"
      }
    });
  } catch (err: any) {
    console.error("[POST /api/admin/empresas] Erro durante cadastro atômico:", err);

    // ROLLBACK ATÔMICO COMPLETO
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (admin) {
      if (createdOperadorId) {
        try { await admin.from("operadores").delete().eq("id", createdOperadorId); } catch {}
      }
      if (createdAuthUserId) {
        try { await admin.auth.admin.deleteUser(createdAuthUserId); } catch {}
      }
      if (createdEmpresaId) {
        try { await admin.from("operadores_app").delete().eq("empresa_id", createdEmpresaId); } catch {}
        try { await admin.from("empresas").delete().eq("id", createdEmpresaId); } catch {}
      }
    }

    return NextResponse.json(
      {
        error: err.message || "Erro interno ao processar cadastro atômico da empresa.",
        rolled_back: true
      },
      { status: 500 }
    );
  }
}
