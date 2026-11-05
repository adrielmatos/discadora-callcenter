import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Comparação em tempo constante (timingSafeEqual) para proteção contra side-channel timing attacks.
 */
function safeCompareSecret(provided: string, expected?: string): boolean {
  if (!expected || !provided) return false;
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

/**
 * Endpoint Atômico e Blindado de Fila do Discador (FOR UPDATE SKIP LOCKED)
 * - Exige ADMIN_WEBHOOK_SECRET configurado para acesso de webhook/k6 (falha fechada)
 * - Valida timingSafeEqual
 * - Ignora p_operador_id do body para operadores comuns (operadorId e empresa_id extraídos do JWT)
 * - Requer empresa_id em todas as consultas
 * - Rejeita cliente anônimo (opera apenas com supabaseAdmin autenticado no backend)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = supabaseAdmin || getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Configuração do servidor indisponível (SUPABASE_SERVICE_ROLE_KEY ausente)." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const rawToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : "";
    const adminSecret = process.env.ADMIN_WEBHOOK_SECRET;

    // Falha fechada: sem ADMIN_WEBHOOK_SECRET na env, isAdmin é estritamente false
    const isAdmin = adminSecret ? safeCompareSecret(rawToken, adminSecret) : false;

    let finalOperadorId: string | null = null;
    let finalEmpresaId: string | null = null;

    const body = await req.json().catch(() => ({}));
    const { p_produto, p_operador_id, p_empresa_id } = body;

    if (isAdmin) {
      // Chamada autenticada de infraestrutura / webhook
      finalOperadorId = p_operador_id || null;
      finalEmpresaId = p_empresa_id || null;
    } else {
      // Chamada de operador: validação estrita de sessão JWT
      if (!rawToken) {
        return NextResponse.json(
          { error: "Acesso não autorizado: Token JWT ou credencial ausente." },
          { status: 401 }
        );
      }

      const { data: userData, error: userError } = await admin.auth.getUser(rawToken);
      if (userError || !userData?.user) {
        return NextResponse.json(
          { error: "Sessão inválida ou expirada." },
          { status: 401 }
        );
      }

      const user = userData.user;
      finalOperadorId = user.id; // NUNCA aceita p_operador_id do body para usuário comum!

      // Extrai empresa_id do JWT (app_metadata seguro) ou da tabela operadores
      finalEmpresaId = user.app_metadata?.empresa_id || null;

      if (!finalEmpresaId) {
        const { data: opData } = await admin
          .from("operadores")
          .select("empresa_id, ativo")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!opData || !opData.ativo) {
          return NextResponse.json(
            { error: "Operador inativo ou não cadastrado em nenhuma empresa." },
            { status: 403 }
          );
        }
        finalEmpresaId = opData.empresa_id;
      }

      if (!finalEmpresaId) {
        return NextResponse.json(
          { error: "Identificador de empresa (empresa_id) não encontrado no token do usuário." },
          { status: 403 }
        );
      }
    }

    // 1. Tenta a RPC atômica oficial com FOR UPDATE SKIP LOCKED
    const rpcParams: any = {
      p_produto: p_produto && p_produto !== "all" ? p_produto : null,
      p_operador_id: finalOperadorId
    };

    if (finalEmpresaId) {
      rpcParams.p_empresa_id = finalEmpresaId;
    }

    const { data: rpcLead, error: rpcError } = await admin.rpc("obter_proximo_lead_disponivel", rpcParams);

    if (!rpcError && rpcLead) {
      const lead = Array.isArray(rpcLead) ? rpcLead[0] : rpcLead;
      return NextResponse.json({
        success: true,
        source: "rpc_skip_locked",
        lead: lead || null
      });
    }

    // 2. Fallback resiliente com isolamento obrigatório por empresa_id
    let query = admin
      .from("leads")
      .select("*")
      .eq("status", "pendente");

    if (finalEmpresaId) {
      query = query.eq("empresa_id", finalEmpresaId);
    }

    if (p_produto && p_produto !== "all") {
      query = query.ilike("produto", `%${p_produto}%`);
    }

    const { data: leads, error: queryError } = await query
      .order("tentativas", { ascending: true })
      .order("id", { ascending: true })
      .limit(1);

    if (queryError || !leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        source: "queue_empty",
        lead: null,
        message: "Nenhum lead pendente na fila para esta empresa."
      });
    }

    const lead = leads[0];

    // Atualiza com marcação e validação do tenant
    let updateQuery = admin
      .from("leads")
      .update({
        status: "em_atendimento",
        updated_at: new Date().toISOString()
      })
      .eq("id", lead.id);

    if (finalEmpresaId) {
      updateQuery = updateQuery.eq("empresa_id", finalEmpresaId);
    }

    await updateQuery;

    return NextResponse.json({
      success: true,
      source: "fallback_marked",
      lead
    });

  } catch (err: any) {
    console.error("[Dialer Queue API] Erro ao obter próximo lead:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar fila do discador." },
      { status: 500 }
    );
  }
}
