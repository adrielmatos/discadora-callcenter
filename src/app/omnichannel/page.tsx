"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Save, CheckCircle2, Send, Smartphone, 
  ShieldCheck, Bot, Sparkles, User, Zap, RefreshCw, ArrowRight 
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "client" | "ai";
  text: string;
  timestamp: string;
}

export default function OmnichannelPage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "ia" | "simulator">("whatsapp");
  
  // WhatsApp Config
  const [waMode, setWaMode] = useState<"web" | "api">("web");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [defaultMessage, setDefaultMessage] = useState(
    "Olá, [NOME]! Sou o Adriel da A&K Soluções Financeiras. Conforme conversamos, segue a sua simulação de crédito com margem de [VALOR] pelo banco [BANCO]. Ficou com alguma dúvida nas condições?"
  );

  // IA 24h Config (Atendente24h & Viver de IA)
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

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("ak_omnichannel_config");
    if (savedConfig) {
      try {
        const c = JSON.parse(savedConfig);
        if (c.waMode) setWaMode(c.waMode);
        if (c.apiUrl) setApiUrl(c.apiUrl);
        if (c.apiToken) setApiToken(c.apiToken);
        if (c.instanceName) setInstanceName(c.instanceName);
        if (c.defaultMessage) setDefaultMessage(c.defaultMessage);
        if (c.aiEnabled !== undefined) setAiEnabled(c.aiEnabled);
        if (c.aiName) setAiName(c.aiName);
        if (c.aiTone) setAiTone(c.aiTone);
        if (c.aiGreeting) setAiGreeting(c.aiGreeting);
        if (c.aiKnowledge) setAiKnowledge(c.aiKnowledge);
        if (c.handoffTriggers) setHandoffTriggers(c.handoffTriggers);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ak_omnichannel_config", JSON.stringify({
      waMode,
      apiUrl,
      apiToken,
      instanceName,
      defaultMessage,
      aiEnabled,
      aiName,
      aiTone,
      aiGreeting,
      aiKnowledge,
      handoffTriggers
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Motor Simulado do Atendente IA 24h
  const handleSimSend = () => {
    if (!simInput.trim()) return;

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

    // Resposta Inteligente da IA baseada na base de conhecimento
    setTimeout(() => {
      const lower = userText.toLowerCase();
      let reply = "";

      const triggers = handoffTriggers.split(",").map(t => t.trim().toLowerCase());
      const shouldHandoff = triggers.some(t => t && lower.includes(t));

      if (shouldHandoff) {
        reply = `Perfeito! Já transferi seu atendimento para o nosso especialista humano Adriel. Ele já tem o seu histórico e vai falar com você aqui em instantes para concluir a formalização! 🚀`;
      } else if (lower.includes("golpe") || lower.includes("seguro") || lower.includes("confiavel") || lower.includes("confiável")) {
        reply = `Compreendo sua cautela! Na ${aiCompany} operamos como correspondente credenciado aos bancos oficiais. Nós NUNCA cobramos taxas antecipadas nem pedimos senhas. Todo o processo é validado diretamente com biometria facial no app do banco.`;
      } else if (lower.includes("fgts") || lower.includes("aniversario") || lower.includes("aniversário")) {
        reply = `Sim! Fazemos a antecipação de até 10 anos do seu Saque-Aniversário FGTS. A taxa é a partir de 1,69% ao mês e o dinheiro cai via PIX na sua conta em até 2 horas. Gostaria que eu faça uma simulação do seu saldo?`;
      } else if (lower.includes("portabilidade") || lower.includes("troco") || lower.includes("reduzir")) {
        reply = `Excelente! Com a Portabilidade com Troco, transferimos sua dívida para um banco parceiro (como Pan ou Safra) com taxa menor e liberamos a diferença como troco em dinheiro direto na sua conta, sem aumentar o valor da sua parcela!`;
      } else if (lower.includes("inss") || lower.includes("bpc") || lower.includes("loas") || lower.includes("aposentado")) {
        reply = `Atendemos aposentados, pensionistas e beneficiários BPC/LOAS com a menor taxa de consignado do Brasil e parcelamento em até 84 vezes sem consulta ao SPC/Serasa. Você já sabe qual a sua margem disponível?`;
      } else {
        reply = `Entendi perfeitamente! Para que eu possa te passar os números exatos e a melhor proposta liberada hoje pelos bancos conveniados, qual o seu CPF ou qual produto (FGTS ou Consignado) você tem interesse em consultar?`;
      }

      setSimMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      setIsTyping(false);
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
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
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Save size={14} />
            <span>Salvar</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Parâmetros de atendimento salvos com sucesso!</span>
            </div>
          )}

          {/* ABA 1: WHATSAPP & DISPAROS */}
          {activeTab === "whatsapp" && (
            <div className="space-y-5">
              {/* Seletor de Modo */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Modo de Envio do WhatsApp</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setWaMode("web")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      waMode === "web" ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Smartphone className={waMode === "web" ? "text-emerald-600" : "text-slate-400"} size={18} />
                      <span className="text-xs font-bold text-slate-800">WhatsApp Web / App (Nativo)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Abre a conversa direto no WhatsApp do seu PC ou celular com o texto pronto. <strong>Zero custo e zero risco de bloqueio.</strong>
                    </p>
                  </div>

                  <div 
                    onClick={() => setWaMode("api")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      waMode === "api" ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Send className={waMode === "api" ? "text-blue-600" : "text-slate-400"} size={18} />
                      <span className="text-xs font-bold text-slate-800">Gateway API Automático</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Disparo em segundo plano via servidor próprio (Evolution API, Z-API ou Baileys).
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuração de Gateway caso escolha API */}
              {waMode === "api" && (
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3.5">
                  <h3 className="text-sm font-bold text-slate-900">Credenciais da API de WhatsApp</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">URL da API (Endpoint):</label>
                      <input 
                        type="text" 
                        placeholder="https://api.seudominio.com.br"
                        value={apiUrl}
                        onChange={e => setApiUrl(e.target.value)}
                        className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Instância:</label>
                        <input 
                          type="text" 
                          placeholder="adriel-atendimento"
                          value={instanceName}
                          onChange={e => setInstanceName(e.target.value)}
                          className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">API Key / Token:</label>
                        <input 
                          type="password" 
                          placeholder="••••••••••••"
                          value={apiToken}
                          onChange={e => setApiToken(e.target.value)}
                          className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagem Padrão */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Mensagem Padrão de Simulação</h3>
                <p className="text-xs text-slate-500">Este é o texto que o botão do WhatsApp do discador carrega automaticamente.</p>
                
                <textarea 
                  value={defaultMessage}
                  onChange={e => setDefaultMessage(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-lg text-xs h-24 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">Variáveis disponíveis: <code>[NOME]</code>, <code>[BANCO]</code> e <code>[VALOR]</code>.</p>
              </div>
            </div>
          )}

          {/* ABA 2: ATENDENTE VIRTUAL IA 24H (CONFIGURAÇÃO) */}
          {activeTab === "ia" && (
            <div className="space-y-5">
              {/* Toggle de Ativação */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <Bot size={18} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Atendente Virtual IA 24/7 Ativo</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Permite responder leads automaticamente fora do horário comercial ou enquanto você estiver em chamada.
                  </p>
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

              {/* Personalidade do Agente */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Perfil & Tom de Voz da IA</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Especialista IA:</label>
                    <input 
                      type="text" 
                      value={aiName}
                      onChange={e => setAiName(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tom de Atendimento:</label>
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value as any)}
                      className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="consultivo">Consultivo & Empático (Recomendado)</option>
                      <option value="fechamento">Direto & Focado em Fechamento Rápido</option>
                      <option value="formal">Formal Bancário Tradicional</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Mensagem de Boas-Vindas da IA:</label>
                  <input 
                    type="text" 
                    value={aiGreeting}
                    onChange={e => setAiGreeting(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Base de Conhecimento Bancária (FAQ Treinado) */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Base de Conhecimento Bancária (FAQ)</h3>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Treinamento Ativo</span>
                </div>
                <p className="text-xs text-slate-500">
                  Descreva as taxas dos bancos parceiros (Pan, Safra, BMG, C6), prazos de liberação e regras para que a IA nunca alucine.
                </p>
                <textarea 
                  value={aiKnowledge}
                  onChange={e => setAiKnowledge(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-lg text-xs h-32 outline-none focus:border-blue-500 text-slate-800 leading-relaxed font-sans"
                />
              </div>

              {/* Gatilhos de Handoff (Transbordo Humano Inteligente) */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3">
                <div className="flex items-center space-x-2">
                  <Zap size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">Gatilhos de Transbordo (Handoff para Humano)</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Palavras-chave que fazem a IA parar de responder e acionar o operador Adriel imediatamente:
                </p>
                <input 
                  type="text" 
                  value={handoffTriggers}
                  onChange={e => setHandoffTriggers(e.target.value)}
                  placeholder="falar com atendente, quero contratar, manda o contrato"
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 block">Separe os termos por vírgula.</span>
              </div>
            </div>
          )}

          {/* ABA 3: SIMULADOR DE CHAT DA IA (TESTE AO VIVO) */}
          {activeTab === "simulator" && (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col h-[560px]">
              {/* Topo do Chat */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white relative">
                    <Bot size={20} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900"></span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{aiName} • Atendente Virtual 24h</h4>
                    <p className="text-[11px] text-emerald-400 font-medium">A&K Soluções Financeiras • Online</p>
                  </div>
                </div>

                <button
                  onClick={() => setSimMessages([{
                    id: "1",
                    sender: "ai",
                    text: aiGreeting,
                    timestamp: "Agora"
                  }])}
                  className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 bg-slate-800 px-2.5 py-1 rounded cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Reiniciar</span>
                </button>
              </div>

              {/* Mensagens */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#e5ddd5]/30">
                {simMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`flex ${msg.sender === "client" ? "justify-end" : "justify-start"}`}
                  >
                    <div 
                      className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed shadow-2xs ${
                        msg.sender === "client"
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-white text-slate-800 rounded-tl-none border border-slate-200/60"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className={`text-[9px] block text-right mt-1 ${msg.sender === "client" ? "text-emerald-100" : "text-slate-400"}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-500 italic flex items-center space-x-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span className="ml-1 text-[11px]">{aiName} está digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input de Teste */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0">
                <input 
                  type="text" 
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSimSend()}
                  placeholder="Envie uma mensagem como cliente (ex: 'Vocês fazem FGTS?', 'Quero falar com atendente')..."
                  className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSimSend}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
