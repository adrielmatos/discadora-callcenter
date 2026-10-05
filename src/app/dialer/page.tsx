"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  PhoneCall, PhoneOff, Check, X, Calendar, MessageSquare, 
  Play, FastForward, User, AlertCircle, Calculator,
  Clock, ShieldAlert, Sparkles, Building2, Tag, ChevronDown, CheckCircle2
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
  cidade?: string;
  uf?: string;
  status?: string;
}

export default function DialerWorkspace() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "wrapup">("idle");
  const [duration, setDuration] = useState(0);
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [selectedScriptProduct, setSelectedScriptProduct] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  
  // Power Dialing Auto-Next countdown
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  // Modal Agendamento Retorno
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Calculadora
  const [showCalc, setShowCalc] = useState(false);
  const [calcSaldo, setCalcSaldo] = useState(2500);

  const activeLead = leadsList[currentLeadIndex];

  // Carrega fila de leads com filtro de produto
  const fetchQueue = async (filter = productFilter) => {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("status", "pendente")
      .order("id", { ascending: true });

    if (filter === "fgts") {
      query = query.ilike("produto", "%fgts%");
    } else if (filter === "inss") {
      query = query.or("produto.ilike.%inss%,produto.ilike.%bpc%,produto.ilike.%loas%");
    } else if (filter === "consignado") {
      query = query.ilike("produto", "%consignado%");
    }

    const { data } = await query.limit(150);
    if (data) {
      setLeadsList(data);
      setCurrentLeadIndex(0);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setProductFilter(newFilter);
    fetchQueue(newFilter);
  };

  // Carrega scripts
  const fetchScripts = async () => {
    const { data } = await supabase.from("scripts_ligacao").select("*").order("id", { ascending: true });
    if (data) setScriptsList(data);
  };

  useEffect(() => {
    fetchQueue("all");
    fetchScripts();
  }, []);

  // Seleciona script automaticamente quando o lead muda com mapeamento inteligente
  useEffect(() => {
    if (!activeLead || scriptsList.length === 0) return;
    
    const leadProduct = (activeLead.produto || "").toLowerCase().trim();
    const leadBank = (activeLead.banco || "").toLowerCase().trim();

    let match = null;
    if (leadProduct.includes("bpc") || leadProduct.includes("loas")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("bpc") || s.produto.toLowerCase().includes("loas")) ||
              scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    } else if (leadProduct.includes("inss")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    } else if (leadProduct.includes("fgts")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("fgts"));
    } else if (leadProduct.includes("porta") || leadProduct.includes("portabilidade")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("portabilidade"));
    } else if (leadProduct.includes("refin")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("refinanciamento"));
    } else if (leadProduct.includes("siape") || leadProduct.includes("servidor")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("siape") || s.produto.toLowerCase().includes("servidor"));
    } else if (leadProduct.includes("rmc") || leadProduct.includes("rcc") || leadProduct.includes("cartão")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("rmc") || s.produto.toLowerCase().includes("cartão"));
    } else if (leadProduct.includes("consignado")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("consignado geral") || s.produto.toLowerCase().includes("consignado"));
    }

    if (!match && leadProduct) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes(leadProduct) || leadProduct.includes(s.produto.toLowerCase()));
    }

    if (!match && leadBank && leadBank !== "não informado") {
      match = scriptsList.find(s => s.produto.toLowerCase().includes(leadBank));
    }

    if (match) {
      setSelectedScriptProduct(match.produto);
    } else {
      const padrao = scriptsList.find(s => 
        s.produto.toLowerCase().includes("padrão") || 
        s.produto.toLowerCase().includes("geral") || 
        s.produto.toLowerCase().includes("mestre")
      );
      setSelectedScriptProduct(padrao ? padrao.produto : (scriptsList[0]?.produto || ""));
    }
  }, [activeLead, scriptsList]);

  // Timer de chamada
  useEffect(() => {
    let interval: any;
    if (callStatus === "talking") {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Contagem regressiva do Power Dialer
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown > 0) {
      const t = setTimeout(() => setAutoNextCountdown(c => (c !== null ? c - 1 : null)), 1000);
      return () => clearTimeout(t);
    } else {
      setAutoNextCountdown(null);
      triggerCall();
    }
  }, [autoNextCountdown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const triggerCall = () => {
    if (!activeLead) return;
    const cleanNumber = activeLead.telefone.replace(/\D/g, "");
    window.location.href = `tel:+55${cleanNumber}`;
    setCallStatus("calling");
    setTimeout(() => setCallStatus("talking"), 2000);
  };

  const handleStartCall = () => {
    setAutoNextCountdown(null);
    triggerCall();
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

    // Mapeamento para o CRM Pipeline
    let etapaCrm = "finalizado";
    if (status === "Contrato") etapaCrm = "contrato";
    else if (status === "Proposta") etapaCrm = "proposta";
    else if (status === "Simulação") etapaCrm = "simulacao";
    else if (status === "Interessado") etapaCrm = "contato";

    await supabase.from("leads").update({ 
      status: "finalizado",
      etapa_crm: etapaCrm,
      ultima_tabulacao: status,
      tentativas: 1
    }).eq("id", activeLead.id);

    setCallStatus("idle");

    // Avança para o próximo lead
    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(curr => curr + 1);
      if (isPowerDialing) {
        // Dispara contagem de 2 segundos para próxima chamada
        setAutoNextCountdown(2);
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

    await supabase.from("leads").update({ etapa_crm: "retorno" }).eq("id", activeLead.id);

    setShowScheduleModal(false);
    await saveCallRecord("Retorno", scheduleNotes);
    setScheduleNotes("");
  };

  const handleWhatsApp = () => {
    if (!activeLead) return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. Conforme conversamos, segue a simulação referente ao seu limite de ${activeLead.margem_disponivel || "crédito liberado"} pelo banco ${activeLead.banco || "parceiro"}. Ficou com alguma dúvida nas condições?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  // Encontra script ativo
  const currentScript = scriptsList.find(s => s.produto === selectedScriptProduct) || scriptsList[0] || {
    abertura: "Olá, [NOME], tudo bem? Aqui é o Adriel da A&K Soluções Financeiras.",
    motivo: "Estou em contato sobre as condições aprovadas no [BANCO].",
    qualificacao: "Gostaria de conhecer os valores?",
    fechamento: "Posso enviar a simulação de [VALOR] pelo WhatsApp?"
  };

  const renderScriptText = (text: string) => {
    if (!text) return "";
    return text
      .replaceAll("[NOME]", activeLead?.nome || "cliente")
      .replaceAll("[BANCO]", activeLead?.banco || "banco parceiro")
      .replaceAll("[VALOR]", activeLead?.margem_disponivel || "valores liberados");
  };

  if (!activeLead && leadsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-10 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Fila Finalizada!</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">Todos os leads pendentes foram tabulados.</p>
          <button onClick={fetchQueue} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
            Recarregar Fila
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sub-Header / Workspace Bar */}
      <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fila:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button 
                onClick={() => handleFilterChange("all")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "all" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Todos ({leadsList.length - currentLeadIndex})
              </button>
              <button 
                onClick={() => handleFilterChange("inss")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "inss" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                INSS & BPC
              </button>
              <button 
                onClick={() => handleFilterChange("fgts")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "fgts" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                FGTS
              </button>
              <button 
                onClick={() => handleFilterChange("consignado")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "consignado" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Consignado
              </button>
            </div>
          </div>

          {autoNextCountdown !== null && (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-0.5 rounded-md text-xs font-bold animate-pulse flex items-center space-x-1">
              <span>Discando próximo em {autoNextCountdown}s...</span>
            </span>
          )}
        </div>

        {/* Dialing Modes & Tools */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowCalc(!showCalc)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              showCalc ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calculator size={14} />
            <span>Simulador Rápido</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button 
              onClick={() => { setIsPowerDialing(false); setAutoNextCountdown(null); }}
              className={`px-3 py-1 rounded-md font-semibold transition ${!isPowerDialing ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              Manual
            </button>
            <button 
              onClick={() => setIsPowerDialing(true)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition ${isPowerDialing ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Play size={10} />
              <span>Auto-Pular (Power)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left / Center: Lead Profile + Dynamic Script */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-5">
          
          {/* Ficha Minimalista do Cliente */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base border border-slate-200/60">
                  {activeLead?.nome.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900">{activeLead?.nome}</h2>
                    <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <Tag size={10} className="mr-0.5" />
                      <span>{activeLead?.produto || "Saque FGTS"}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500">
                    <span className="font-mono">{activeLead?.cpf || "CPF Indisponível"}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Building2 size={12} className="text-slate-400" />
                      <span>{activeLead?.banco || "Banco não informado"}</span>
                    </span>
                    <span>•</span>
                    <button 
                      onClick={handleWhatsApp}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      <MessageSquare size={11} />
                      <span>Enviar WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200/60 min-w-[160px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margem / Limite</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{activeLead?.margem_disponivel || "R$ 0,00"}</span>
              </div>
            </div>

            {/* Simulador Expansível */}
            {showCalc && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3.5 rounded-lg text-xs">
                <div className="flex justify-between items-center mb-1.5 font-bold text-slate-700">
                  <span>Estimativa de Liberação FGTS (60% a 70% com juros)</span>
                  <span className="font-mono text-blue-600">Saldo: R$ {calcSaldo.toLocaleString('pt-BR')}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="30000" 
                  step="500" 
                  value={calcSaldo} 
                  onChange={e => setCalcSaldo(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-slate-500 mt-1">
                  <span>R$ 500</span>
                  <span className="font-bold text-emerald-600 text-sm">Valor Estimado Liberado: R$ {(calcSaldo * 0.65).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span>R$ 30.000</span>
                </div>
              </div>
            )}
          </div>

          {/* Script de Atendimento Automático por Produto */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            <div className="h-12 px-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">Script de Atendimento:</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                  {currentScript.produto}
                </span>
                {activeLead?.banco && activeLead.banco !== "Não informado" && (
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    {activeLead.banco}
                  </span>
                )}
              </div>

              {/* Seletor Manual opcional */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400 font-semibold hidden md:inline">Trocar:</span>
                <select 
                  value={selectedScriptProduct} 
                  onChange={e => setSelectedScriptProduct(e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 border border-slate-200 bg-white rounded-md px-2 py-1 outline-none shadow-xs"
                >
                  {scriptsList.map(s => (
                    <option key={s.id} value={s.produto}>{s.produto}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">1. Abertura</span>
                <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.abertura)}"</p>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">2. Motivo da Ligação</span>
                <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.motivo)}"</p>
              </div>

              {currentScript.qualificacao && (
                <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">3. Qualificação</span>
                  <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.qualificacao)}"</p>
                </div>
              )}

              <div className="bg-blue-50/40 p-3.5 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">4. Fechamento & Envio de Proposta</span>
                <p className="text-sm font-semibold text-blue-900">"{renderScriptText(currentScript.fechamento)}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Dialing & Dispositions */}
        <div className="w-80 bg-white border-l border-slate-200/80 flex flex-col justify-between p-6 shrink-0 shadow-xs">
          
          <div className="text-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Número</span>
            <p className="text-2xl font-mono font-bold text-slate-900">{activeLead?.telefone}</p>
          </div>

          {/* Call Status Actions */}
          <div className="flex-1 flex flex-col justify-center items-center my-6">
            {callStatus === "idle" && (
              <button 
                onClick={handleStartCall}
                className="w-32 h-32 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex flex-col items-center justify-center font-bold shadow-md shadow-blue-500/10 hover:scale-102 transition-all"
              >
                <PhoneCall size={36} className="mb-1" />
                <span className="text-xs uppercase tracking-wider">Chamar</span>
              </button>
            )}

            {callStatus === "calling" && (
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-blue-600">Disparando para o smartphone...</p>
              </div>
            )}

            {callStatus === "talking" && (
              <div className="w-full text-center space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Duração</span>
                  <p className="text-3xl font-mono font-extrabold text-slate-800">{formatTime(duration)}</p>
                </div>
                <button 
                  onClick={handleEndCall}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition"
                >
                  <PhoneOff size={16} />
                  <span>Encerrar Chamada</span>
                </button>
              </div>
            )}

            {callStatus === "wrapup" && (
              <div className="w-full space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center block mb-2">Classificar Resultado</span>
                <div className="grid grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
                  <button onClick={() => handleDisposition("Contrato")} className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-bold text-xs flex justify-between items-center transition">
                    <span>Contrato Fechado</span> <Check size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Proposta")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Proposta Enviada</span> <Check size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Simulação")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Simulação Feita</span> <MessageSquare size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Retorno")} className="w-full text-left px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold text-xs flex justify-between items-center transition">
                    <span>Agendar Retorno</span> <Calendar size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Interessado")} className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Interessado</span> <User size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Não atendeu")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Não Atendeu</span> <PhoneOff size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Não interessado")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Não Tem Interesse</span> <X size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Sem perfil")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Sem Perfil / Saldo</span> <AlertCircle size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {callStatus === "idle" && (
            <button 
              onClick={() => saveCallRecord("Pulado")}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <span>Pular Lead</span>
              <FastForward size={12} />
            </button>
          )}

        </div>
      </div>

      {/* Modal Retorno */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Calendar className="text-amber-500" size={16} />
              <span>Agendar Retorno</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Data:</label>
                <input 
                  type="date" 
                  value={scheduleDate} 
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Horário:</label>
                <input 
                  type="time" 
                  value={scheduleTime} 
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Anotações:</label>
                <textarea 
                  placeholder="Ex: Ligar após as 14h, quer fechar com margem de R$ 500" 
                  value={scheduleNotes}
                  onChange={e => setScheduleNotes(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs h-16 outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={confirmScheduleReturn} className="flex-1 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
