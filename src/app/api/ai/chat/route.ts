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

// Chamada à API Oficial do Google Gemini (1.5 Flash - Grátis 15 RPM)
async function callGemini(
  apiKey: string,
  systemInstruction: string,
  history: ChatHistoryItem[],
  message: string
): Promise<{ text: string } | { error: string; status: number }> {
  try {
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: errText, status: res.status };
    }

    const data = await res.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (generatedText) {
      return { text: generatedText.trim() };
    }
    return { error: "Sem resposta gerada pelo Gemini", status: 500 };
  } catch (err: any) {
    return { error: err.message, status: 500 };
  }
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

    const systemInstruction = `Você é ${effectiveName}, a consultora virtual de crédito e especialista em soluções financeiras da ${effectiveCompany}.
Sua missão é acolher o cliente no WhatsApp, explicar as vantagens de forma humana, transparente e persuasiva, e tirar dúvidas sobre:
1. Saque-Aniversário FGTS (taxa a partir de 1,69% a.m., liberação via PIX em até 2 horas).
2. Crédito Consignado INSS, BPC/LOAS e Servidores (até 84x, menor taxa do mercado).
3. Portabilidade com Troco (troca de banco reduzindo juros e liberando dinheiro em conta sem aumentar a parcela).

Regras de conduta:
- Nunca cobre nada antecipado. Destaque que a formalização é 100% digital e segura.
- Responda de forma concisa e amigável (máximo 2 a 3 parágrafos curtos, ideal para ler no celular).
- Use linguagem brasileira natural e profissional.
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
    if (lowerMessage.includes("golpe") || lowerMessage.includes("seguro") || lowerMessage.includes("confiavel") || lowerMessage.includes("confiável")) {
      fallbackReply = `Compreendo sua cautela! Na ${effectiveCompany} operamos como correspondente autorizado aos bancos oficiais. Nós NUNCA cobramos taxas antecipadas. Todo o processo é validado diretamente com biometria facial no app oficial do banco.`;
    } else if (lowerMessage.includes("fgts") || lowerMessage.includes("aniversario") || lowerMessage.includes("aniversário")) {
      fallbackReply = `Sim! Fazemos a antecipação de até 10 anos do seu Saque-Aniversário FGTS com taxa a partir de 1,69% a.m. O dinheiro cai via PIX na sua conta em até 2 horas. Gostaria de simular seu saldo?`;
    } else if (lowerMessage.includes("portabilidade") || lowerMessage.includes("troco") || lowerMessage.includes("reduzir")) {
      fallbackReply = `Excelente! Com a Portabilidade com Troco, transferimos sua dívida para um banco parceiro com taxa menor e liberamos a diferença como troco em dinheiro direto na sua conta, sem aumentar o valor da sua parcela atual!`;
    } else if (lowerMessage.includes("inss") || lowerMessage.includes("bpc") || lowerMessage.includes("loas") || lowerMessage.includes("aposentado")) {
      fallbackReply = `Atendemos aposentados, pensionistas e beneficiários BPC/LOAS com a menor taxa de consignado do Brasil em até 84 parcelas sem consulta ao SPC/Serasa. Você já sabe sua margem disponível?`;
    } else {
      fallbackReply = `Olá! Sou a ${effectiveName} da ${effectiveCompany}. Para que eu possa calcular a melhor proposta liberada hoje pelos bancos parceiros, qual o valor ou produto (FGTS ou Consignado) você tem interesse em consultar?`;
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
