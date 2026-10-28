import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";

/**
 * Captura pública de leads originados na Landing Page
 * Armazena no CRM da empresa principal (A&K) via RPC SECURITY DEFINER para follow-up comercial.
 */
export async function POST(req: NextRequest) {
  try {
    const { nome, telefone, tamanhoEquipe, mensagem } = await req.json();

    if (!nome || !telefone) {
      return NextResponse.json({ error: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
    }

    const cleanPhone = String(telefone).replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: "Número de telefone inválido." }, { status: 400 });
    }

    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const clientDb = supabaseAdmin || supabase;

    // Obtém o ID da empresa interna principal (A&K Soluções)
    const { data: internalEmp } = await clientDb
      .from("empresas")
      .select("id")
      .eq("interna", true)
      .limit(1)
      .maybeSingle();

    const targetEmpresaId = internalEmp?.id || "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3";

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

    if (rpcError) {
      console.warn("Aviso ao salvar lead da landing page via RPC:", rpcError);
    }

    const leadId = rpcResult?.lead_id || null;

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
