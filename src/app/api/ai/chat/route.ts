import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface ChatHistoryItem {
  sender: "client" | "ai";
  text: string;
}

interface ProviderCandidate {
  type: "gemini" | "groq";
  key: string;
  label: string;
}

// Sincroniza conversa e cliente diretamente com o CRM da Discadora (Supabase)
async function syncConversationToCrm(
  phone: string,
  name?: string,
  userMessage?: string,
  aiReply?: string,
  isHandoff?: boolean
) {
  try {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) return null;

    const searchPhone = cleanPhone.slice(-8); // Busca pelos últimos 8 dígitos para cobrir com/sem 55 e DDD

    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, nome, telefone, etapa_crm, status")
      .ilike("telefone", `%${searchPhone}%`)
      .limit(1);

    let leadId: number | null = null;
    const nextEtapa = isHandoff ? "Simulação" : "Interessado";
    const tabulacaoLabel = isHandoff 
      ? "[WhatsApp Sofia] Aguardando Especialista" 
      : "[WhatsApp Sofia] Em Atendimento";

    if (existingLeads && existingLeads.length > 0) {
      const existing = existingLeads[0];
      leadId = existing.id;
      // Atualiza status e etapa do lead existente
      await supabase
        .from("leads")
        .update({
          etapa_crm: nextEtapa,
          ultima_tabulacao: tabulacaoLabel,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);
    } else {
      // Cria automaticamente um novo lead vindo do WhatsApp
      const cleanName = (name || "").trim() || `Cliente WhatsApp (${cleanPhone.slice(-4)})`;
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          nome: cleanName,
          telefone: cleanPhone,
          status: "pendente",
          etapa_crm: nextEtapa,
          ultima_tabulacao: tabulacaoLabel,
          produto: "FGTS / Consignado"
        })
        .select("id")
        .single();

      if (newLead) {
        leadId = newLead.id;
      }
    }

    if (leadId) {
      // Registra a interação no histórico da ficha do cliente
      const interactionText = `[WhatsApp Sofia] Cliente: "${(userMessage || "").slice(0, 150)}" | Sofia: "${(aiReply || "").slice(0, 200)}"`;
      await supabase.from("historico_ligacoes").insert({
        lead_id: leadId,
        tabulacao: interactionText,
        duracao_segundos: 0
      });

      // Se for acionado o transbordo para especialista humano, gera alerta prioritário em 'retornos'
      if (isHandoff) {
        const { data: existingRetorno } = await supabase
          .from("retornos")
          .select("id")
          .eq("lead_id", leadId)
          .eq("concluido", false)
          .limit(1);

        if (!existingRetorno || existingRetorno.length === 0) {
          await supabase.from("retornos").insert({
            lead_id: leadId,
            data_hora: new Date().toISOString(),
            observacao: `[ALERTA WHATSAPP] Cliente solicitou especialista/simulação: "${(userMessage || "").slice(0, 100)}"`,
            concluido: false
          });
        }
      }
    }

    return { leadId, synced: true };
  } catch (err) {
    console.error("Erro ao sincronizar WhatsApp com CRM:", err);
    return null;
  }
}

// Chamada à API Oficial do Google Gemini (gemini-flash-latest / 15 RPM Grátis)
async function callGemini(
  apiKey: string,
  systemInstruction: string,
  history: ChatHistoryItem[],
  message: string
): Promise<{ text: string } | { error: string; status: number }> {
  const modelCandidates = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-1.5-flash-latest", "gemini-1.5-flash"];
  
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      contents.push({
        role: item.sender === "ai" ? "model" : "user",
        parts: [{ text: item.text }]
      });
    }
  }
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 160
    }
  };

  let lastError = { error: "Sem resposta gerada pelo Gemini", status: 500 };

  for (const model of modelCandidates) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return { text: generatedText.trim() };
        }
      } else {
        const errText = await res.text();
        lastError = { error: errText, status: res.status };
        if (res.status === 404 || res.status === 503) continue;
        return lastError;
      }
    } catch (err: any) {
      lastError = { error: err.message, status: 500 };
    }
  }

  return lastError;
}

