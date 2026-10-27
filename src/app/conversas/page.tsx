"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import {
  MessageSquare, Send, Phone, UserCheck, Bot, Clock, Search,
  CheckCheck, ArrowRight, ShieldCheck, Sparkles, Filter, 
  ExternalLink, PhoneCall, RefreshCw, Zap, FileText, CheckCircle2,
  AlertCircle, ChevronRight, User, Hash, DollarSign
} from "lucide-react";

interface LeadConversation {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string;
  saldo_fgts?: number;
  margem_disponivel?: number;
  etapa_crm: string;
  status: string;
  origem?: string;
  observacoes?: string;
  created_at: string;
  updated_at?: string;
}

interface ChatMsg {
  id: string;
  sender: "client" | "operator" | "sofia";
  text: string;
  time: string;
}

const QUICK_REPLIES = [
  {
    label: "📱 App FGTS Caixa",
    shortcut: "/fgts",
    text: "Para consultar e autorizar sua antecipação, abra o aplicativo FGTS no seu celular, vá em 'Autorizar bancos a consultarem seu saldo' e selecione os bancos parceiros. Me avise assim que autorizar!"
  },
  {
    label: "📄 Pedir Documento",
    shortcut: "/documento",
    text: "Por gentileza, envie uma foto nítida da frente e do verso do seu RG ou CNH aberta, e confirme sua chave PIX para a transferência."
  },
  {
    label: "🚀 Link Formalização",
    shortcut: "/formalizar",
    text: "Perfeito! Sua proposta foi gerada com sucesso. Acesse o link oficial do banco parceiro para fazer o reconhecimento facial e assinatura digital. É rápido e seguro!"
  },
  {
    label: "💰 Confirmação PIX",
    shortcut: "/pix",
    text: "Contrato assinado com sucesso! O valor será creditado na sua conta bancária via PIX em até 30 minutos. Parabéns pela contratação!"
  }
];

