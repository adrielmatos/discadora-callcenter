import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";

/**
 * Captura pública de leads originados na Landing Page
 * Armazena no CRM da empresa principal (A&K) para contato e follow-up comercial.
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

    const { data: lead, error } = await clientDb
      .from("leads")
      .insert({
        nome: String(nome).trim().slice(0, 150),
        telefone: formattedPhone,
        empresa_id: targetEmpresaId,
        status: "pendente",
        etapa_crm: "Interessado",
        produto: "SaaS Discadora Call Center",
        banco: "Lead Comercial",
        ultima_tabulacao: `[Landing Page] Demonstração Solicitada (Equipe: ${tamanhoEquipe || "Não informada"})`,
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (error) {
      console.warn("Aviso ao salvar lead da landing page:", error);
    }

    return NextResponse.json({
      success: true,
      leadId: lead?.id || null,
      message: "Lead registrado no CRM comercial com sucesso!"
    });

  } catch (err: any) {
    console.error("Erro no endpoint /api/leads/landing:", err);
    return NextResponse.json({ error: "Erro interno ao processar lead." }, { status: 500 });
  }
}
