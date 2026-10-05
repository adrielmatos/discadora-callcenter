"use client";

import React, { useState, useEffect } from "react";
import { 
  PhoneCall, PhoneOff, Check, X, Calendar, MessageCircle, 
  ListOrdered, Play, Pause, FastForward, User, AlertCircle
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

  const activeLead = leadsList[currentLeadIndex];

  // Fetch leads
  const fetchQueue = async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "pendente")
      .order("id", { ascending: true })
      .limit(50);
    if (data) setLeadsList(data);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Timer logic for calls
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
    window.location.href = `tel:+55${activeLead.telefone.replace(/\D/g, "")}`;
    setCallStatus("calling");
    // Simulate answering
    setTimeout(() => setCallStatus("talking"), 2000);
  };

  const handleEndCall = () => {
    setCallStatus("wrapup");
  };

  const handleDisposition = async (status: string) => {
    if (activeLead && activeLead.id) {
      await supabase.from("historico_ligacoes").insert({
        lead_id: activeLead.id,
        tabulacao: status,
        duracao_segundos: duration
      });
      await supabase.from("leads").update({ status: "finalizado", ultima_tabulacao: status }).eq("id", activeLead.id);
    }
    
    setCallStatus("idle");
    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(curr => curr + 1);
      // Auto Dialer mode triggers next call automatically
      if (isAutoDialing) {
        setTimeout(() => handleStartCall(), 1500);
      }
    } else {
      fetchQueue();
    }
  };

  const handleWhatsApp = () => {
    if (!activeLead) return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(`Olá ${activeLead.nome}, sou da A&K Soluções Financeiras.`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  if (!activeLead && leadsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <ListOrdered size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-700">Fila Vazia</h2>
          <p className="text-slate-500 mt-2">Não há leads pendentes para a sua fila.</p>
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
          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold">
            {leadsList.length - currentLeadIndex} Leads na Fila
          </span>
        </div>
        
        {/* Dialer Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => setIsAutoDialing(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${!isAutoDialing ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Modo Preview
          </button>
          <button 
            onClick={() => setIsAutoDialing(true)}
            className={`flex items-center space-x-1 px-4 py-1.5 rounded-md text-sm font-semibold transition ${isAutoDialing ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Play size={14} />
            <span>Power Dialer (Auto)</span>
          </button>
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
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{activeLead?.nome}</h2>
                  <div className="flex items-center space-x-3 mt-1 text-slate-500 text-sm">
                    <span className="font-mono">{activeLead?.cpf || 'CPF Indisponível'}</span>
                    <span>•</span>
                    <span className="flex items-center text-blue-600 font-semibold cursor-pointer" onClick={handleWhatsApp}>
                      <MessageCircle size={14} className="mr-1" /> WhatsApp
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Margem Disponível</p>
                <p className="text-3xl font-extrabold text-green-600">{activeLead?.margem_disponivel || 'R$ 0,00'}</p>
                <p className="text-sm font-medium text-slate-600 mt-1">{activeLead?.banco || 'Nenhum'}</p>
              </div>
            </div>
          </div>

          {/* Dynamic Script Card */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <h3 className="font-bold text-slate-700 flex items-center space-x-2">
                <AlertCircle size={18} className="text-blue-500" />
                <span>Script Sugerido: Saque FGTS / Portabilidade</span>
              </h3>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mb-2">ABERTURA</span>
                <p className="text-slate-700 text-lg leading-relaxed">
                  "Oi, <strong>{activeLead?.nome}</strong>, tudo bem? Aqui é o Adriel da A&K Soluções Financeiras. Posso falar rapidinho sobre uma possibilidade relacionada ao seu benefício?"
                </p>
              </div>
              <div className="border-l-4 border-slate-200 pl-4">
                <span className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded mb-2">MOTIVO DA LIGAÇÃO</span>
                <p className="text-slate-600 leading-relaxed">
                  "Quero verificar se existe uma opção de antecipação do saque-aniversário ou portabilidade disponível para você no <strong>{activeLead?.banco || 'seu banco'}</strong>, com juros mais baixos."
                </p>
              </div>
              <div className="border-l-4 border-slate-200 pl-4">
                <span className="inline-block bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded mb-2">FECHAMENTO</span>
                <p className="text-slate-600 leading-relaxed">
                  "Posso verificar as condições e te mandar a simulação de <strong>{activeLead?.margem_disponivel || 'valores'}</strong> via WhatsApp sem compromisso para você analisar?"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Softphone & Dispositions */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex-1 flex flex-col">
            
            {/* Phone Number Display */}
            <div className="text-center mb-8">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-2">Contato Atual</p>
              <h2 className="text-3xl font-mono font-bold text-slate-800">{activeLead?.telefone}</h2>
            </div>

            {/* Dialer State Machine */}
            <div className="flex-1 flex flex-col justify-center items-center">
              {callStatus === "idle" && (
                <button 
                  onClick={handleStartCall}
                  className="w-40 h-40 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white shadow-xl hover:bg-blue-700 hover:scale-105 transition-all"
                >
                  <PhoneCall size={48} className="mb-2" />
                  <span className="font-bold text-lg">LIGAR</span>
                </button>
              )}

              {callStatus === "calling" && (
                <div className="text-center animate-pulse">
                  <div className="w-32 h-32 mx-auto border-4 border-blue-400 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-xl font-bold text-blue-600">Chamando...</p>
                </div>
              )}

              {callStatus === "talking" && (
                <div className="text-center w-full">
                  <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex flex-col items-center justify-center text-green-600 mb-6 shadow-inner border border-green-200">
                    <span className="text-3xl font-bold font-mono">{formatTime(duration)}</span>
                  </div>
                  <button 
                    onClick={handleEndCall}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 shadow-lg transition"
                  >
                    <PhoneOff size={24} />
                    <span>ENCERRAR</span>
                  </button>
                </div>
              )}

              {callStatus === "wrapup" && (
                <div className="w-full flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Tabulação (Wrap-up)</h3>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {/* Dispositions List */}
                    <button onClick={() => handleDisposition("Contrato")} className="w-full bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Contrato</span> <Check size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Proposta")} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Proposta</span> <Check size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Simulação")} className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Simulação</span> <MessageCircle size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Interessado")} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Interessado</span> <User size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Retorno")} className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Retorno</span> <Calendar size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Não atendeu")} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Não atendeu</span> <PhoneOff size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Não interessado")} className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Não interessado</span> <Ban size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Número inválido")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Número inválido</span> <AlertCircle size={16} />
                    </button>
                    <button onClick={() => handleDisposition("Sem perfil")} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 p-2.5 rounded-lg font-bold flex items-center justify-between transition">
                      <span>Sem perfil</span> <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Skip Button */}
            {callStatus === "idle" && (
              <button 
                onClick={() => handleDisposition("Pulado")}
                className="mt-6 w-full py-3 text-slate-500 hover:bg-slate-100 rounded-lg font-medium flex items-center justify-center space-x-2 transition"
              >
                <span>Pular Lead</span>
                <FastForward size={16} />
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
