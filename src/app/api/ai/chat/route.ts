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

// Output Guardrail para Conformidade Bacen nº 3.954/2011 e CDC Art. 39
function sanitizeBacenReply(text: string): string {
  if (!text) return "";
  const forbiddenPatterns = [
    /taxa\s+(de\s+)?(cadastro|abertura|seguro|antecipada)/i,
    /dep[oó]sito\s+pr[eé]vio/i,
    /pagar\s+(algo|valor|taxa)\s+antes/i
  ];
  if (forbiddenPatterns.some(pattern => pattern.test(text))) {
    return "Nosso atendimento é 100% gratuito e não cobramos nenhuma taxa antecipada, em estrita conformidade com as normas do Banco Central. Deseja realizar sua simulação gratuita agora?";
  }
  return text;
}

// Sincroniza conversa e cliente diretamente com o CRM da Discadora (Supabase)
async function syncConversationToCrm(
  phone: string,
  name?: string,
  userMessage?: string,
  aiReply?: string,
  isHandoff?: boolean,
  empresaId?: string
) {
  try {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) return null;

    const searchPhone = cleanPhone.slice(-8); // Busca pelos últimos 8 dígitos para cobrir com/sem 55 e DDD

    let leadQuery = supabase
      .from("leads")
      .select("id, nome, telefone, etapa_crm, status")
      .ilike("telefone", `%${searchPhone}%`);

    if (empresaId) {
      leadQuery = leadQuery.eq("empresa_id", empresaId);
    }

    const { data: existingLeads } = await leadQuery.limit(1);

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
      const insertPayload: any = {
        nome: cleanName,
        telefone: cleanPhone,
        status: "pendente",
        etapa_crm: nextEtapa,
        ultima_tabulacao: tabulacaoLabel,
        produto: "FGTS / Consignado"
      };
      if (empresaId) insertPayload.empresa_id = empresaId;

      const { data: newLead } = await supabase
        .from("leads")
        .insert(insertPayload)
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
      temperature: 0.5,
      maxOutputTokens: 140
    }
  };

  let lastError = { error: "Sem resposta gerada pelo Gemini", status: 500 };

  for (const model of modelCandidates) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
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
        // Em 404 (modelo indisponível), 503 (serviço ocupado) ou 429 (rate limit), avança para o próximo modelo/chave
        if (res.status === 404 || res.status === 503 || res.status === 429) continue;
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
        temperature: 0.5,
        max_tokens: 140
      }),
      signal: AbortSignal.timeout(8000)
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
      clientName,
      empresaId
    } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
    }

    // Busca configurações no banco Supabase (com suporte a isolamento por empresa)
    let configQuery = supabase
      .from("app_configuracoes")
      .select("gemini_api_key, groq_api_key, ai_knowledge, ai_name, empresa_nome, ai_handoff_triggers");
    
    if (empresaId) {
      configQuery = configQuery.eq("empresa_id", empresaId);
    }

    const { data: config } = await configQuery.limit(1).maybeSingle();

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
      const rawReply = `Perfeito! Já transferi seu atendimento para o nosso especialista da ${effectiveCompany}. Ele já tem o seu histórico e vai falar com você aqui em instantes para concluir a formalização! 🚀`;
      const reply = sanitizeBacenReply(rawReply);
      
      let syncResult = null;
      if (clientPhone) {
        syncResult = await syncConversationToCrm(clientPhone, clientName, message, reply, true, empresaId);
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

    const systemInstruction = `Você é ${effectiveName}, corretora de crédito sênior e consultora financeira no WhatsApp da ${effectiveCompany}.
Sua missão é atender com simpatia, agilidade, inteligência comercial e 100% de conformidade com a legislação brasileira no WhatsApp.

CONFORMIDADE JURÍDICA TOTAL (CRÍTICO - BANCO CENTRAL, CDC E LGPD):
- Resoluções Bacen nº 3.954/2011 e nº 4.935/2021: É TERMINANTEMENTE PROIBIDA qualquer cobrança de taxa prévia, depósito de cadastro ou seguro antecipado. Nosso atendimento é 100% gratuito para o cliente. Se o cliente perguntar, reforce que pedir dinheiro adiantado é golpe e crime.
- Código de Defesa do Consumidor (Art. 39, I): JAMAIS faça venda casada obrigatória. A apresentação de FGTS + Crédito em Folha/Luz é sempre uma sugestão de opções independentes e voluntárias; o cliente tem total liberdade para escolher uma, outra ou ambas.
- Leis nº 10.820/2003 (Consignado) e nº 13.932/2019 (FGTS): Respeite estritamente os tetos oficiais do INSS/Bacen e os limites legais de margem.
- LGPD (Lei nº 13.709/2018): Trate dados de clientes (CPF, documentos) com sigilo absoluto, usando exclusivamente para consulta oficial nas instituições financeiras autorizadas.

REGRAS DE ESTILO E COMUNICAÇÃO:
- MÁXIMO DE 1 A 2 FRASES CURTAS (estilo WhatsApp ágil e humano, sem parágrafos longos nem textão).
- Adapte a linguagem ao cliente: seja simples e acolhedora com quem tem pouca instrução, e rápida e técnica com quem já entende.
- NUNCA invente taxa exata de juros ou valor de parcela sem antes consultar no sistema oficial do banco parceiro.
- Finalize sempre com uma pergunta curta convidando para a simulação gratuita ou pedindo o CPF/documento.

ESTRATÉGIAS COMERCIAIS POR PERFIL:
1. CLT (CARTEIRA ASSINADA / SETOR PRIVADO):
   - Apresente as duas opções independentes para somar: Antecipação do Saque-Aniversário do FGTS (PIX rápido sem mexer no salário e aprova negativado) e/ou Crédito em folha/conta de luz.
2. EMPRÉSTIMO NA CONTA DE LUZ (ENERGIA):
   - Ótimo para quem não tem margem, autônomos ou negativados. Pergunte a cidade/estado e a empresa de energia da conta (CPFL, Enel, Cemig, Equatorial, Coelba, etc.), se a conta está no nome do cliente e em dia.
3. APOSENTADOS, PENSIONISTAS INSS E BPC/LOAS:
   - Ofereça Consignado Novo, Portabilidade com Troco (troca a dívida por taxa menor e libera dinheiro na conta mantendo a parcela) e Saque de até 70% no PIX pelo Cartão Benefício (RCC).
4. SERVIDORES PÚBLICOS (SIAPE, ESTADO E PREFEITURA):
   - Consignado em folha com as menores taxas do mercado e portabilidade com troco expressa.
5. OBJEÇÃO DE GOLPE OU TAXA ANTECIPADA:
   - Tranquilize na hora: NUNCA cobramos taxa antecipada, a contratação é 100% digital e segura pelo Banco Central, e o crédito cai direto na conta dele.
6. EMPRÉSTIMO NA DIÁRIA:
   - Recuse com firmeza e educação; diga que trabalha apenas com crédito seguro autorizado pelo Banco Central e direcione para FGTS, conta de luz ou benefício.
7. DOCUMENTOS EXIGIDOS (TUDO 100% DIGITAL PELO CELULAR, SEM PAPELADA):
   - FGTS: Apenas o seu CPF e chave PIX para receber (sem complicação)!
   - INSS / BPC: Foto do RG ou CNH, comprovante de endereço e extrato do benefício.
   - Servidor Público: RG/CNH, comprovante de residência e último contracheque.
   - CLT (Crédito em Folha): RG/CNH, comprovante de endereço e último holerite.
   - Conta de Luz: RG/CNH e a foto da última conta de energia em dia no seu nome.
   - Portabilidade: RG/CNH e o extrato de empréstimos com o saldo devedor.
   Se perguntarem no geral, diga que é super simples e pergunte qual é o perfil (FGTS, INSS, CLT ou Conta de Luz) para passar a listinha exata.`;

    // Se temos provedores no pool, balanceia a carga e faz rotação com failover instantâneo
    if (pool.length > 0) {
      const offset = Math.floor(Math.random() * pool.length);
      const candidates = [...pool.slice(offset), ...pool.slice(0, offset)];

      for (const candidate of candidates) {
        if (candidate.type === "gemini") {
          const result = await callGemini(candidate.key, systemInstruction, history, message);
          if ("text" in result && result.text) {
            const cleanText = sanitizeBacenReply(result.text);
            let syncResult = null;
            if (clientPhone) {
              syncResult = await syncConversationToCrm(clientPhone, clientName, message, cleanText, false, empresaId);
            }
            return NextResponse.json({
              reply: cleanText,
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
            const cleanText = sanitizeBacenReply(result.text);
            let syncResult = null;
            if (clientPhone) {
              syncResult = await syncConversationToCrm(clientPhone, clientName, message, cleanText, false, empresaId);
            }
            return NextResponse.json({
              reply: cleanText,
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
    if (lowerMessage.includes("diaria") || lowerMessage.includes("diária")) {
      fallbackReply = `Não trabalhamos com empréstimo na diária, apenas crédito formal autorizado pelo Banco Central. Você trabalha de carteira assinada (CLT) com saldo no FGTS ou é servidor/aposentado?`;
    } else if (lowerMessage.includes("luz") || lowerMessage.includes("energia") || lowerMessage.includes("enel") || lowerMessage.includes("cpfl") || lowerMessage.includes("cemig")) {
      fallbackReply = `Fazemos empréstimo debitado na conta de luz sem consulta ao SPC! A conta está no seu nome e paga em dia? Se tiver saldo no FGTS, podemos fazer os dois juntos!`;
    } else if (lowerMessage.includes("clt") || lowerMessage.includes("carteira assinada") || lowerMessage.includes("empresa privada")) {
      fallbackReply = `Para CLT temos a liberação dupla: antecipação do FGTS no PIX (sem mexer no seu salário e aprova negativado) + empréstimo em folha ou conta de luz para dobrar o dinheiro! Gostaria de consultar?`;
    } else if (lowerMessage.includes("siape") || lowerMessage.includes("federal")) {
      fallbackReply = `Atendemos servidores federais (SIAPE) com as menores taxas do mercado no consignado em folha. Gostaria de consultar sua margem disponível hoje?`;
    } else if (lowerMessage.includes("prefeitura") || lowerMessage.includes("municip") || lowerMessage.includes("estado") || lowerMessage.includes("estadual")) {
      fallbackReply = `Atendemos servidores públicos estaduais e municipais com margem consignável. Deseja que o nosso especialista verifique as condições oficiais para você?`;
    } else if (lowerMessage.includes("documento") || lowerMessage.includes("documentos") || lowerMessage.includes("doc") || lowerMessage.includes("o que precisa") || lowerMessage.includes("quais papeis") || lowerMessage.includes("papelada")) {
      fallbackReply = `É tudo 100% digital pelo celular, sem papelada! No geral só precisa de RG/CNH e comprovante. Para qual opção você quer consultar (FGTS, INSS, CLT ou Conta de Luz)?`;
    } else if (lowerMessage.includes("golpe") || lowerMessage.includes("seguro") || lowerMessage.includes("confiavel") || lowerMessage.includes("confiável") || lowerMessage.includes("taxa antecipada") || lowerMessage.includes("depósito")) {
      fallbackReply = `Não cobramos nenhuma taxa antecipada. A contratação é 100% digital e o crédito cai direto na sua conta bancária. Posso fazer uma simulação gratuita para você?`;
    } else if (lowerMessage.includes("taxa") || lowerMessage.includes("juros") || lowerMessage.includes("quanto fica") || lowerMessage.includes("valor da parcela") || lowerMessage.includes("quanto pago")) {
      fallbackReply = `As taxas dependem da consulta oficial da sua margem no banco. Gostaria que nosso consultor fizesse uma simulação gratuita e exata para você agora?`;
    } else if (lowerMessage.includes("fgts") || lowerMessage.includes("aniversario") || lowerMessage.includes("aniversário")) {
      fallbackReply = `Antecipamos seu Saque-Aniversário do FGTS com liberação rápida no PIX e sem consulta ao SPC. Quer verificar quanto libera para você?`;
    } else if (lowerMessage.includes("portabilidade") || lowerMessage.includes("troco") || lowerMessage.includes("reduzir")) {
      fallbackReply = `Com a portabilidade, reduzimos a taxa do seu contrato atual e liberamos troco em dinheiro na sua conta, mantendo sua parcela. Deseja consultar?`;
    } else if (lowerMessage.includes("inss") || lowerMessage.includes("bpc") || lowerMessage.includes("loas") || lowerMessage.includes("aposentado")) {
      fallbackReply = `Temos condições especiais de consignado para aposentados, pensionistas e BPC/LOAS. Gostaria de consultar sua margem hoje?`;
    } else {
      fallbackReply = `Olá! Sou a ${effectiveName} da ${effectiveCompany}. Você tem interesse em consultar opções de FGTS ou Consignado hoje?`;
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
