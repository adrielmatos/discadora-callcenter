"use client";

import React, { useState, useEffect } from "react";
import { 
  PhoneCall, PhoneOff, Check, X, Calendar, MessageCircle, 
  ListOrdered, Play, FastForward, User, AlertCircle, Calculator,
  Clock, ShieldAlert, Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Lead {
  id?: number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  status?: string;
}

export default function DialerWorkspace() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isAutoDialing, setIsAutoDialing] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "wrapup">("idle");
  const [duration, setDuration] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState("Saque FGTS");
  const [scriptsMap, setScriptsMap] = useState<Record<string, any>>({});
  
  // Modal de Agendamento de Retorno
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Calculadora Rápida
  const [showCalc, setShowCalc] = useState(false);
  const [calcSaldo, setCalcSaldo] = useState(1000);

  const activeLead = leadsList[currentLeadIndex];

  // Carrega leads com ordenação inteligente
  const fetchQueue = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "pendente")
      .order("id", { ascending: true })
      .limit(100);
    if (data) setLeadsList(data);
  };

  // Carrega scripts do banco
  const fetchScripts = async () => {
    const { data } = await supabase.from("scripts_ligacao").select("*");
    if (data) {
      const map: Record<string, any> = {};
      data.forEach(s => { map[s.produto] = s; });
      setScriptsMap(map);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchScripts();
  }, []);

  // Timer da ligação
  useEffect(() => {
    let interval: any;
    if (callStatus === "talking") {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartCall = () => {
    if (!activeLead) return;
    const cleanNumber = activeLead.telefone.replace(/\D/g, "");
    window.location.href = `tel:+55${cleanNumber}`;
    setCallStatus("calling");
    setTimeout(() => setCallStatus("talking"), 2000);
  };

  const handleEndCall = () => {
    setCallStatus("wrapup");
  };

  const handleDisposition = async (status: string) => {
    if (!activeLead?.id) return;

    if (status === "Retorno") {
      setShowScheduleModal(true);
      return;
    }

    await saveCallRecord(status);
  };

  const saveCallRecord = async (status: string, notes?: string) => {
    if (!activeLead?.id) return;

    await supabase.from("historico_ligacoes").insert({
      lead_id: activeLead.id,
      tabulacao: status,
      duracao_segundos: duration
    });

    await supabase.from("leads").update({ 
      status: "finalizado", 
      ultima_tabulacao: status 
    }).eq("id", activeLead.id);

    setCallStatus("idle");

    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(curr => curr + 1);
      if (isAutoDialing) {
        setTimeout(() => handleStartCall(), 1800);
      }
    } else {
      fetchQueue();
    }
  };

  const confirmScheduleReturn = async () => {
    if (!activeLead?.id || !scheduleDate) {
      alert("Por favor selecione a data do retorno.");
      return;
    }

    const fullDate = `${scheduleDate}T${scheduleTime || "10:00"}:00`;

    await supabase.from("retornos").insert({
      lead_id: activeLead.id,
      data_hora: new Date(fullDate).toISOString(),
      observacao: scheduleNotes || "Retorno agendado pelo operador",
      concluido: false
    });

    setShowScheduleModal(false);
    await saveCallRecord("Retorno", scheduleNotes);
    setScheduleNotes("");
  };

  const handleWhatsApp = () => {
    if (!activeLead) return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá ${activeLead.nome}, aqui é o Adriel da A&K Soluções Financeiras! Conforme conversamos, segue sua simulação com margem de ${activeLead.margem_disponivel || "valores liberados"} pelo banco ${activeLead.banco || "conveniado"}. Ficou com alguma dúvida?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  const activeScript = scriptsMap[selectedProduct] || {
    abertura: "Olá, [NOME], tudo bem? Aqui é o Adriel da A&K Soluções Financeiras.",
    motivo: "Identificamos uma margem disponível para liberação no [BANCO].",
    qualificacao: "Gostaria de verificar as condições?",
    fechamento: "Posso enviar a simulação detalhada de [VALOR] no seu WhatsApp?"
  };

  const renderScriptText = (template: string) => {
    if (!template) return "";
    return template
      .replaceAll("[NOME]", activeLead?.nome || "cliente")
      .replaceAll("[BANCO]", activeLead?.banco || "seu banco")
      .replaceAll("[VALOR]", activeLead?.margem_disponivel || "valores liberados");
  };

  if (!activeLead && leadsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <ListOrdered size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700">Fila Vazia</h2>
          <p className="text-slate-500 mt-2">Nenhum lead pendente na fila. Importe uma nova planilha no menu CRM & Leads.</p>
          <button onClick={fetchQueue} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
            Atualizar Fila
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      {/* Top Action Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-slate-800">Workspace de Agente</h1>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">
            {leadsList.length - currentLeadIndex} Leads Restantes
          </span>
        </div>
        
        {/* Dialer Controls & Tools */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowCalc(!showCalc)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
          >
            <Calculator size={14} className="text-blue-600" />
            <span>Calculadora Rápida</span>
          </button>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setIsAutoDialing(false)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${!isAutoDialing ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Manual (Preview)
            </button>
            <button 
              onClick={() => setIsAutoDialing(true)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-semibold transition ${isAutoDialing ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Play size={12} />
              <span>Power Dialer (Auto)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left/Center Panel: CRM & Script */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {/* Customer 360 Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-md">
                  {activeLead?.nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{activeLead?.nome}</h2>
                  <div className="flex items-center space-x-3 mt-1 text-slate-500 text-sm">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{activeLead?.cpf || 'CPF não informado'}</span>
                    <span>•</span>
                    <button 
                      onClick={handleWhatsApp}
                      className="flex items-center text-emerald-600 hover:text-emerald-700 font-semibold text-xs bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition"
                    >
                      <MessageCircle size={13} className="mr-1" /> WhatsApp Simulação
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Margem / Limite Estimado</p>
                <p className="text-3xl font-extrabold text-emerald-600">{activeLead?.margem_disponivel || 'R$ 0,00'}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">Banco: {activeLead?.banco || 'Não informado'}</p>
              </div>
            </div>

            {/* Mini Calculadora Integrada (Toggle) */}
            {showCalc && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-blue-50/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-900">Simulador de Antecipação FGTS (Estimativa 60%)</span>
                  <button onClick={() => setShowCalc(false)} className="text-slate-400 hover:text-slate-600 text-xs">Fechar</button>
                </div>
                <div className="flex items-center space-x-4">
                  <input 
                    type="range" 
                    min="500" 
                    max="20000" 
                    step="500" 
                    value={calcSaldo} 
                    onChange={e => setCalcSaldo(Number(e.target.value))}
                    className="flex-1"
                  />
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Saldo FGTS: R$ {calcSaldo.toLocaleString('pt-BR')}</p>
                    <p className="text-sm font-bold text-emerald-700">Libera aprox: R$ {(calcSaldo * 0.65).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Script Card */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center space-x-2 text-sm">
                <Sparkles size={16} className="text-blue-500" />
                <span>Roteiro Operacional</span>
              </h3>
              
              {/* Product Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs text-slate-500 font-medium">Produto:</label>
                <select 
                  value={selectedProduct} 
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-md px-2 py-1 outline-none"
                >
                  <option value="Saque FGTS">Saque FGTS</option>
                  <option value="INSS / Portabilidade">INSS / Portabilidade</option>
                  <option value="Consignado Público / SIAPE">Consignado Público / SIAPE</option>
                </select>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-2">1. ABERTURA</span>
                <p className="text-slate-800 text-base leading-relaxed">
                  "{renderScriptText(activeScript.abertura)}"
                </p>
              </div>
              
              <div className="border-l-2 border-slate-200 pl-4">
                <span className="inline-block bg-purple-100 text-purple-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-2">2. MOTIVO</span>
                <p className="text-slate-700 text-sm leading-relaxed">
                  "{renderScriptText(activeScript.motivo)}"
                </p>
              </div>

              {activeScript.qualificacao && (
                <div className="border-l-2 border-slate-200 pl-4">
                  <span className="inline-block bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-2">3. QUALIFICAÇÃO</span>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    "{renderScriptText(activeScript.qualificacao)}"
                  </p>
                </div>
              )}

              <div className="border-l-2 border-emerald-300 pl-4 bg-emerald-50/40 p-3 rounded-r-lg">
                <span className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full mb-1">4. FECHAMENTO & SIMULAÇÃO</span>
                <p className="text-emerald-950 text-sm font-medium leading-relaxed">
                  "{renderScriptText(activeScript.fechamento)}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Softphone & Dispositions */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-sm">
          <div className="p-6 flex-1 flex flex-col justify-between">
            
            {/* Phone Number Display */}
            <div className="text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Telefone do Lead</p>
              <h2 className="text-2xl font-mono font-extrabold text-slate-800">{activeLead?.telefone}</h2>
            </div>

            {/* Dialer State Machine */}
            <div className="flex-1 flex flex-col justify-center items-center my-6">
              {callStatus === "idle" && (
                <button 
                  onClick={handleStartCall}
                  className="w-36 h-36 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl hover:bg-blue-700 hover:scale-105 transition-all group"
                >
                  <PhoneCall size={40} className="mb-1 group-hover:animate-bounce" />
                  <span className="font-extrabold text-base tracking-wide">DISCAR</span>
                </button>
              )}

              {callStatus === "calling" && (
                <div className="text-center animate-pulse">
                  <div className="w-28 h-28 mx-auto border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-base font-bold text-blue-600">Discando no chip...</p>
                </div>
              )}

              {callStatus === "talking" && (
                <div className="text-center w-full">
                  <div className="w-28 h-28 mx-auto bg-emerald-100 rounded-full flex flex-col items-center justify-center text-emerald-600 mb-6 shadow-inner border border-emerald-200">
                    <span className="text-2xl font-bold font-mono">{formatTime(duration)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Em linha</span>
                  </div>
                  <button 
                    onClick={handleEndCall}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg transition"
                  >
                    <PhoneOff size={20} />
                    <span>ENCERRAR</span>
                  </button>
                </div>
              )}

              {callStatus === "wrapup" && (
                <div className="w-full flex-1 flex flex-col">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">Classificar Ligação</h3>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[360px]">
                    <button onClick={() => handleDisposition("Contrato")} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Contrato Fechado</span> <Check size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Proposta")} className="w-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Proposta Enviada</span> <Check size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Simulação")} className="w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Simulação Feita</span> <MessageCircle size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Interessado")} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Interessado</span> <User size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Retorno")} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Agendar Retorno</span> <Calendar size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Não atendeu")} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Não Atendeu</span> <PhoneOff size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Não interessado")} className="w-full bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Não Tem Interesse</span> <X size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Número inválido")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Número Inválido</span> <AlertCircle size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Sem perfil")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 p-2.5 rounded-lg font-bold text-xs flex items-center justify-between transition">
                      <span>Sem Perfil</span> <ShieldAlert size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Skip Button */}
            {callStatus === "idle" && (
              <button 
                onClick={() => saveCallRecord("Pulado")}
                className="w-full py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <span>Pular para o Próximo</span>
                <FastForward size={14} />
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Modal de Agendamento de Retorno */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <Clock className="text-amber-500" size={20} />
              <span>Agendar Retorno com {activeLead?.nome}</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Data:</label>
                <input 
                  type="date" 
                  value={scheduleDate} 
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Horário:</label>
                <input 
                  type="time" 
                  value={scheduleTime} 
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Observações do Lead:</label>
              <textarea 
                placeholder="Ex: Pediu para ligar após as 14h, tem interesse em liberar R$ 1.500"
                value={scheduleNotes}
                onChange={e => setScheduleNotes(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm h-20 outline-none"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2 text-slate-600 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmScheduleReturn}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold shadow-sm"
              >
                Salvar Retorno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
