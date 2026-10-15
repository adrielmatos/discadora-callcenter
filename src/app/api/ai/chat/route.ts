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
      temperature: 0.7,
      maxOutputTokens: 500
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
        // Se for 404 de modelo descontinuado ou 503 de sobrecarga temporária, tenta o próximo modelo
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
        temperature: 0.7,
        max_tokens: 500
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
    const { message, history, knowledge, company, agentName, handoffTriggers } = await req.json();

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
      return NextResponse.json({
        reply: `Perfeito! Já transferi seu atendimento para o nosso especialista humano da ${effectiveCompany}. Ele já tem o seu histórico e vai falar com você aqui em instantes para concluir a formalização! 🚀`,
        isHandoff: true,
        source: "handoff_trigger",
        provider: "Gatilho de Transbordo Humano"
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

    const systemInstruction = `Você é ${effectiveName}, assistente virtual de triagem e pré-atendimento da ${effectiveCompany}.
Seu papel é acolher o cliente no WhatsApp, tirar dúvidas básicas sobre o funcionamento dos processos e conectar o cliente com o nosso especialista humano da equipe para que ele faça o cálculo oficial no sistema.

DIRETRIZES FUNDAMENTAIS DE CONDUTA:
1. NUNCA invente, prometa ou informe taxas de juros, porcentagens fixas ou valores específicos de parcelas. As condições dependem da análise oficial de margem, convênio e coeficientes diários do banco.
2. Quando o cliente perguntar sobre taxas de juros, valores de parcelas ou simulação:
   - Explique cordialmente que as taxas e limites exatos dependem da consulta da margem oficial no sistema de cada banco parceiro.
   - Diga que o nosso especialista humano fará essa consulta oficial gratuita e personalizada no sistema agora mesmo.
   - Pergunte se o cliente gostaria que o especialista faça a consulta para ele.
3. Segurança e Confiança:
   - Destaque com ênfase que NUNCA cobramos nenhum depósito antecipado ou taxa prévia (cuidado com golpes).
   - O dinheiro aprovado cai diretamente na conta bancária do próprio titular (via PIX ou TED).
   - A contratação é 100% digital e segura pelo celular, com biometria facial oficial do banco parceiro.
4. Produtos atendidos:
   - Antecipação de Saque-Aniversário FGTS (sem consulta ao SPC/Serasa, pagamento via PIX na conta do cliente).
   - Empréstimo Consignado para Aposentados e Pensionistas do INSS, BPC/LOAS e Servidores Públicos.
   - Portabilidade de Crédito (redução de juros e liberação de troco em dinheiro na conta sem aumentar a parcela).
5. Estilo de resposta:
   - Respostas curtas, gentis e objetivas (máximo 2 a 3 parágrafos curtos, ideais para leitura rápida no WhatsApp).
   - Linguagem natural brasileira, humana, profissional e prestativa.
   - Sempre finalize com uma pergunta gentil para avançar o atendimento (ex: "Você gostaria que o nosso especialista consulte as condições liberadas no sistema para você?").
   - Base de conhecimento: ${effectiveKnowledge}`;

    // Se temos provedores no pool, balanceia a carga e faz rotação com failover instantâneo
    if (pool.length > 0) {
      // Começa de um índice randômico para distribuir requisições uniformemente entre as chaves gratuitas (Round-Robin)
      const offset = Math.floor(Math.random() * pool.length);
      const candidates = [...pool.slice(offset), ...pool.slice(0, offset)];

      for (const candidate of candidates) {
        if (candidate.type === "gemini") {
          const result = await callGemini(candidate.key, systemInstruction, history, message);
          if ("text" in result && result.text) {
            return NextResponse.json({
              reply: result.text,
              isHandoff: false,
              source: "gemini_ai",
              provider: candidate.label
            });
          }
          console.warn(`[Failover IA] ${candidate.label} falhou (HTTP ${"status" in result ? result.status : "unknown"}). Tentando próximo candidato...`);
        } else if (candidate.type === "groq") {
          const result = await callGroq(candidate.key, systemInstruction, history, message);
          if ("text" in result && result.text) {
            return NextResponse.json({
              reply: result.text,
              isHandoff: false,
              source: "groq_ai",
              provider: candidate.label
            });
          }
          console.warn(`[Failover IA] ${candidate.label} falhou (HTTP ${"status" in result ? result.status : "unknown"}). Tentando próximo candidato...`);
        }
      }
    }

    // Fallback inteligente contextual caso nenhuma chave esteja configurada ou se todas atingirem a cota momentânea
    let fallbackReply = "";
    if (lowerMessage.includes("golpe") || lowerMessage.includes("seguro") || lowerMessage.includes("confiavel") || lowerMessage.includes("confiável") || lowerMessage.includes("taxa antecipada") || lowerMessage.includes("depósito")) {
      fallbackReply = `Compreendo sua cautela! Na ${effectiveCompany} operamos como correspondente autorizado dos bancos parceiros oficiais. Nós NUNCA cobramos taxas ou depósitos antecipados. Todo o processo é 100% digital com biometria facial no app do banco, e o dinheiro cai direto na sua conta.`;
    } else if (lowerMessage.includes("taxa") || lowerMessage.includes("juros") || lowerMessage.includes("quanto fica") || lowerMessage.includes("valor da parcela") || lowerMessage.includes("quanto pago")) {
      fallbackReply = `As taxas e valores exatos dependem da análise oficial da sua margem no sistema dos bancos parceiros. Para não te passar nenhuma informação imprecisa, o cálculo oficial é feito pelo nosso especialista humano. Gostaria que eu peça para ele consultar a sua simulação no sistema agora?`;
    } else if (lowerMessage.includes("fgts") || lowerMessage.includes("aniversario") || lowerMessage.includes("aniversário")) {
      fallbackReply = `Trabalhamos com a antecipação do Saque-Aniversário FGTS sem consulta ao SPC/Serasa, com liberação rápida na sua conta via PIX após a aprovação! Gostaria que nosso especialista consulte o seu saldo liberado no sistema?`;
    } else if (lowerMessage.includes("portabilidade") || lowerMessage.includes("troco") || lowerMessage.includes("reduzir")) {
      fallbackReply = `Com a Portabilidade com Troco, avaliamos seu contrato atual para tentar transferir para um banco com condições melhores e liberar troco em dinheiro na sua conta, sem aumentar sua parcela! Gostaria que nosso especialista analise seu caso?`;
    } else if (lowerMessage.includes("inss") || lowerMessage.includes("bpc") || lowerMessage.includes("loas") || lowerMessage.includes("aposentado")) {
      fallbackReply = `Atendemos aposentados, pensionistas e beneficiários BPC/LOAS com empréstimo consignado direto em folha sem consulta ao SPC/Serasa. Gostaria que nosso especialista verifique sua margem disponível hoje?`;
    } else {
      fallbackReply = `Olá! Sou a ${effectiveName}, assistente virtual da ${effectiveCompany}. Estou aqui para te ajudar com dúvidas e chamar nosso especialista para calcular as melhores condições aprovadas para você. Qual produto você gostaria de consultar hoje (FGTS ou Consignado)?`;
    }

    return NextResponse.json({
      reply: fallbackReply,
      isHandoff: false,
      source: "rule_engine",
      provider: "Motor de Regras Inteligente (Fallback)",
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
