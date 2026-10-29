import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Captura pública de leads originados na Landing Page
 * Armazena no CRM da empresa principal (A&K) via RPC SECURITY DEFINER para follow-up comercial.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, telefone, tamanhoEquipe, mensagem } = body;

    if (typeof nome !== "string" || typeof telefone !== "string" || !nome.trim() || !telefone.trim()) {
      return NextResponse.json({ error: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
    }

    const cleanPhone = telefone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return NextResponse.json({ error: "Número de telefone inválido." }, { status: 400 });
    }
    if (nome.trim().length > 150) {
      return NextResponse.json({ error: "O nome deve ter no máximo 150 caracteres." }, { status: 400 });
    }

    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    // A captura pública precisa de credenciais administrativas explícitas; não degradar
    // silenciosamente para o cliente anon com permissões/RLS diferentes.
    if (!supabaseAdmin) {
      console.error("[Landing leads] SUPABASE_SERVICE_ROLE_KEY ausente.");
      return NextResponse.json({ error: "Captura temporariamente indisponível. Tente novamente mais tarde." }, { status: 503 });
    }
    const clientDb = supabaseAdmin;

    const { data: internalEmp, error: empresaError } = await clientDb
      .from("empresas")
      .select("id")
      .eq("interna", true)
      .limit(1)
      .maybeSingle();

    if (empresaError || !internalEmp?.id) {
      console.error("[Landing leads] Empresa comercial interna não encontrada:", empresaError);
      return NextResponse.json({ error: "Não foi possível registrar a solicitação neste momento." }, { status: 503 });
    }
    const targetEmpresaId = internalEmp.id;

    // Utiliza a RPC SECURITY DEFINER do Supabase para persistência garantida e agendamento automático
    const { data: rpcResult, error: rpcError } = await clientDb.rpc("sync_mined_lead", {
      p_client_phone: formattedPhone,
      p_client_name: String(nome).trim().slice(0, 150),
      p_produto: "SaaS Discadora Call Center",
      p_banco: "Lead Landing Page",
      p_margem: tamanhoEquipe ? `Equipe: ${tamanhoEquipe}` : "Lead Comercial",
      p_etapa: "Interessado",
      p_tabulacao: `[Landing Page] Demonstração Solicitada (Equipe: ${tamanhoEquipe || "Não informada"})`,
      p_resumo: `Lead capturado no formulário da Landing Page. Equipe: ${tamanhoEquipe || "Não informada"}. ${mensagem || ""}`.trim(),
      p_sugestao: "Entrar em contato via WhatsApp para demonstração e ativação de plano.",
      p_temperatura: "Quente",
      p_empresa_id: targetEmpresaId
    });

    if (rpcError || !rpcResult?.lead_id) {
      console.error("[Landing leads] Falha ao persistir lead via RPC:", rpcError || "RPC não retornou lead_id");
      return NextResponse.json(
        { error: "Não foi possível registrar sua solicitação. Tente novamente em instantes." },
        { status: 502 }
      );
    }

    const leadId = rpcResult.lead_id;

    return NextResponse.json({
      success: true,
      leadId,
      message: "Lead registrado no CRM comercial com sucesso!"
    });

  } catch (err: any) {
    console.error("Erro no endpoint /api/leads/landing:", err);
    return NextResponse.json({ error: "Erro interno ao processar lead." }, { status: 500 });
  }
}
