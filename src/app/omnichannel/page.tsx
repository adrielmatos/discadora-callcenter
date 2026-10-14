"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Save, CheckCircle2, Send, Smartphone, 
  ShieldCheck, Bot, Sparkles, User, Zap, RefreshCw, ArrowRight,
  Radio, AlertCircle, ExternalLink, Clock, Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  sender: "client" | "ai";
  text: string;
  timestamp: string;
}

export default function OmnichannelPage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "ia" | "simulator">("whatsapp");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // WhatsApp Config
  const [waMode, setWaMode] = useState<"web" | "api">("web");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [defaultMessage, setDefaultMessage] = useState(
    "Olá, [NOME]! Sou o Adriel da A&K Soluções Financeiras. Conforme conversamos, segue a sua simulação de crédito com margem de [VALOR] pelo banco [BANCO]. Ficou com alguma dúvida nas condições?"
  );

  // Teste de Disparo
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; waUrl?: string } | null>(null);

  // IA 24h Config (Sofia) & Motor LLM Gemini
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiName, setAiName] = useState("Sofia");
  const [aiTone, setAiTone] = useState<"consultivo" | "fechamento" | "formal">("consultivo");
  const [aiCompany, setAiCompany] = useState("A&K Soluções Financeiras");
  const [aiGreeting, setAiGreeting] = useState(
    "Olá! Sou a Sofia, especialista virtual da A&K Soluções Financeiras. Como posso te ajudar hoje a liberar ou simular seu crédito?"
  );
  const [aiKnowledge, setAiKnowledge] = useState(
    "A&K Soluções Financeiras trabalha com correspondência autorizada dos bancos Pan, Safra, BMG, C6, Facta e Daycoval. Produtos: Saque-aniversário FGTS (taxas a partir de 1,69% a.m., liberação via PIX em até 2 horas), Consignado INSS/BPC/LOAS (menor taxa do mercado, até 84 parcelas) e Portabilidade com Troco em dinheiro sem aumentar o valor da parcela atual. Nunca cobramos nenhum depósito adiantado. Contratos 100% digitais com biometria facial."
  );
  const [handoffTriggers, setHandoffTriggers] = useState(
    "falar com atendente, quero contratar, manda o contrato, fechar agora, falar com adriel, falar com humano"
  );

  // Simulador de Chat
  const [simMessages, setSimMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Olá! Sou a Sofia, especialista virtual da A&K Soluções Financeiras. Como posso te ajudar hoje a liberar ou simular seu crédito?",
      timestamp: "Agora"
    }
  ]);
  const [simInput, setSimInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Carrega configurações reais do Supabase (Eliminando localStorage)
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_configuracoes")
        .select(`
          wa_mode, wa_api_url, wa_api_token, wa_instance_name, wa_default_message,
          ai_enabled, ai_name, ai_tone, ai_greeting, ai_knowledge, ai_handoff_triggers,
          gemini_api_key, empresa_nome
        `)
        .eq("id", 1)
        .single();

      if (data && !error) {
        if (data.wa_mode) setWaMode(data.wa_mode as any);
        if (data.wa_api_url) setApiUrl(data.wa_api_url);
        if (data.wa_api_token) setApiToken(data.wa_api_token);
        if (data.wa_instance_name) setInstanceName(data.wa_instance_name);
        if (data.wa_default_message) setDefaultMessage(data.wa_default_message);

        if (data.gemini_api_key) setGeminiApiKey(data.gemini_api_key);
        if (data.ai_enabled !== undefined && data.ai_enabled !== null) setAiEnabled(data.ai_enabled);
        if (data.ai_name) setAiName(data.ai_name);
        if (data.ai_tone) setAiTone(data.ai_tone as any);
        if (data.ai_greeting) setAiGreeting(data.ai_greeting);
        if (data.ai_knowledge) setAiKnowledge(data.ai_knowledge);
        if (data.ai_handoff_triggers) setHandoffTriggers(data.ai_handoff_triggers);
        if (data.empresa_nome) setAiCompany(data.empresa_nome);
      }
    } catch (e) {
      console.error("Erro ao carregar configurações de omnichannel:", e);
    } finally {
      setLoading(false);
    }
  };

  // Salva no banco de dados Supabase
  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("app_configuracoes")
        .update({
          wa_mode: waMode,
          wa_api_url: apiUrl.trim(),
          wa_api_token: apiToken.trim(),
          wa_instance_name: instanceName.trim(),
          wa_default_message: defaultMessage,
          gemini_api_key: geminiApiKey.trim(),
          ai_enabled: aiEnabled,
          ai_name: aiName.trim(),
          ai_tone: aiTone,
          ai_greeting: aiGreeting,
          ai_knowledge: aiKnowledge,
          ai_handoff_triggers: handoffTriggers,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1);

      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        alert("Erro ao salvar parâmetros: " + error.message);
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  // Teste de disparo em tempo real
  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      alert("Digite um número com DDD para testar o envio.");
      return;
    }

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: testPhone.trim(),
          mensagem: "Olá! Esta é uma mensagem de teste enviada com sucesso da Discadora A&K Soluções Financeiras 🚀"
        })
      });

      const data = await res.json();

      if (data.method === "api") {
        setTestResult({
          success: true,
          message: "Sucesso! Mensagem disparada em segundo plano via WhatsApp API."
        });
      } else if (data.waUrl) {
        setTestResult({
          success: true,
          message: "Modo Nativo (Web): O link do WhatsApp foi gerado com sucesso. Clique no botão abaixo para abrir a conversa.",
          waUrl: data.waUrl
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Falha ao enviar mensagem de teste."
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: "Erro na comunicação: " + e.message
      });
    } finally {
      setTestSending(false);
    }
  };

  // Motor Real do Atendente IA 24h conectado à rota /api/ai/chat
  const handleSimSend = async () => {
    if (!simInput.trim() || isTyping) return;

    const userText = simInput.trim();
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "client",
      text: userText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setSimMessages(prev => [...prev, newMsg]);
    setSimInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: simMessages,
          knowledge: aiKnowledge,
          company: aiCompany,
          agentName: aiName,
          handoffTriggers: handoffTriggers
        })
      });

      const data = await res.json();
      const reply = data.reply || "Olá! Como posso te ajudar hoje a simular ou liberar seu crédito?";

      setSimMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } catch (err: any) {
      console.error("Erro na resposta da IA:", err);
      setSimMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "Desculpe, tive uma oscilação temporária na conexão. Pode repetir sua dúvida?",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsTyping(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Omnichannel & Atendente IA 24h</h1>
          <p className="text-slate-500 text-xs mt-0.5">Gestão de WhatsApp, Atendente Virtual Autônomo e Handoff Inteligente • A&K Soluções</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Navegação entre Abas */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                activeTab === "whatsapp" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone size={13} />
              <span>WhatsApp & Disparos</span>
            </button>
            <button
              onClick={() => setActiveTab("ia")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                activeTab === "ia" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bot size={13} />
              <span>Atendente IA 24h (Config)</span>
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                activeTab === "simulator" ? "bg-white text-emerald-600 shadow-xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles size={13} className="text-emerald-500" />
              <span>Simulador de Atendimento</span>
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{loading ? "Carregando..." : "Salvar Configurações"}</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Parâmetros de atendimento salvos com sucesso no Supabase!</span>
            </div>
          )}

          {/* ABA 1: WHATSAPP & DISPAROS */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6">
              
              {/* Seletor de Modo */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Modo de Operação do WhatsApp</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Escolha se os operadores disparam usando o aplicativo nativo ou via servidor em nuvem.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setWaMode("web")}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      waMode === "web" ? "border-emerald-500 bg-emerald-50/40 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Smartphone className={waMode === "web" ? "text-emerald-600" : "text-slate-400"} size={20} />
                        <span className="text-xs font-black text-slate-900">WhatsApp Web / App Móvel (wa.me)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Abre a conversa no celular ou PC do operador com a mensagem e simulação pré-digitadas. 
                        <strong> Custo R$ 0,00 e zero risco de bloqueio.</strong>
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/60 self-start px-2 py-0.5 rounded-md">
                      Padrão Imediato
                    </span>
                  </div>

                  <div 
                    onClick={() => setWaMode("api")}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      waMode === "api" ? "border-blue-500 bg-blue-50/40 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Send className={waMode === "api" ? "text-blue-600" : "text-slate-400"} size={20} />
                        <span className="text-xs font-black text-slate-900">Gateway API Automático (Em Nuvem)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Dispara mensagens em segundo plano sem abrir nenhuma janela (compatível com <strong>Evolution API, Z-API ou Meta Cloud API</strong>).
                      </p>
                    </div>
                    <span className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/60 self-start px-2 py-0.5 rounded-md">
                      Alta Escala
                    </span>
                  </div>
                </div>
              </div>

              {/* Configuração de Gateway caso escolha API */}
              {waMode === "api" && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Credenciais da API de WhatsApp</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Informe os dados da sua instância do Evolution API ou Z-API.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">URL Base da API (Endpoint):</label>
                      <input 
                        type="text" 
                        placeholder="Ex: https://api.meuservidor.com ou https://api.z-api.io"
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                        className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Nome da Instância (Instance):</label>
                        <input 
                          type="text" 
                          placeholder="Ex: ak-matriz ou 3C32..."
                          value={instanceName}
                          onChange={e => setInstanceName(e.target.value)}
                          className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">API Key / Token de Acesso:</label>
                        <input 
                          type="password" 
                          placeholder="••••••••••••••••••••"
                          value={apiToken}
                          onChange={e => setApiToken(e.target.value)}
                          className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem Padrão de Simulação */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900">Template da Mensagem de Simulação</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tags Dinâmicas</span>
                </div>
                <p className="text-xs text-slate-500">Este é o texto que o botão do WhatsApp na tela da discadora carrega de forma automática.</p>
                
                <textarea 
                  value={defaultMessage}
                  onChange={e => setDefaultMessage(e.target.value)}
                  className="w-full border border-slate-200 p-3.5 rounded-xl text-xs h-28 outline-none focus:border-blue-500 text-slate-800 leading-relaxed font-sans"
                />
                
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <span>Variáveis substituídas na hora:</span>
                  <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">[NOME]</span>
                  <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">[BANCO]</span>
                  <span className="bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">[VALOR]</span>
                </div>
              </div>

              {/* Teste de Disparo em Tempo Real */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Send size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Testar Disparo de Mensagem</h3>
                    <p className="text-[11px] text-slate-500">Envie uma mensagem de teste para o seu próprio celular para verificar o canal.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Seu telefone com DDD (Ex: 71999998888)"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="flex-1 border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={testSending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {testSending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{testSending ? "Enviando..." : "Testar Disparo"}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl text-xs font-medium border space-y-2 animate-in fade-in ${
                    testResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      {testResult.success ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
                      <span>{testResult.message}</span>
                    </div>

                    {testResult.waUrl && (
                      <a
                        href={testResult.waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        <ExternalLink size={13} />
                        <span>Abrir Conversa no WhatsApp</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ABA 2: ATENDENTE VIRTUAL IA 24H (CONFIGURAÇÃO) */}
          {activeTab === "ia" && (
            <div className="space-y-6">
              
              {/* Toggle de Ativação */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shrink-0">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Atendente Virtual IA 24/7 Ativo</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Responde clientes de forma inteligente à noite, fins de semana ou quando todos os operadores estiverem ocupados.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={aiEnabled} 
                    onChange={e => setAiEnabled(e.target.checked)} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Conector Motor LLM Real (Google Gemini 1.5/2.0 Flash) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Motor de Inteligência Artificial Real (LLM)</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Alimenta a Sofia com IA generativa real do Google (respostas inteligentes e consultivas a Custo R$ 0,00).
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    geminiApiKey ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>
                    {geminiApiKey ? "🟢 Gemini Conectado" : "🟡 Modo Regras Locais"}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Chave de API do Google Gemini (AI Studio):</label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      <span>Gerar Chave Grátis no Google</span>
                    </a>
                  </div>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-mono outline-none focus:border-blue-500 bg-slate-50/50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    A cota gratuita do Google AI Studio oferece até 15 requisições por minuto com custo zero, ideal para atender centenas de clientes sem mensalidade.
                  </p>
                </div>
              </div>

              {/* Personalidade & Identidade */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Identidade & Tom de Voz da IA</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Atendente Virtual:</label>
                    <input 
                      type="text" 
                      value={aiName}
                      onChange={e => setAiName(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Empresa Representada:</label>
                    <input 
                      type="text" 
                      value={aiCompany}
                      onChange={e => setAiCompany(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Estilo de Conversação:</label>
                    <select 
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value as any)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none font-semibold text-slate-700 bg-white"
                    >
                      <option value="consultivo">Consultivo & Acolhedor (Melhor Conversão)</option>
                      <option value="fechamento">Focado em Fechamento & Rapidez</option>
                      <option value="formal">Formal & Institucional Bancário</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Mensagem Inicial de Saudação:</label>
                  <input 
                    type="text" 
                    value={aiGreeting}
                    onChange={e => setAiGreeting(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Base de Conhecimento e Quebra de Objeções */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Base de Conhecimento & Regras de Crédito</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tudo o que a IA precisa saber sobre os produtos, prazos e bancos parceiros.</p>
                </div>

                <textarea 
                  value={aiKnowledge}
                  onChange={e => setAiKnowledge(e.target.value)}
                  className="w-full border border-slate-200 p-3.5 rounded-xl text-xs h-32 outline-none focus:border-blue-500 leading-relaxed font-sans"
                />

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Gatilhos de Transbordo Humano (Handoff):</label>
                  <input 
                    type="text" 
                    value={handoffTriggers}
                    onChange={e => setHandoffTriggers(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Palavras-chave separadas por vírgula que fazem a IA chamar um operador humano imediatamente.</p>
                </div>
              </div>

            </div>
          )}

          {/* ABA 3: SIMULADOR DE ATENDIMENTO */}
          {activeTab === "simulator" && (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[560px]">
              
              {/* Header do Chat */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white relative">
                    <Bot size={20} />
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute bottom-0 right-0 border-2 border-slate-900"></span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <span>{aiName}</span>
                      <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full">IA Oficial A&K</span>
                    </h3>
                    <p className="text-[11px] text-slate-300">Simulação interativa em tempo real</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSimMessages([{
                    id: "1",
                    sender: "ai",
                    text: aiGreeting,
                    timestamp: "Agora"
                  }])}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                  title="Reiniciar chat de teste"
                >
                  <RefreshCw size={12} />
                  <span>Reiniciar</span>
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/50">
                {simMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      msg.sender === "client" 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-none"
                    }`}>
                      <p>{msg.text}</p>
                      <span className={`text-[9px] block text-right mt-1.5 ${
                        msg.sender === "client" ? "text-blue-200" : "text-slate-400"
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input do Chat */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Simule a mensagem de um cliente (Ex: Tem FGTS? É golpe? Quero fechar)..."
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSimSend()}
                  className="flex-1 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleSimSend}
                  disabled={!simInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Send size={13} />
                  <span>Enviar</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
