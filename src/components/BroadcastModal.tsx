"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, Send, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, 
  Play, Pause, Clock, User, Phone, RefreshCw, ExternalLink, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultEtapa?: string;
}

interface LeadTarget {
  id: number;
  nome: string;
  telefone: string;
  telefoneLimpo: string;
  primeiroNome: string;
  banco?: string;
  margem_disponivel?: string;
  etapa_crm?: string;
}

export default function BroadcastModal({ isOpen, onClose, onSuccess, defaultEtapa = "fila" }: BroadcastModalProps) {
  const [targetEtapa, setTargetEtapa] = useState(defaultEtapa);
  const [leads, setLeads] = useState<LeadTarget[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [limit, setLimit] = useState(30);
  const [intervalSec, setIntervalSec] = useState(25);
  const [messageTemplate, setMessageTemplate] = useState(
    "Olá, [NOME]! Tudo bem? Sou a Sofia da A&K Soluções Financeiras. Vi que você pode ter margem disponível para antecipar seu FGTS ou Consignado com liberação imediata via PIX e sem boletos mensais. Gostaria que eu verificasse as condições oficiais para você hoje?"
  );

  // Estados de Execução do Disparo
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [logMessages, setLogMessages] = useState<Array<{ text: string; success: boolean; time: string }>>([]);

  const isRunningRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => {
    isRunningRef.current = isRunning;
    isPausedRef.current = isPaused;
  }, [isRunning, isPaused]);

  const fetchQueue = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch(`/api/whatsapp/broadcast?etapa=${targetEtapa}&limit=${limit}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Erro ao carregar fila de disparos:", err);
    } finally {
      setLoadingLeads(false);
    }
  }, [targetEtapa, limit]);

  // Carrega leads da etapa selecionada
  useEffect(() => {
    if (isOpen) {
      fetchQueue();
    } else {
      setIsRunning(false);
      setIsPaused(false);
      setCurrentIndex(0);
      setCountdown(0);
    }
  }, [isOpen, fetchQueue]);

  const insertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + ` ${variable} `);
  };

  const buildMessage = (lead: LeadTarget) => {
    return messageTemplate
      .replace(/\[NOME\]/gi, lead.primeiroNome || "Cliente")
      .replace(/\[BANCO\]/gi, lead.banco || "bancos parceiros")
      .replace(/\[MARGEM\]/gi, lead.margem_disponivel || "especial")
      .replace(/\[EMPRESA\]/gi, "A&K Soluções Financeiras");
  };

  // Inicia o disparo cadenciado anti-ban
  const handleStartBroadcast = async () => {
    if (leads.length === 0) {
      alert("Nenhum lead encontrado para disparo nesta etapa.");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setLogMessages([]);

    for (let i = currentIndex; i < leads.length; i++) {
      if (!isRunningRef.current) break;

      // Se pausou, aguarda despausar
      while (isPausedRef.current) {
        await new Promise(r => setTimeout(r, 500));
        if (!isRunningRef.current) break;
      }
      if (!isRunningRef.current) break;

      const lead = leads[i];
      setCurrentIndex(i + 1);

      const personalizedText = buildMessage(lead);

      // Abre a conversa no WhatsApp Web ou dispara mensagem
      const waUrl = `https://web.whatsapp.com/send?phone=${lead.telefoneLimpo}&text=${encodeURIComponent(personalizedText)}`;
      
      // Abre a janela do WhatsApp Web oficial
      const win = window.open(waUrl, "_blank", "width=850,height=650");

      // Registra no CRM em segundo plano
      try {
        await fetch("/api/whatsapp/broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: lead.id,
            telefone: lead.telefoneLimpo,
            mensagemEnviada: personalizedText
          })
        });

        setLogMessages(prev => [
          {
            text: `[${i + 1}/${leads.length}] Enviado com sucesso para ${lead.nome} (${lead.telefoneLimpo})`,
            success: true,
            time: new Date().toLocaleTimeString("pt-BR")
          },
          ...prev.slice(0, 15)
        ]);
      } catch (err: any) {
        setLogMessages(prev => [
          {
            text: `Erro ao registrar lead #${lead.id}: ${err.message}`,
            success: false,
            time: new Date().toLocaleTimeString("pt-BR")
          },
          ...prev.slice(0, 15)
        ]);
      }

      // Intervalo randômico Anti-Ban (ex: 25s +- 5s)
      const randomJitter = Math.floor(Math.random() * 8) - 4; // de -4 a +4 segundos
      const sleepTime = Math.max(15, intervalSec + randomJitter);

      for (let s = sleepTime; s > 0; s--) {
        if (!isRunningRef.current) break;
        while (isPausedRef.current) {
          await new Promise(r => setTimeout(r, 500));
          if (!isRunningRef.current) break;
        }
        setCountdown(s);
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdown(0);
    }

    setIsRunning(false);
    setCountdown(0);
    if (onSuccess) onSuccess();
    alert("🎉 Disparo da lista finalizado com sucesso!");
  };

  const handlePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCountdown(0);
  };

  if (!isOpen) return null;

  const progressPercent = leads.length > 0 ? Math.round((currentIndex / leads.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 flex items-start justify-between border-b border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                Anti-Ban Oficial
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                Custo R$ 0,00
              </span>
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Send size={18} className="text-emerald-400" />
              <span>Disparo Cadenciado WhatsApp (Sofia AI)</span>
            </h2>
            <p className="text-xs text-slate-300">
              Envio em lote automatizado com intervalo inteligente para não sofrer bloqueios da Meta.
            </p>
          </div>
          <button 
            onClick={onClose}
            disabled={isRunning}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Configuração de Destinatários */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Etapa do CRM para Disparar:
              </label>
              <select
                value={targetEtapa}
                onChange={e => setTargetEtapa(e.target.value)}
                disabled={isRunning}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value="fila">Fila de Espera (Novos Leads)</option>
                <option value="Interessado">Interessados (Retomar Contato)</option>
                <option value="Simulação">Simulação Pendente</option>
                <option value="Sem perfil">Sem Perfil / Reativação</option>
                <option value="all">Todos os Leads</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tamanho do Lote Seguro:
              </label>
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                disabled={isRunning}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value={15}>15 leads (Lote Leve)</option>
                <option value={30}>30 leads (Recomendado)</option>
                <option value={50}>50 leads (Máximo Seguro por Horário)</option>
              </select>
            </div>
          </div>

          {/* Alerta de leads encontrados */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <User size={15} className="text-blue-600" />
              <span>
                Leads carregados na fila: <strong>{loadingLeads ? "Carregando..." : `${leads.length} contatos`}</strong>
              </span>
            </div>
            <button
              onClick={fetchQueue}
              disabled={loadingLeads || isRunning}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold text-[11px]"
            >
              <RefreshCw size={12} className={loadingLeads ? "animate-spin" : ""} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Editor do Texto da Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Texto do Disparo:
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-500 mr-1">Inserir:</span>
                <button
                  type="button"
                  onClick={() => insertVariable("[NOME]")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200"
                >
                  [NOME]
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable("[BANCO]")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200"
                >
                  [BANCO]
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable("[MARGEM]")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200"
                >
                  [MARGEM]
                </button>
              </div>
            </div>
            <textarea
              rows={4}
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              disabled={isRunning}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white resize-none leading-relaxed"
            />
          </div>

          {/* Configuração Anti-Ban (Intervalo de Segurança) */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={16} className="text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">Cadência de Proteção Anti-Ban</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                ~{intervalSec} segundos por lead
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={intervalSec}
              onChange={e => setIntervalSec(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-emerald-700 font-medium">
              <span>15s (Rápido)</span>
              <span>25s - 35s (Ideal Humano)</span>
              <span>60s (Ultra Seguro)</span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-1">
              💡 <em>O sistema adiciona pequenas variações de segundos a cada envio para imitar perfeitamente o comportamento de digitação de um ser humano.</em>
            </p>
          </div>

          {/* Barra de Progresso e Status em Tempo Real */}
          {isRunning && (
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-bold">
                    {isPaused ? "⏸️ Disparo Pausado" : "Disparando Lista..."}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {currentIndex} / {leads.length} ({progressPercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {countdown > 0 && !isPaused && (
                <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-400" />
                    <span>Aguardando intervalo de segurança para o próximo envio:</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-amber-300">
                    {countdown}s
                  </span>
                </div>
              )}

              {/* Logs */}
              <div className="bg-slate-950 rounded-xl p-3 space-y-1 font-mono text-[11px] max-h-28 overflow-y-auto border border-slate-800">
                {logMessages.map((log, idx) => (
                  <div key={idx} className={log.success ? "text-emerald-400" : "text-rose-400"}>
                    <span className="text-slate-500 mr-2">[{log.time}]</span>
                    <span>{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer com Botões de Ação */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {leads.length > 0 && !isRunning && (
              <span>Estimativa total de tempo: ~{Math.round((leads.length * intervalSec) / 60)} min</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={leads.length === 0 || loadingLeads}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Iniciar Disparo Gratuito</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  <Pause size={14} fill="currentColor" />
                  <span>{isPaused ? "Retomar" : "Pausar"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Interromper
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