// Chamada à API Oficial da Groq Cloud (Llama 3.1 8B Instant - Grátis 30 RPM, 500 tokens/s)
async function callGroq(
  apiKey: string,
  systemInstruction: string,
  history: ChatHistoryItem[],
  message: string
): Promise<{ text: string } | { error: string; status: number }> {
  try {
    const messages: any[] = [
      { role: "system", content: systemInstruction }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        messages.push({
          role: item.sender === "ai" ? "assistant" : "user",
          content: item.text
        });
      }
    }
    messages.push({ role: "user", content: message });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.6,
        max_tokens: 160
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: errText, status: res.status };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    if (reply) {
      return { text: reply.trim() };
    }
    return { error: "Sem resposta gerada pela Groq", status: 500 };
  } catch (err: any) {
    return { error: err.message, status: 500 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      history, 
      knowledge, 
      company, 
      agentName, 
      handoffTriggers,
      clientPhone,
      clientName
    } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
    }

    // Busca configurações no banco Supabase
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select("gemini_api_key, groq_api_key, ai_knowledge, ai_name, empresa_nome, ai_handoff_triggers")
      .limit(1)
      .maybeSingle();

    const effectiveCompany = company || config?.empresa_nome || "A&K Soluções Financeiras";
    const effectiveName = agentName || config?.ai_name || "Sofia";
    const effectiveKnowledge = knowledge || config?.ai_knowledge || "Correspondente bancário autorizado dos bancos Pan, Safra, BMG, C6, Facta e Daycoval. Especialista em FGTS e Consignado INSS.";
    const triggers = (handoffTriggers || config?.ai_handoff_triggers || "falar com atendente, quero contratar, manda o contrato, fechar agora, falar com humano")
      .split(",")
      .map((t: string) => t.trim().toLowerCase());

    const lowerMessage = message.toLowerCase();
    const shouldHandoff = triggers.some((t: string) => t && lowerMessage.includes(t));

    // Se o cliente acionou o gatilho de fechamento/transbordo humano
    if (shouldHandoff) {
      const reply = `Perfeito! Já transferi seu atendimento para o nosso especialista da ${effectiveCompany}. Ele já tem o seu histórico e vai falar com você aqui em instantes para concluir a formalização! 🚀`;
      
      let syncResult = null;
      if (clientPhone) {
        syncResult = await syncConversationToCrm(clientPhone, clientName, message, reply, true);
      }

      return NextResponse.json({
        reply,
        isHandoff: true,
        source: "handoff_trigger",
        provider: "Gatilho de Transbordo Humano",
        crmSync: syncResult
      });
    }

    // Extrai chaves Google Gemini (permite múltiplas chaves separadas por vírgula ou quebra de linha)
    const rawGemini = [config?.gemini_api_key, process.env.GEMINI_API_KEY]
      .filter(Boolean)
      .join(",");
    const geminiKeys = rawGemini
      .split(/[\n,;]+/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 5);

    // Extrai chaves Groq Cloud (permite múltiplas chaves separadas por vírgula ou quebra de linha)
    const rawGroq = [config?.groq_api_key, process.env.GROQ_API_KEY]
      .filter(Boolean)
      .join(",");
    const groqKeys = rawGroq
      .split(/[\n,;]+/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 5);

    // Monta o Pool de Provedores com Balanceamento
    const pool: ProviderCandidate[] = [];
    geminiKeys.forEach((key: string, idx: number) => {
      pool.push({
        type: "gemini",
        key,
        label: `Google Gemini 1.5 Flash (Chave #${idx + 1})`
      });
    });
    groqKeys.forEach((key: string, idx: number) => {
      pool.push({
        type: "groq",
        key,
        label: `Groq Cloud Llama 3.1 (Chave #${idx + 1})`
      });
    });

    const systemInstruction = `Você é ${effectiveName}, assistente virtual de atendimento da ${effectiveCompany}.
Sua missão é prestar um atendimento formal, polido, humanizado e juridicamente seguro pelo WhatsApp, pautado estritamente na legislação brasileira vigente.

BASE LEGAL OFICIAL (SIGA RIGOROSAMENTE):
1. FGTS (Lei Federal nº 13.932/2019 e Resolução CCFGTS nº 958/2020):
   - A antecipação é uma cessão fiduciária do Saque-Aniversário.
   - Requisitos obrigatórios por lei: ter saldo no FGTS (contas ativas ou inativas), optar pela modalidade Saque-Aniversário no aplicativo oficial do FGTS da Caixa e autorizar os bancos parceiros a consultarem o saldo.
   - Não há desconto de boletos ou salário mensal: o pagamento é descontado anualmente direto do fundo pela Caixa.
   - Não há restrição para negativados (sem consulta ao SPC/Serasa).
   - NUNCA invente número fixo de anos ou parcelas: a quantidade de anos antecipados e o valor liberado dependem estritamente do saldo disponível e da política de cada banco parceiro na consulta oficial.

2. CRÉDITO CONSIGNADO (Lei Federal nº 10.820/2003 e Instruções Normativas do INSS):
   - Exclusivo para quem possui margem consignável disponível (aposentados, pensionistas do INSS, BPC/LOAS e servidores).
   - Desconto automático e direto em folha de pagamento ou benefício.
   - Vedada por lei qualquer cobrança de taxa prévia ou depósito antecipado.

3. PORTABILIDADE DE CRÉDITO (Resolução Bacen nº 4.292/2013 e Resolução CMN nº 5.057/2022):
   - Direito do titular de transferir o contrato para outro banco com taxa de juros mais vantajosa, podendo liberar a diferença como troco em dinheiro na conta, mantendo a parcela atual.

REGRAS DE CONDUTA E ESTILO:
- Formal, polida e humanizada: utilize linguagem profissional e respeitosa, sem gírias ou termos excessivamente informais.
- Respostas curtas: máximo de 2 a 3 frases claras e objetivas, adequadas para leitura ágil no WhatsApp.
- Preservação jurídica total: se perguntarem sobre taxas ou valores, explique que as condições exatas dependem da consulta oficial da margem no sistema do banco, oferecendo a consulta gratuita com o especialista da equipe.
- Finalize sempre com uma pergunta cordial (ex: "Gostaria que o nosso especialista verifique as condições oficiais para você?").
Base de conhecimento da empresa: ${effectiveKnowledge}`;

    // Se temos provedores no pool, balanceia a carga e faz rotação com failover instantâneo
    if (pool.length > 0) {
      const offset = Math.floor(Math.random() * pool.length);
      const candidates = [...pool.slice(offset), ...pool.slice(0, offset)];

      for (const candidate of candidates) {
        if (candidate.type === "gemini") {
          const result = await callGemini(candidate.key, systemInstruction, history, message);
          if ("text" in result && result.text) {
            let syncResult = null;
            if (clientPhone) {
              syncResult = await syncConversationToCrm(clientPhone, clientName, message, result.text, false);
            }
            return NextResponse.json({
              reply: result.text,
              isHandoff: false,
              source: "gemini_ai",
              provider: candidate.label,
              crmSync: syncResult
            });
          }
          console.warn(`[Failover IA] ${candidate.label} falhou. Tentando próximo...`);
        } else if (candidate.type === "groq") {
          const result = await callGroq(candidate.key, systemInstruction, history, message);
          if ("text" in result && result.text) {
            let syncResult = null;
            if (clientPhone) {
              syncResult = await syncConversationToCrm(clientPhone, clientName, message, result.text, false);
            }
            return NextResponse.json({
              reply: result.text,
              isHandoff: false,
              source: "groq_ai",
              provider: candidate.label,
              crmSync: syncResult
            });
          }
          console.warn(`[Failover IA] ${candidate.label} falhou. Tentando próximo...`);
        }
      }
    }

    // Fallback inteligente contextual caso nenhuma chave esteja configurada
    let fallbackReply = "";
    if (lowerMessage.includes("golpe") || lowerMessage.includes("seguro") || lowerMessage.includes("confiavel") || lowerMessage.includes("confiável") || lowerMessage.includes("taxa antecipada") || lowerMessage.includes("depósito")) {
      fallbackReply = `Compreendo sua preocupação. Na ${effectiveCompany} não cobramos nenhum valor antecipado. A contratação é 100% digital e segura, e o crédito é depositado diretamente em sua conta bancária. Posso auxiliar com uma simulação?`;
    } else if (lowerMessage.includes("taxa") || lowerMessage.includes("juros") || lowerMessage.includes("quanto fica") || lowerMessage.includes("valor da parcela") || lowerMessage.includes("quanto pago")) {
      fallbackReply = `As taxas e condições dependem da análise oficial da sua margem junto aos bancos parceiros. Se desejar, posso solicitar que o nosso especialista realize uma consulta personalizada para você agora mesmo. Qual é o seu nome, por gentileza?`;
    } else if (lowerMessage.includes("fgts") || lowerMessage.includes("aniversario") || lowerMessage.includes("aniversário")) {
      fallbackReply = `Trabalhamos com a antecipação do Saque-Aniversário do FGTS, sem consulta ao SPC ou Serasa e com liberação rápida via PIX. Gostaria que o nosso especialista verifique o saldo disponível para você?`;
    } else if (lowerMessage.includes("portabilidade") || lowerMessage.includes("troco") || lowerMessage.includes("reduzir")) {
      fallbackReply = `Com a portabilidade de crédito, buscamos reduzir a taxa do seu contrato atual e liberar troco em dinheiro em sua conta, sem alterar o valor da sua parcela. Deseja realizar uma consulta?`;
    } else if (lowerMessage.includes("inss") || lowerMessage.includes("bpc") || lowerMessage.includes("loas") || lowerMessage.includes("aposentado")) {
      fallbackReply = `Atendemos aposentados, pensionistas e beneficiários BPC/LOAS com as melhores condições de crédito consignado. Gostaria que verificássemos a sua margem disponível hoje?`;
    } else {
      fallbackReply = `Olá! Sou a ${effectiveName}, assistente da ${effectiveCompany}. Como posso ajudar você hoje? Tem interesse em consultar opções de FGTS ou Consignado?`;
    }

    let syncResult = null;
    if (clientPhone) {
      syncResult = await syncConversationToCrm(clientPhone, clientName, message, fallbackReply, false);
    }

    return NextResponse.json({
      reply: fallbackReply,
      isHandoff: false,
      source: "rule_engine",
      provider: "Motor de Regras Inteligente (Fallback)",
      crmSync: syncResult,
      notice: pool.length > 0 
        ? "Cota momentânea atingida no pool gratuito. Resposta entregue pelo motor de regras."
        : "Dica: Adicione chaves gratuitas do Google Gemini ou Groq Cloud em /omnichannel para ativar o Pool de IAs Autônomas."
    });

  } catch (error: any) {
    console.error("Erro na rota /api/ai/chat:", error);
    return NextResponse.json(
      { error: "Erro interno no motor de inteligência artificial: " + error.message },
      { status: 500 }
    );
  }
}
