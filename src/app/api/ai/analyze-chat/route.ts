import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { clientPhone, clientName, messages, chatText } = await req.json();

    if (!clientPhone) {
      return NextResponse.json({ error: "Telefone do cliente é obrigatório" }, { status: 400 });
    }

    const cleanPhone = String(clientPhone).replace(/\D/g, "");
    const cleanName = (clientName || "").trim() || `Cliente WhatsApp (${cleanPhone.slice(-4)})`;

    // Concatena as mensagens para análise
    let fullTranscript = "";
    if (Array.isArray(messages)) {
      fullTranscript = messages
        .map((m: any) => `${m.sender === "client" ? "Cliente" : "Atendente"}: ${m.text || ""}`)
        .join("\n");
    } else if (typeof chatText === "string") {
      fullTranscript = chatText;
    }

    if (!fullTranscript || fullTranscript.trim().length < 5) {
      return NextResponse.json({ error: "Histórico de conversa insuficiente para análise" }, { status: 400 });
    }

    // Busca credenciais no banco Supabase
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select("gemini_api_key, groq_api_key, empresa_nome")
      .limit(1)
      .maybeSingle();

    const companyName = config?.empresa_nome || "A&K Soluções Financeiras";
    const apiKey = config?.gemini_api_key || process.env.GEMINI_API_KEY;

    let aiAnalysis = {
      produto: "FGTS Saque-Aniversário",
      temperatura: "Morno" as "Quente" | "Morno" | "Frio",
      resumo: "Cliente demonstrou interesse em crédito no histórico anterior.",
      valor_ou_margem: "",
      banco_atual: "",
      sugestao_abordagem: "Retomar contato com mensagem cordial oferecendo nova simulação sem compromisso."
    };

    if (apiKey) {
      const prompt = `Você é um analista de crédito especialista em correspondente bancário da empresa ${companyName}.
Analise as mensagens trocadas anteriormente com este cliente no WhatsApp e identifique oportunidades de empréstimo (FGTS Saque-Aniversário, Consignado INSS/BPC/LOAS, Portabilidade com Troco).

Histórico da Conversa:
"""
${fullTranscript.slice(-3000)}
"""

Retorne ESTRITAMENTE um JSON válido com esta estrutura exata (sem formatação markdown extra, apenas o JSON puro):
{
  "produto": "FGTS Saque-Aniversário" ou "Consignado INSS" ou "Consignado BPC/LOAS" ou "Portabilidade com Troco" ou "Crédito Pessoal",
  "temperatura": "Quente" ou "Morno" ou "Frio",
  "resumo": "Resumo objetivo de 1 a 2 frases do que o cliente queria e por que a negociação não concluiu",
  "valor_ou_margem": "Valor ou margem citada pelo cliente (ou texto vazio se não houver)",
  "banco_atual": "Banco citado (ou texto vazio)",
  "sugestao_abordagem": "Frase prática e humanizada de abordagem para o operador reabrir o contato com o cliente hoje"
}`;

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiAnalysis = {
              produto: parsed.produto || aiAnalysis.produto,
              temperatura: (parsed.temperatura === "Quente" || parsed.temperatura === "Frio") ? parsed.temperatura : "Morno",
              resumo: parsed.resumo || aiAnalysis.resumo,
              valor_ou_margem: parsed.valor_ou_margem || "",
              banco_atual: parsed.banco_atual || "",
              sugestao_abordagem: parsed.sugestao_abordagem || aiAnalysis.sugestao_abordagem
            };
          }
        }
      } catch (aiErr) {
        console.warn("Erro ao consultar Gemini para mineração, aplicando regras heurísticas:", aiErr);
      }
    }

    // Heurística de fallback caso a IA não tenha retornado
    if (!aiAnalysis.resumo || aiAnalysis.resumo.includes("histórico anterior")) {
      const lower = fullTranscript.toLowerCase();
      if (lower.includes("fgts") || lower.includes("aniversario") || lower.includes("caixa") || lower.includes("saldo")) {
        aiAnalysis.produto = "FGTS Saque-Aniversário";
        aiAnalysis.temperatura = "Morno";
        aiAnalysis.resumo = "Cliente possui menções a saldo ou antecipação de Saque-Aniversário do FGTS.";
      } else if (lower.includes("inss") || lower.includes("beneficio") || lower.includes("benefício") || lower.includes("aposent")) {
        aiAnalysis.produto = "Consignado INSS";
        aiAnalysis.temperatura = "Morno";
        aiAnalysis.resumo = "Cliente mencionou benefício do INSS com margem para consignado.";
      } else if (lower.includes("portabilidade") || lower.includes("parcela") || lower.includes("troco")) {
        aiAnalysis.produto = "Portabilidade com Troco";
        aiAnalysis.temperatura = "Morno";
        aiAnalysis.resumo = "Cliente tem interesse em reduzir parcela ou liberar troco via portabilidade.";
      }
    }

    // Sincroniza e insere/atualiza no CRM (Supabase)
    const searchPhone = cleanPhone.slice(-8);
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id, nome, telefone, etapa_crm")
      .ilike("telefone", `%${searchPhone}%`)
      .limit(1);

    let leadId: number | null = null;
    const targetEtapa = aiAnalysis.temperatura === "Quente" ? "Simulação" : "Interessado";
    const tabulacaoLabel = `[Mineração WhatsApp] ${aiAnalysis.temperatura}: ${aiAnalysis.produto}`;

    if (existingLeads && existingLeads.length > 0) {
      leadId = existingLeads[0].id;
      await supabase
        .from("leads")
        .update({
          nome: cleanName,
          produto: aiAnalysis.produto,
          banco: aiAnalysis.banco_atual || undefined,
          margem_disponivel: aiAnalysis.valor_ou_margem || undefined,
          etapa_crm: targetEtapa,
          ultima_tabulacao: tabulacaoLabel,
          updated_at: new Date().toISOString()
        })
        .eq("id", leadId);
    } else {
      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          nome: cleanName,
          telefone: cleanPhone,
          produto: aiAnalysis.produto,
          banco: aiAnalysis.banco_atual || undefined,
          margem_disponivel: aiAnalysis.valor_ou_margem || undefined,
          status: "pendente",
          etapa_crm: targetEtapa,
          ultima_tabulacao: tabulacaoLabel
        })
        .select("id")
        .single();

      if (newLead) leadId = newLead.id;
    }

    if (leadId) {
      // Registra o diagnóstico na ficha do lead
      const note = `[Diagnóstico IA Sofia]: ${aiAnalysis.resumo} | Sugestão: ${aiAnalysis.sugestao_abordagem}`;
      await supabase.from("historico_ligacoes").insert({
        lead_id: leadId,
        tabulacao: note.slice(0, 450),
        duracao_segundos: 0
      });

      // Se for lead quente, coloca em retornos prioritários
      if (aiAnalysis.temperatura === "Quente") {
        await supabase.from("retornos").insert({
          lead_id: leadId,
          data_hora: new Date().toISOString(),
          observacao: `[Oportunidade Quente Resgatada] ${aiAnalysis.produto}: ${aiAnalysis.resumo}`.slice(0, 250),
          concluido: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      leadId,
      analysis: aiAnalysis,
      message: `Conversa analisada com sucesso! Lead classificado como ${aiAnalysis.temperatura} para ${aiAnalysis.produto}.`
    });

  } catch (error: any) {
    console.error("Erro na rota /api/ai/analyze-chat:", error);
    return NextResponse.json({ error: "Erro ao analisar conversa: " + error.message }, { status: 500 });
  }
}
