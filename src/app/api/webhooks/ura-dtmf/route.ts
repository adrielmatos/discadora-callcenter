import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

/**
 * Webhook Universal de URA Reversa (DTMF -> WhatsApp + CRM)
 * Segurança Hardened:
 * 1. Apenas POST autorizado por secret enviado em header.
 * 2. GET desabilitado para operações mutáveis (retorna 405).
 * 3. Validação obrigatória de empresa_id (sem fallbacks arbitrários de tenant).
 * 4. Validação centralizada de Não Perturbe (DND) antes de qualquer disparo.
 * 5. Textos de mensagens em conformidade com normas do Banco Central.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Método GET não permitido para operações de webhook mutáveis. Utilize POST autenticado." },
    { status: 405 }
  );
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validação de autenticidade / Segredo do PABX/URA (Constant-time comparison)
    const configuredSecret = process.env.URA_WEBHOOK_SECRET;
    const providedSecret = req.headers.get("x-ura-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const isSecretValid = !!(
      configuredSecret &&
      providedSecret &&
      Buffer.from(providedSecret).length === Buffer.from(configuredSecret).length &&
      timingSafeEqual(Buffer.from(providedSecret), Buffer.from(configuredSecret))
    );

    if (!isSecretValid) {
      return NextResponse.json(
        { success: false, error: "Acesso negado: token de autenticação de webhook URA inválido." },
        { status: 401 }
      );
    }

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

async function processUraEvent(payload: any, req: NextRequest) {
  const rawTelefone = payload.telefone || payload.phone || payload.numero || payload.callerid || payload.from || payload.to || payload.ani || payload.contact;
  const rawNome = payload.nome || payload.name || payload.caller_name || payload.lead_nome || "Lead URA Reversa";
  const digit = String(payload.digit || payload.dtmf || payload.tecla || payload.key || payload.option || "1").trim();
  const campanha = payload.campanha || payload.campaign || "URA Reversa Ativa";
  // O tenant é definido pela configuração do servidor, nunca por campos controlados pelo chamador.
  // Para URAs multiempresa, configure um segredo/endpoint separado por empresa.
  const empresaId = process.env.URA_WEBHOOK_EMPRESA_ID || null;

  if (!rawTelefone) {
    return NextResponse.json(
      { success: false, error: "Parâmetro 'telefone' é obrigatório para processar o evento da URA" },
      { status: 400 }
    );
  }

  // 2. Isolamento Multiempresa: empresa_id é OBRIGATÓRIO (sem suposição arbitrária)
  if (!empresaId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(empresaId)) {
    console.error("[URA-DTMF] URA_WEBHOOK_EMPRESA_ID ausente ou inválido; operação bloqueada.");
    return NextResponse.json(
      { success: false, error: "Integração URA não configurada para uma empresa válida." },
      { status: 503 }
    );
  }

  // Sanitização do número
  const digitsOnly = String(rawTelefone).replace(/\D/g, "");
  let formattedPhone = digitsOnly;
  if (!formattedPhone.startsWith("55") && (formattedPhone.length === 10 || formattedPhone.length === 11)) {
    formattedPhone = `55${formattedPhone}`;
  }

  if (!supabaseAdmin) {
    console.error("[URA-DTMF] SUPABASE_SERVICE_ROLE_KEY ausente; operação bloqueada.");
    return NextResponse.json({ success: false, error: "Integração temporariamente indisponível." }, { status: 503 });
  }
  const clientDb = supabaseAdmin;
  const nowIso = new Date().toISOString();

  // 3. Verificação do Não Perturbe (DND)
  const { data: dndEntry, error: dndError } = await clientDb
    .from("lista_nao_perturbe")
    .select("id")
    .eq("telefone", formattedPhone)
    .eq("ativo", true)
    .maybeSingle();

  if (dndError) {
    console.error("[URA-DTMF] Não foi possível consultar Não Perturbe:", dndError);
    return NextResponse.json({ success: false, error: "Não foi possível validar a lista Não Perturbe." }, { status: 503 });
  }

  if (dndEntry) {
    logAuditEvent({
      action: "URA_DTMF_BLOCKED_DND",
      resource: "leads",
      resourceId: formattedPhone,
      empresaId,
      metadata: { telefone: formattedPhone, digit, motivo: "Número cadastrado na lista Não Perturbe (DND)" }
    });

    return NextResponse.json({
      success: true,
      status: "dnd_blocked",
      message: "Contato bloqueado: número cadastrado na lista Não Perturbe (DND)."
    });
  }

  // 4. Verificar se o Lead já existe na base desta empresa
  const { data: existingLead, error: existingLeadError } = await clientDb
    .from("leads")
    .select("id, nome, status, etapa_crm, observacoes, empresa_id")
    .eq("telefone", formattedPhone)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (existingLeadError) {
    console.error("[URA-DTMF] Falha ao consultar lead:", existingLeadError);
    return NextResponse.json({ success: false, error: "Não foi possível consultar o lead." }, { status: 502 });
  }

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
        empresa_id: empresaId,
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

  // 5. Acionamento do WhatsApp com texto transparente e em conformidade
  let whatsappSent = false;
  let whatsappResult: any = null;

  if (digit === "1" || digit.toLowerCase() === "sim") {
    try {
      const configuredSecret = process.env.ADMIN_WEBHOOK_SECRET;
      if (!configuredSecret) {
        console.error("[URA-DTMF] ADMIN_WEBHOOK_SECRET ausente; envio interno de WhatsApp não executado.");
        return NextResponse.json({ success: false, error: "Integração de WhatsApp não configurada." }, { status: 503 });
      }
      const originUrl = req.nextUrl.origin || "http://localhost:3000";
      const primeiroNome = rawNome.split(" ")[0] || "Cliente";
      const msgSofia = `Olá, ${primeiroNome}! Sou a Sofia, consultora virtual autorizada 🚀\n\nRecebemos sua confirmação de interesse pelo telefone na simulação de crédito/FGTS.\n\nPodemos realizar uma simulação gratuita e sem compromisso para você conferir as condições disponíveis?`;

      const sendResponse = await fetch(`${originUrl}/api/whatsapp/send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${configuredSecret || ""}`
        },
        body: JSON.stringify({
          telefone: formattedPhone,
          mensagem: msgSofia,
          lead_id: leadId,
          empresa_id: empresaId
        })
      });

      whatsappResult = await sendResponse.json().catch(() => ({}));
      whatsappSent = sendResponse.ok;
    } catch (waErr: any) {
      console.warn("[URA-DTMF WhatsApp trigger warning]:", waErr.message);
    }
  }

  // 6. Auditoria de Segurança
  logAuditEvent({
    action: "URA_DTMF_INTERACTION",
    resource: "leads",
    resourceId: String(leadId || formattedPhone),
    empresaId,
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
    message: "Interação de URA Reversa recebida com sucesso. Lead qualificado com isolamento por empresa."
  });
}
