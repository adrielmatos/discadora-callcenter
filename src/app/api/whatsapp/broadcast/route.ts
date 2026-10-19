import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: Retorna a fila de leads prontos para receber disparo de WhatsApp
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const etapa = searchParams.get("etapa") || "fila";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const empresaId = searchParams.get("empresa_id");

    let query = supabase
      .from("leads")
      .select("id, nome, telefone, banco, margem_disponivel, produto, etapa_crm, ultima_tabulacao")
      .neq("status", "bloqueado_dnd")
      .order("id", { ascending: true })
      .limit(limit);

    if (etapa === "fila") {
      query = query.or("etapa_crm.eq.fila,etapa_crm.is.null,etapa_crm.eq.pendente");
    } else if (etapa !== "all") {
      query = query.eq("etapa_crm", etapa);
    }

    if (empresaId && empresaId !== "all") {
      query = query.eq("empresa_id", empresaId);
    }

    const { data: leads, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filtra e formata os telefones válidos
    const validLeads = (leads || []).map((l: any) => {
      const cleanPhone = (l.telefone || "").replace(/\D/g, "");
      const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      return {
        ...l,
        telefoneLimpo: formatted,
        primeiroNome: (l.nome || "Cliente").trim().split(" ")[0]
      };
    }).filter((l: any) => l.telefoneLimpo.length >= 12);

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

// POST: Registra o disparo enviado com sucesso e atualiza o CRM
export async function POST(req: NextRequest) {
  try {
    const { leadId, telefone, mensagemEnviada } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // Atualiza status do lead no CRM
    const { error: leadErr } = await supabase
      .from("leads")
      .update({
        etapa_crm: "Interessado",
        ultima_tabulacao: "[Disparo WhatsApp Sofia] Enviado",
        updated_at: nowIso
      })
      .eq("id", leadId);

    // Registra a mensagem na ficha do lead
    await supabase.from("historico_ligacoes").insert({
      lead_id: leadId,
      tabulacao: `[Disparo WhatsApp Sofia]: "${(mensagemEnviada || "Mensagem de reativação").slice(0, 300)}"`,
      duracao_segundos: 0
    });

    return NextResponse.json({
      success: true,
      message: `Lead #${leadId} marcado como disparado com sucesso!`
    });

  } catch (error: any) {
    console.error("Erro ao registrar envio do disparo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
