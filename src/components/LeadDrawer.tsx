"use client";

import React, { useState, useEffect } from "react";
import { 
  X, User, Phone, FileText, Building2, MapPin, 
  Calendar, Clock, MessageSquare, ArrowRight, CheckCircle2, 
  AlertCircle, DollarSign, Download, Printer, Sparkles, Send
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  produto?: string;
  status?: string;
  etapa_crm?: string;
  ultima_tabulacao?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  created_at?: string;
}

interface CallHistory {
  id: number;
  tabulacao: string;
  duracao_segundos: number;
  created_at: string;
}

interface LeadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onUpdateLead?: () => void;
}

export default function LeadDrawer({ isOpen, onClose, lead, onUpdateLead }: LeadDrawerProps) {
  const [activeTab, setActiveTab] = useState<"dados" | "sofia" | "historico" | "proposta">("dados");
  const [history, setHistory] = useState<CallHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (lead?.id && isOpen) {
      fetchHistory(lead.id);
    }
  }, [lead?.id, isOpen]);

  const fetchHistory = async (leadId: number) => {
    setLoadingHistory(true);
    const { data } = await supabase
      .from("historico_ligacoes")
      .select("id, tabulacao, duracao_segundos, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (data) setHistory(data);
    setLoadingHistory(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead?.id) return;
    setSavingNote(true);

    const { error } = await supabase.from("historico_ligacoes").insert({
      lead_id: lead.id,
      tabulacao: `Nota: ${newNote.trim()}`,
      duracao_segundos: 0
    });

    if (!error) {
      setNewNote("");
      fetchHistory(lead.id);
      if (onUpdateLead) onUpdateLead();
    }
    setSavingNote(false);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handlePrintProposal = () => {
    window.print();
  };

  if (!isOpen || !lead) return null;

  const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  const sofiaCall = history.find(h => h.tabulacao.includes("[Diagnóstico IA Sofia]") || h.tabulacao.includes("[Mineração WhatsApp]"));
  const isSofiaMined = Boolean(sofiaCall || lead.ultima_tabulacao?.includes("Mineração"));

  let aiResumo = "";
  let aiSugestao = "";
  let aiTemperatura = "Morno";

  if (sofiaCall) {
    const raw = sofiaCall.tabulacao;
    if (raw.includes("Quente")) aiTemperatura = "Quente";
    else if (raw.includes("Frio")) aiTemperatura = "Frio";
    
    const resumoMatch = raw.match(/\[Diagnóstico IA Sofia\]:\s*([^|]+)/);
    if (resumoMatch) aiResumo = resumoMatch[1].trim();
    
    const sugestaoMatch = raw.match(/Sugestão:\s*(.+)/);
    if (sugestaoMatch) aiSugestao = sugestaoMatch[1].trim();
  } else if (lead.ultima_tabulacao?.includes("Mineração")) {
    if (lead.ultima_tabulacao.includes("Quente")) aiTemperatura = "Quente";
    else if (lead.ultima_tabulacao.includes("Frio")) aiTemperatura = "Frio";
    aiResumo = `Lead resgatado pela Sofia no WhatsApp com interesse em ${lead.produto || "Crédito"}.`;
    aiSugestao = `Abordar oferecendo liberação rápida do ${lead.produto || "crédito"} via PIX no ${lead.banco || "banco parceiro"}.`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Painel Lateral Deslizante */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          
          {/* Header do Lead */}
          <div className="p-6 bg-slate-900 text-white flex items-start justify-between shrink-0">
            <div className="space-y-1.5 pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                  #{lead.id}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {lead.etapa_crm || lead.status || "Fila"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight leading-snug">
                {lead.nome}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>CPF: {lead.cpf || "Sem CPF cadastrado"}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Abas */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab("dados")}
              className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 ${
                activeTab === "dados"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Dados do Lead
            </button>
            <button
              onClick={() => setActiveTab("sofia")}
              className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "sofia"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles size={13} className={lead?.ultima_tabulacao?.includes("Mineração") ? "text-purple-600 animate-pulse" : "text-slate-400"} />
              <span>Inteligência Sofia AI</span>
              {lead?.ultima_tabulacao?.includes("Mineração") && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "historico"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Histórico de Chamadas</span>
              {history.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("proposta")}
              className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === "proposta"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Proposta Impressa
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* TAB 1: DADOS */}
            {activeTab === "dados" && (
              <div className="space-y-5">
                {/* Card de Oportunidade */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                      Produto em Andamento
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-blue-100">
                      {lead.banco || "Banco Parceiro"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-700">{lead.produto || "Consignado"}</span>
                    <span className="text-lg font-black text-emerald-600">{lead.margem_disponivel || "R$ 0,00"}</span>
                  </div>
                </div>

                {/* Dados de Contato */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contato & Localização</h3>
                  
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Telefone:</span>
                      <span className="font-mono font-bold text-slate-800">{lead.telefone}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">CEP:</span>
                      <span className="font-mono font-semibold text-slate-800">{lead.cep || "Não informado"}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Endereço:</span>
                      <span className="text-slate-800 font-medium text-right max-w-[200px] truncate">
                        {lead.endereco || "Não cadastrado"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Bairro / Cidade:</span>
                      <span className="text-slate-800 font-medium text-right">
                        {[lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(" - ") || "Não informado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nova Anotação Rápida */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">Adicionar Anotação / Observação:</label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Cliente pediu retorno amanhã às 15h para confirmar se o filho assina..."
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddNote}
                      disabled={savingNote || !newNote.trim()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Send size={12} />
                      <span>{savingNote ? "Salvando..." : "Salvar Anotação"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INTELIGÊNCIA SOFIA AI */}
            {activeTab === "sofia" && (
              <div className="space-y-4">
                {isSofiaMined ? (
                  <div className="space-y-4">
                    {/* Badge de Temperatura */}
                    <div className={`p-4 rounded-2xl border ${
                      aiTemperatura === "Quente"
                        ? "bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200"
                        : "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                    } space-y-2 shadow-xs`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs ${
                          aiTemperatura === "Quente" ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                        }`}>
                          <Sparkles size={12} className="animate-spin" />
                          <span>{aiTemperatura === "Quente" ? "🔥 Lead Quente (Alta Conversão)" : "🟡 Lead Morno"}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-bold">Mineração WhatsApp Web</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        A IA analisou as mensagens recentes deste cliente no WhatsApp e identificou interesse real em crédito.
                      </p>
                    </div>

                    {/* Dados Identificados pela IA */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Produto Identificado</span>
                        <p className="text-xs font-bold text-slate-800">{lead.produto || "Crédito"}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Margem / Saldo</span>
                        <p className="text-xs font-black text-emerald-600">{lead.margem_disponivel || "Sob Consulta"}</p>
                      </div>
                    </div>

                    {/* Resumo da Conversa no WhatsApp */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-blue-500" />
                        <span>Diagnóstico do Histórico no WhatsApp</span>
                      </h4>
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium italic">
                        "{aiResumo || "Cliente demonstrou interesse em crédito nas mensagens do WhatsApp."}"
                      </div>
                    </div>

                    {/* Roteiro / Pitch de Abordagem Sugerido */}
                    <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-purple-600" />
                          <span>Roteiro de Abordagem para o Operador</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiSugestao || `Olá ${lead.nome}, estou acompanhando sua simulação de crédito...`);
                            alert("Roteiro copiado para a área de transferência!");
                          }}
                          className="text-[10px] font-bold text-purple-700 bg-white hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <span>Copiar Script</span>
                        </button>
                      </div>

                      <div className="bg-white/95 p-3.5 rounded-xl border border-purple-100 text-xs text-slate-800 leading-relaxed font-medium shadow-xs">
                        {aiSugestao || `Olá ${lead.nome}, vi que você conversou conosco no WhatsApp sobre liberação de valores. Conseguimos pré-aprovar sua proposta para liberação hoje mesmo!`}
                      </div>

                      <div className="pt-1">
                        <a
                          href={`/dialer?phone=${cleanPhone}`}
                          className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <Phone size={13} />
                          <span>Ligar para ${lead.nome} no Discador</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 mx-auto flex items-center justify-center">
                      <Sparkles size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800">Sem Diagnóstico de WhatsApp</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                        Este lead ainda não passou pela mineração da Sofia no WhatsApp Web.
                      </p>
                    </div>
                    <div className="pt-2 text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                      Dica: Abra a conversa com este contato no WhatsApp Web e clique em <strong>[⚡ Minerar]</strong>. A Sofia gerará o diagnóstico e o script pronto de vendas aqui!
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HISTÓRICO DE LIGAÇÕES */}
            {activeTab === "historico" && (
              <div className="space-y-3">
                {loadingHistory ? (
                  <div className="py-8 text-center text-xs text-slate-400">Carregando histórico...</div>
                ) : history.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <Clock size={24} className="mx-auto text-slate-300" />
                    <p>Nenhuma ligação ou interação registrada para este lead ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {history.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{item.tabulacao}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.created_at).toLocaleString("pt-BR", { 
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
                            })}
                          </span>
                        </div>
                        {item.duracao_segundos > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock size={11} />
                            <span>Duração da chamada: {formatSeconds(item.duracao_segundos)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PROPOSTA TIMBRADA (STIRLING-PDF STYLE) */}
            {activeTab === "proposta" && (
              <div className="space-y-4">
                <div className="border border-slate-300 rounded-2xl p-6 bg-white shadow-xs space-y-4 print:p-0 print:border-none print:shadow-none">
                  {/* Cabeçalho da Proposta */}
                  <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">A&K SOLUÇÕES FINANCEIRAS</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Correspondente Bancário Autorizado</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Ref: #{lead.id}-{new Date().getFullYear()}
                    </span>
                  </div>

                  {/* Dados do Cliente */}
                  <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p><strong className="text-slate-700">Cliente:</strong> {lead.nome}</p>
                    <p><strong className="text-slate-700">CPF:</strong> {lead.cpf || "Pendente"}</p>
                    <p><strong className="text-slate-700">Telefone:</strong> {lead.telefone}</p>
                    <p><strong className="text-slate-700">Cidade/UF:</strong> {[lead.cidade, lead.uf].filter(Boolean).join(" - ") || "Brasil"}</p>
                  </div>

                  {/* Detalhes Financeiros */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="p-2.5">Banco</th>
                          <th className="p-2.5">Produto</th>
                          <th className="p-2.5 text-right">Margem / Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="p-2.5 font-semibold text-slate-800">{lead.banco || "Banco Parceiro"}</td>
                          <td className="p-2.5 text-slate-600">{lead.produto || "Consignado"}</td>
                          <td className="p-2.5 font-bold text-emerald-600 text-right">{lead.margem_disponivel || "Sob Consulta"}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Rodapé e Declaração */}
                  <div className="text-[10px] text-slate-400 space-y-1 leading-relaxed">
                    <p>• Proposta sujeita a análise cadastral e confirmação de biometria facial no app do banco.</p>
                    <p>• A A&K Soluções nunca solicita depósitos ou taxas antecipadas para liberação de crédito.</p>
                  </div>
                </div>

                <button
                  onClick={handlePrintProposal}
                  className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
              </div>
            )}

          </div>

          {/* Rodapé Fixo com Disparo Rápido */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <a
              href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                `Olá, ${lead.nome}! Sou o Adriel da A&K Soluções Financeiras. Estou acompanhando sua simulação de crédito no ${lead.banco || "banco parceiro"}. Podemos conversar agora?`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </a>

            <a
              href={`tel:+${formattedPhone}`}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition"
            >
              <Phone size={14} className="text-blue-600" />
              <span>Ligar Agora</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