export default function ConversasPage() {
  const [leads, setLeads] = useState<LeadConversation[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadConversation | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"todos" | "ura" | "minerados" | "atendimento">("todos");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isBotActive, setIsBotActive] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Busca inicial de leads com conversas
  useEffect(() => {
    fetchLeads();

    // Listener Realtime no Supabase para atualizar a lista quando novos leads ou URA chegarem
    const channel = supabase
      .channel("conversas_leads_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rola para a mensagem mais recente
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("id, nome, telefone, cpf, saldo_fgts, margem_disponivel, etapa_crm, status, origem, observacoes, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (data && data.length > 0) {
      setLeads(data);
      if (!selectedLead) {
        selectAndLoadChat(data[0]);
      }
    }
    setLoading(false);
  };

  const selectAndLoadChat = (lead: LeadConversation) => {
    setSelectedLead(lead);

    // Constrói histórico contextual com base na origem do lead
    const initialHistory: ChatMsg[] = [];
    const leadTime = new Date(lead.created_at || Date.now()).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    if (lead.origem === "ura_reversa") {
      initialHistory.push({
        id: "ura-1",
        sender: "client",
        text: "📞 [Ligação Telefônica] Cliente digitou 1 confirmando interesse na URA Reversa.",
        time: leadTime
      });
      initialHistory.push({
        id: "ura-2",
        sender: "sofia",
        text: `Olá, ${lead.nome.split(" ")[0]}! Sou a Sofia da A&K Soluções Financeiras 🚀\nVi que você confirmou interesse pelo telefone na simulação de crédito FGTS/Consignado! Já consultei as melhores condições para liberar no seu PIX hoje. Quer que eu faça seu cálculo agora?`,
        time: leadTime
      });
    } else if (lead.origem === "whatsapp_minerado" || lead.origem === "whatsapp") {
      initialHistory.push({
        id: "min-1",
        sender: "client",
        text: lead.observacoes ? lead.observacoes.slice(0, 150) : "Olá, vi a postagem sobre antecipação de FGTS e gostaria de saber mais.",
        time: leadTime
      });
      initialHistory.push({
        id: "min-2",
        sender: "sofia",
        text: `Olá! Sou a Sofia da A&K Soluções. Vi sua dúvida sobre crédito FGTS e estou aqui para te ajudar a liberar o dinheiro no PIX ainda hoje sem burocracia!`,
        time: leadTime
      });
    } else {
      initialHistory.push({
        id: "std-1",
        sender: "sofia",
        text: `Olá, ${lead.nome}! Sou a Sofia da A&K Soluções. Como posso te ajudar hoje com a simulação do seu crédito ou saque FGTS?`,
        time: leadTime
      });
    }

    setMessages(initialHistory);
    setIsBotActive(true);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedLead) return;

    const newMsg: ChatMsg = {
      id: String(Date.now()),
      sender: "operator",
      text: text.trim(),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setSending(true);

    try {
      // Envia via API de WhatsApp do sistema
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: selectedLead.telefone,
          mensagem: text.trim(),
          lead_id: selectedLead.id
        })
      });

      // Ao operador assumir e enviar manualmente, desativa a resposta automática da Sofia
      setIsBotActive(false);

      logAuditEvent({
        action: "CHAT_MESSAGE_SENT",
        resource: "leads",
        resourceId: String(selectedLead.id),
        metadata: {
          destinatario: selectedLead.telefone,
          tamanho: text.length
        }
      });
    } catch (e) {
      console.error("Erro ao enviar mensagem:", e);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = () => {
    setIsBotActive(!isBotActive);
  };

  const handleUpdateLeadEtapa = async (novaEtapa: string) => {
    if (!selectedLead) return;
    const { error } = await supabase
      .from("leads")
      .update({ etapa_crm: novaEtapa, updated_at: new Date().toISOString() })
      .eq("id", selectedLead.id);

    if (!error) {
      setSelectedLead(prev => prev ? { ...prev, etapa_crm: novaEtapa } : null);
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, etapa_crm: novaEtapa } : l));
    }
  };

  // Filtros
  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchTerm ||
      l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.telefone.includes(searchTerm) ||
      (l.cpf && l.cpf.includes(searchTerm));

    if (!matchesSearch) return false;

    if (filterType === "ura") return l.origem === "ura_reversa";
    if (filterType === "minerados") return l.origem === "whatsapp_minerado" || l.origem === "whatsapp";
    if (filterType === "atendimento") return l.etapa_crm === "qualificado" || l.etapa_crm === "proposta";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070b14] text-slate-100 font-sans overflow-hidden">
      {/* Header Superior da Caixa de Entrada */}
      <header className="px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight">Caixa de Atendimento WhatsApp</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multiatendente • Ao Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gerencie conversas da Sofia AI, leads minerados e confirmações da URA Reversa em tela única.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLeads}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* Grid Principal de 3 Colunas (Lista | Chat | Dados do Lead) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Coluna 1: Lista de Conversas (Esquerda) */}
        <aside className="w-80 border-r border-slate-800/80 bg-slate-950/40 flex flex-col shrink-0">
          {/* Busca e Filtros */}
          <div className="p-3 border-b border-slate-800/80 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou CPF..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              <button
                onClick={() => setFilterType("todos")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filterType === "todos" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Todas ({leads.length})
              </button>
              <button
                onClick={() => setFilterType("ura")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filterType === "ura" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                🔥 URA (1)
              </button>
              <button
                onClick={() => setFilterType("minerados")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  filterType === "minerados" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-slate-400 hover:text-white"
                }`}
              >
                Grupos
              </button>
            </div>
          </div>

          {/* Lista de Contatos */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {filteredLeads.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhum lead encontrado com o filtro selecionado.
              </div>
            ) : (
              filteredLeads.map(lead => {
                const isSelected = selectedLead?.id === lead.id;
                const isUra = lead.origem === "ura_reversa";

                return (
                  <div
                    key={lead.id}
                    onClick={() => selectAndLoadChat(lead)}
                    className={`p-3.5 transition cursor-pointer flex items-start space-x-3 select-none ${
                      isSelected 
                        ? "bg-slate-800/80 border-l-4 border-emerald-500" 
                        : "hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-extrabold text-xs shrink-0 border border-slate-700">
                      {lead.nome.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{lead.nome}</h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(lead.updated_at || lead.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{lead.telefone}</p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        {isUra && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🔥 URA DTMF 1
                          </span>
                        )}
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {lead.etapa_crm.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Coluna 2: Chat Ativo Central (Estilo WhatsApp) */}
        <main className="flex-1 flex flex-col bg-[#080d1a] relative">
          {selectedLead ? (
            <>
              {/* Header do Chat */}
              <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/70 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-xs">
                    {selectedLead.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-white">{selectedLead.nome}</h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      WhatsApp: {selectedLead.telefone} • {isBotActive ? "🤖 Sofia AI Respondendo" : "👤 Operador em Controle"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleBot}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      isBotActive 
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20" 
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                    title={isBotActive ? "Pausar robô para você assumir" : "Reativar Sofia para responder automaticamente"}
                  >
                    {isBotActive ? <User size={13} /> : <Bot size={13} />}
                    <span>{isBotActive ? "Assumir Conversa" : "Ativar Sofia"}</span>
                  </button>

                  <a
                    href={`tel:${selectedLead.telefone}`}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
                    title="Ligar pelo Chip do Celular"
                  >
                    <Phone size={14} />
                  </a>
                </div>
              </div>

              {/* Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                {messages.map(msg => {
                  const isClient = msg.sender === "client";
                  const isSofia = msg.sender === "sofia";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClient ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-md whitespace-pre-wrap ${
                          isClient
                            ? "bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/60"
                            : isSofia
                            ? "bg-emerald-950/80 text-emerald-100 border border-emerald-500/30 rounded-tr-xs"
                            : "bg-blue-600 text-white rounded-tr-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold opacity-75 mb-1 pb-0.5 border-b border-white/10 gap-2">
                          <span>{isClient ? selectedLead.nome.split(" ")[0] : isSofia ? "🤖 Sofia (IA)" : "👤 Você (Operador)"}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Barra de Respostas Rápidas */}
              <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Zap size={11} className="text-amber-400" /> Respostas Rápidas:
                </span>
                {QUICK_REPLIES.map(q => (
                  <button
                    key={q.shortcut}
                    onClick={() => handleSendMessage(q.text)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition whitespace-nowrap cursor-pointer border border-slate-700"
                    title={q.text}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Input de Envio */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Digite sua mensagem para o cliente (ou clique em uma resposta rápida acima)..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={sending || !inputText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Send size={14} />
                  <span>{sending ? "Enviando..." : "Enviar"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare size={48} className="text-slate-700 mb-3" />
              <p className="text-sm font-semibold">Selecione uma conversa à esquerda para atender</p>
            </div>
          )}
        </main>

        {/* Coluna 3: Ficha Lateral do Lead (Direita) */}
        {selectedLead && (
          <aside className="w-72 border-l border-slate-800/80 bg-slate-950/60 p-4 flex flex-col space-y-4 overflow-y-auto shrink-0">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Informações do Cliente</p>
              <h3 className="text-sm font-extrabold text-white">{selectedLead.nome}</h3>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">{selectedLead.telefone}</p>
            </div>

            <div className="space-y-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-medium">CPF:</span>
                <span className="font-bold text-slate-200">{selectedLead.cpf || "Não informado"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-medium">Saldo FGTS:</span>
                <span className="font-bold text-emerald-400">
                  {selectedLead.saldo_fgts ? `R$ ${Number(selectedLead.saldo_fgts).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A consultar"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-medium">Origem:</span>
                <span className="font-bold text-amber-400">
                  {selectedLead.origem === "ura_reversa" ? "🔥 URA Reversa" : selectedLead.origem === "whatsapp_minerado" ? "Grupos WhatsApp" : "Base Direta"}
                </span>
              </div>
            </div>

            {/* Mover Etapa do CRM */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Etapa do Funil</p>
              <select
                value={selectedLead.etapa_crm}
                onChange={e => handleUpdateLeadEtapa(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
              >
                <option value="novo">Novo Lead</option>
                <option value="qualificado">Qualificado / Simulado</option>
                <option value="proposta">Proposta Enviada</option>
                <option value="aguardando_anuencia">Aguardando Assinatura</option>
                <option value="pago">Contrato Concluído / Pago</option>
                <option value="descartado">Sem Interesse / Descartado</option>
              </select>
            </div>

            {/* Ações de Discagem Rápida */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <a
                href={`tel:${selectedLead.telefone}`}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-lg shadow-blue-500/20"
              >
                <Phone size={14} />
                <span>Ligar pelo Chip Celular</span>
              </a>

              <a
                href={`/dialer?phone=${selectedLead.telefone}&name=${encodeURIComponent(selectedLead.nome)}`}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
              >
                <PhoneCall size={14} />
                <span>Abrir no Softphone</span>
              </a>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
