import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { message, history, knowledge, company, agentName, handoffTriggers } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
    }

    // Busca credenciais no banco ou ambiente
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select("gemini_api_key, ai_knowledge, ai_name, empresa_nome, ai_handoff_triggers")
      .limit(1)
      .maybeSingle();

    const apiKey = (config?.gemini_api_key || process.env.GEMINI_API_KEY || "").trim();
    const effectiveCompany = company || config?.empresa_nome || "A&K Soluções Financeiras";
    const effectiveName = agentName || config?.ai_name || "Sofia";
    const effectiveKnowledge = knowledge || config?.ai_knowledge || "Correspondente bancário autorizado dos bancos Pan, Safra, BMG, C6, Facta e Daycoval. Especialista em FGTS e Consignado INSS.";
    const triggers = (handoffTriggers || config?.ai_handoff_triggers || "falar com atendente, quero contratar, manda o contrato, fechar agora, falar com humano")
      .split(",")
      .map((t: string) => t.trim().toLowerCase());

    const lowerMessage = message.toLowerCase();
    const shouldHandoff = triggers.some((t: string) => t && lowerMessage.includes(t));

    // Se o cliente acionou o gatilho de fechamento/transbordo
    if (shouldHandoff) {
      return NextResponse.json({
        reply: `Perfeito! Já transferi seu atendimento para o nosso especialista humano da ${effectiveCompany}. Ele já tem o seu histórico e vai falar com você aqui em instantes para concluir a formalização! 🚀`,
        isHandoff: true,
        source: "handoff_trigger"
      });
    }

    // Se temos a chave do Google Gemini configurada, executa chamada com IA REAL
    if (apiKey) {
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

      // Monta histórico de mensagens no formato Gemini
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

      const geminiRes = await fetch(geminiUrl, {
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

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return NextResponse.json({
            reply: generatedText.trim(),
            isHandoff: false,
            source: "gemini_ai"
          });
        }
      } else {
        const errBody = await geminiRes.text();
        console.warn("Aviso na chamada da API Gemini:", errBody);
      }
    }

    // Fallback inteligente contextual caso a chave ainda não tenha sido configurada
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
      notice: apiKey ? undefined : "Dica: Cadastre sua chave gratuita do Google Gemini em /omnichannel para ativar respostas 100% autônomas via LLM."
    });

  } catch (error: any) {
    console.error("Erro na rota /api/ai/chat:", error);
    return NextResponse.json(
      { error: "Erro interno no motor de inteligência artificial: " + error.message },
      { status: 500 }
    );
  }
}
