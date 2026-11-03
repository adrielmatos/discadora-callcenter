import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";

// Rate limiter em memória por IP (5 envios a cada 10 minutos por IP)
const ipSubmissions = new Map<string, { count: number; resetAt: number }>();

function isLocalK6Test(req: NextRequest): boolean {
  // Blindagem estrita: NUNCA permitir bypass em ambiente de produção da Vercel
  if (process.env.VERCEL === "1") return false;
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const hostname = req.nextUrl?.hostname?.toLowerCase() || "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || hostname === "localhost" || hostname === "127.0.0.1";
  return isLocalHost && req.headers.get("x-k6-test") === "true";
}

function checkRateLimit(ip: string, isTestBypass: boolean): boolean {
  if (isTestBypass) return true;
  const now = Date.now();
  const record = ipSubmissions.get(ip);
  if (!record || now > record.resetAt) {
    ipSubmissions.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (record.count >= 5) {
    return false;
  }
  record.count += 1;
  return true;
}

/**
 * Captura pública de leads originados na Landing Page
 * Armazena no CRM da empresa principal (A&K) via RPC SECURITY DEFINER para follow-up comercial.
 */
export async function POST(req: NextRequest) {
  try {
    const isTestBypass = isLocalK6Test(req);
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    
    if (!checkRateLimit(clientIp, isTestBypass)) {
      return NextResponse.json(
        { error: "Limite de solicitações atingido. Por favor, aguarde alguns minutos antes de enviar novamente." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { nome, telefone, tamanhoEquipe, mensagem, website_url, empresa_fake } = body;

    // Honeypot anti-bot silencioso
    if (website_url || empresa_fake) {
      return NextResponse.json({ success: true, message: "Recebido com sucesso." });
    }

    if (typeof nome !== "string" || typeof telefone !== "string" || !nome.trim() || !telefone.trim()) {
      return NextResponse.json({ error: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
    }

    const cleanPhone = telefone.replace(/\D/g, "");
    const cleanDigits = cleanPhone.replace(/^55/, "");
    if (cleanDigits.length < 10 || cleanDigits.length > 11) {
      return NextResponse.json(
        { error: "Número de WhatsApp inválido. Digite o DDD + número (10 ou 11 dígitos)." },
        { status: 400 }
      );
    }

    // Validação de DDD brasileiro válido (11 a 99)
    const ddd = parseInt(cleanDigits.substring(0, 2), 10);
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return NextResponse.json({ error: "DDD brasileiro inválido." }, { status: 400 });
    }

    if (nome.trim().length > 150) {
      return NextResponse.json({ error: "O nome deve ter no máximo 150 caracteres." }, { status: 400 });
    }

    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanDigits}`;

    // Utiliza o cliente de banco disponível (prioriza supabaseAdmin com service_role ou supabase público)
    const clientDb = supabaseAdmin || supabase;

    // Tenta resolver a empresa caso exista acesso administrativo
    let targetEmpresaId: string | null = null;
    if (supabaseAdmin) {
      try {
        const { data: internalEmp } = await supabaseAdmin
          .from("empresas")
          .select("id")
          .eq("interna", true)
          .limit(1)
          .maybeSingle();
        if (internalEmp?.id) targetEmpresaId = internalEmp.id;
      } catch {}
    }
    if (!targetEmpresaId && process.env.DEFAULT_TENANT_ID) {
      targetEmpresaId = process.env.DEFAULT_TENANT_ID;
    }

    // 1. Tenta persistência via RPC SECURITY DEFINER (sync_mined_lead)
    // Se targetEmpresaId for null, a própria procedure resolve internamente no Postgres
    let leadId: number | string | null = null;
    try {
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
        p_empresa_id: targetEmpresaId || null
      });

      if (!rpcError && rpcResult?.lead_id) {
        leadId = rpcResult.lead_id;
      } else if (rpcError) {
        console.warn("[Landing leads] RPC sync_mined_lead falhou, tentando fallback direto:", rpcError.message);
      }
    } catch (rpcEx) {
      console.warn("[Landing leads] Exceção na RPC sync_mined_lead, tentando fallback direto:", rpcEx);
    }

    // 2. Fallback direto caso a RPC falhe ou não exista
    if (!leadId) {
      const insertPayload: Record<string, any> = {
        nome: String(nome).trim().slice(0, 150),
        telefone: formattedPhone,
        banco: "Lead Landing Page",
        produto: "SaaS Discadora Call Center",
        margem_disponivel: tamanhoEquipe ? `Equipe: ${tamanhoEquipe}` : "Lead Comercial",
        status: "pendente",
        etapa_crm: "Interessado",
        ultima_tabulacao: `[Landing Page] Demonstração Solicitada (${tamanhoEquipe || "Solo"})`
      };
      if (targetEmpresaId) insertPayload.empresa_id = targetEmpresaId;

      const { data: directLead, error: directError } = await clientDb
        .from("leads")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

      if (directError || !directLead?.id) {
        console.error("[Landing leads] Falha tanto na RPC quanto na inserção direta:", directError);
        return NextResponse.json(
          { error: "Não foi possível registrar seu contato no banco de dados. Tente novamente em instantes." },
          { status: 500 }
        );
      }
      leadId = directLead.id;
    }

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
