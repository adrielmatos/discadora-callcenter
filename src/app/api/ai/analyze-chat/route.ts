import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação obrigatória
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Autenticação obrigatória para análise de conversa com IA." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    // 2. Isolamento estrito de tenant (empresa_id derivado da identidade do usuário)
    // Apenas metadados administrados pelo servidor são confiáveis para autorização.
    let userEmpresaId = user.app_metadata?.empresa_id || null;
    if (!userEmpresaId && user.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
      userEmpresaId = op?.empresa_id;
    }

    const body = await req.json();
    const { clientPhone, clientName, messages, chatText } = body;

    // empresaId vindo do cliente nunca autoriza acesso a um tenant. O vínculo deve vir
    // de metadados server-managed ou do cadastro confiável em operadores_app.
    const targetEmpresaId = userEmpresaId || null;

    if (!targetEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa identificada para processamento da conversa." }, { status: 403 });
    }

    const rawName = (clientName || "").trim();
    let digits = String(clientPhone || "").replace(/\D/g, "");

    // Se o telefone estiver vazio ou com formato incompleto (ex: contato salvo por nome no WhatsApp)
    if (digits.length < 8) {
      const seed = rawName || "cliente_whatsapp";
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      const posHash = Math.abs(hash) % 90000000;
      digits = `55119${String(posHash).padStart(8, "0")}`;
    }

    const cleanPhone = digits;
    const cleanName = rawName || `Cliente WhatsApp (${cleanPhone.slice(-4)})`;

    // Concatena as mensagens para análise semântica
    let fullTranscript = "";
    if (Array.isArray(messages) && messages.length > 0) {
      fullTranscript = messages
        .map((m: any) => `${m.sender === "client" ? "Cliente" : "Atendente"}: ${m.text || ""}`)
        .join("\n");
    } else if (typeof chatText === "string" && chatText.trim().length > 0) {
      fullTranscript = chatText.trim();
    }

    if (!fullTranscript || fullTranscript.trim().length < 2) {
      fullTranscript = `Cliente ${cleanName} possui conversa aberta no WhatsApp com interesse em crédito ou simulação financeira.`;
    }

    // Busca credenciais no banco Supabase escopadas pela empresa
    const { data: config } = await supabase
      .from("app_configuracoes")
      .select("gemini_api_key, groq_api_key, empresa_nome")
      .eq("empresa_id", targetEmpresaId)
      .limit(1)
      .maybeSingle();

    const companyName = config?.empresa_nome || "A&K Soluções Financeiras";
    const apiKey = config?.gemini_api_key || process.env.GEMINI_API_KEY;

    let aiAnalysis = {
      produto: "FGTS Saque-Aniversário",
      temperatura: "Morno" as "Quente" | "Morno" | "Frio",
      resumo: "Cliente em prospecção com interesse em modalidades de crédito e antecipação.",
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
    if (!aiAnalysis.resumo || aiAnalysis.resumo.includes("em prospecção")) {
      const lower = fullTranscript.toLowerCase();
      if (lower.includes("fgts") || lower.includes("aniversario") || lower.includes("aniversário") || lower.includes("caixa") || lower.includes("saldo")) {
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
      } else if (lower.includes("quero") || lower.includes("simular") || lower.includes("liberar") || lower.includes("cpf")) {
        aiAnalysis.produto = "FGTS Saque-Aniversário";
        aiAnalysis.temperatura = "Quente";
        aiAnalysis.resumo = "Cliente pediu simulação de crédito ativa no WhatsApp.";
      }
    }

    // Sincroniza e insere/atualiza no CRM (Supabase) via RPC SECURITY DEFINER
    const targetEtapa = aiAnalysis.temperatura === "Quente" ? "Simulação" : "Interessado";
    const tabulacaoLabel = `[Mineração WhatsApp] ${aiAnalysis.temperatura}: ${aiAnalysis.produto}`;

    const { data: rpcResult, error: rpcError } = await supabase.rpc("sync_mined_lead", {
      p_client_phone: cleanPhone,
      p_client_name: cleanName,
      p_produto: aiAnalysis.produto,
      p_banco: aiAnalysis.banco_atual || "Banco Parceiro",
      p_margem: aiAnalysis.valor_ou_margem || "R$ 0,00",
      p_etapa: targetEtapa,
      p_tabulacao: tabulacaoLabel,
      p_resumo: aiAnalysis.resumo,
      p_sugestao: aiAnalysis.sugestao_abordagem,
      p_temperatura: aiAnalysis.temperatura,
      p_empresa_id: targetEmpresaId
    });

    if (rpcError || !rpcResult?.lead_id) {
      console.error("Falha ao persistir lead via sync_mined_lead:", rpcError || "RPC não retornou lead_id");
      return NextResponse.json(
        { error: "A análise foi concluída, mas não foi possível salvar o lead no CRM." },
        { status: 502 }
      );
    }

    const leadId: number | null = rpcResult.lead_id;

    return NextResponse.json({
      success: true,
      leadId,
      leadName: cleanName,
      leadPhone: cleanPhone,
      analysis: aiAnalysis,
      message: `Conversa com ${cleanName} analisada com sucesso! Lead salvo no CRM como [${aiAnalysis.temperatura} - ${aiAnalysis.produto}].`
    });

  } catch (error: any) {
    console.error("Erro na rota /api/ai/analyze-chat:", error);
    return NextResponse.json({ error: "Erro ao analisar conversa: " + error.message }, { status: 500 });
  }
}
