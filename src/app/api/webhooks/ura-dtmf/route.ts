import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

/**
 * Webhook Universal de URA Reversa (DTMF -> WhatsApp + CRM)
 * Compatível com Asterisk, FreePBX, Issabel, TotalVoice/Zenvia, Vono, Kolmeya, FalaFrete e provedores VoIP.
 * 
 * Aceita requisições POST (JSON ou Form-Data) e GET (Query Params).
 * Exemplo de chamada:
 * POST /api/webhooks/ura-dtmf
 * { "telefone": "11987654321", "nome": "Carlos Silva", "digit": "1", "campanha": "FGTS Ativo" }
 */
export async function POST(req: NextRequest) {
  try {
    let payload: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        formData.forEach((value, key) => {
          payload[key] = value.toString();
        });
      }
    }

    return await processUraEvent(payload, req);
  } catch (error: any) {
    console.error("[URA-DTMF Error POST]:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno ao processar URA" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const payload: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      payload[key] = value;
    });

    return await processUraEvent(payload, req);
  } catch (error: any) {
    console.error("[URA-DTMF Error GET]:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno ao processar URA" }, { status: 500 });
  }
}

async function processUraEvent(payload: any, req: NextRequest) {
  // Mapeamento flexível de parâmetros de qualquer operadora VoIP/PABX
  const rawTelefone = payload.telefone || payload.phone || payload.numero || payload.callerid || payload.from || payload.to || payload.ani || payload.contact;
  const rawNome = payload.nome || payload.name || payload.caller_name || payload.lead_nome || "Lead URA Reversa";
  const digit = String(payload.digit || payload.dtmf || payload.tecla || payload.key || payload.option || "1").trim();
  const campanha = payload.campanha || payload.campaign || "URA Reversa Ativa";
  const empresaId = payload.empresa_id || payload.empresaId || null;

  if (!rawTelefone) {
    return NextResponse.json(
      { success: false, error: "Parâmetro 'telefone' é obrigatório para processar o evento da URA" },
      { status: 400 }
    );
  }

  // Sanitização do número
  const digitsOnly = String(rawTelefone).replace(/\D/g, "");
  let formattedPhone = digitsOnly;
  if (!formattedPhone.startsWith("55") && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
    formattedPhone = `55${formattedPhone}`;
  }

  const clientDb = supabaseAdmin || supabase;
  const nowIso = new Date().toISOString();

  // 1. Identificar ou buscar empresa_id se não fornecido
  let targetEmpresaId = empresaId;
  if (!targetEmpresaId) {
    const { data: firstEmpresa } = await clientDb
      .from("empresas")
      .select("id")
      .eq("status", "ativa")
      .limit(1)
      .maybeSingle();
    targetEmpresaId = firstEmpresa?.id || null;
  }

  // 2. Verificar se o Lead já existe na base
  const { data: existingLead } = await clientDb
    .from("leads")
    .select("id, nome, status, etapa_crm, observacoes, empresa_id")
    .eq("telefone", formattedPhone)
    .maybeSingle();

  let leadId: number | string | null = null;
  let isNew = false;

  const obsInteresse = `[🔥 URA Reversa • DTMF ${digit}] Cliente confirmou interesse pelo telefone na campanha '${campanha}' em ${new Date().toLocaleString("pt-BR")}.`;

  if (existingLead) {
    leadId = existingLead.id;
    const updatedObs = existingLead.observacoes 
      ? `${existingLead.observacoes}\n${obsInteresse}` 
      : obsInteresse;

    await clientDb
      .from("leads")
      .update({
        status: "pendente",
        etapa_crm: "novo",
        observacoes: updatedObs,
        updated_at: nowIso
      })
      .eq("id", existingLead.id);
  } else {
    isNew = true;
    const { data: insertedLead, error: insertError } = await clientDb
      .from("leads")
      .insert({
        nome: rawNome.trim(),
        telefone: formattedPhone,
        status: "pendente",
        etapa_crm: "novo",
        produto: "FGTS / Consignado",
        origem: "ura_reversa",
        observacoes: obsInteresse,
        empresa_id: targetEmpresaId,
        created_at: nowIso
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[URA-DTMF Insert Lead Error]:", insertError);
    } else {
      leadId = insertedLead?.id || null;
    }
  }

  // 3. Disparo Automático no WhatsApp com a Sofia AI se o dígito for '1' (interesse positivo)
  let whatsappSent = false;
  let whatsappResult: any = null;

  if (digit === "1" || digit.toLowerCase() === "sim") {
    try {
      const originUrl = req.nextUrl.origin || "http://localhost:3000";
      const primeiroNome = rawNome.split(" ")[0] || "Cliente";
      const msgSofia = `Olá, ${primeiroNome}! Sou a Sofia, especialista virtual da A&K Soluções Financeiras 🚀\n\nVi que você acabou de confirmar interesse pelo telefone na antecipação do seu FGTS/Crédito Consignado!\n\nJá liberei a simulação sem mexer no seu salário e sem boletos mensais (depósito via PIX hoje).\n\nVocê gostaria de ver quanto liberou para você agora?`;

      const sendResponse = await fetch(`${originUrl}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: formattedPhone,
          mensagem: msgSofia,
          lead_id: leadId
        })
      });

      whatsappResult = await sendResponse.json().catch(() => ({}));
      whatsappSent = sendResponse.ok;
    } catch (waErr: any) {
      console.warn("[URA-DTMF WhatsApp trigger warning]:", waErr.message);
    }
  }

  // 4. Registrar em Auditoria
  logAuditEvent({
    action: "URA_DTMF_INTERACTION",
    resource: "leads",
    resourceId: String(leadId || formattedPhone),
    empresaId: targetEmpresaId || undefined,
    metadata: {
      telefone: formattedPhone,
      digit,
      campanha,
      isNewLead: isNew,
      whatsappSent
    }
  });

  return NextResponse.json({
    success: true,
    action: isNew ? "lead_created" : "lead_updated",
    lead_id: leadId,
    telefone: formattedPhone,
    dtmf: digit,
    whatsapp_triggered: whatsappSent,
    whatsapp_details: whatsappResult,
    message: "Interação de URA Reversa recebida com sucesso. Lead qualificado e WhatsApp acionado!"
  });
}
