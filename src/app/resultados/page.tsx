"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Calendar, CheckCircle2, PhoneCall, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResultadosPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"hoje" | "ontem" | "7dias" | "mes" | "custom">("hoje");
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("historico_ligacoes")
        .select("*, leads(nome, telefone, banco, produto)")
        .order("created_at", { ascending: false });

      if (data) setCalls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  // Filtra as chamadas de acordo com a data selecionada
  const filteredCalls = calls.filter(c => {
    const callDate = new Date(c.created_at);
    const today = new Date();
    
    if (period === "hoje") {
      return callDate.toDateString() === today.toDateString();
    }
    if (period === "ontem") {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      return callDate.toDateString() === yesterday.toDateString();
    }
    if (period === "7dias") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      return callDate >= sevenDaysAgo;
    }
    if (period === "mes") {
      return callDate.getMonth() === today.getMonth() && callDate.getFullYear() === today.getFullYear();
    }
    if (period === "custom") {
      return callDate.toISOString().slice(0, 10) === customDate;
    }
    return true;
  });

  const total = filteredCalls.length;
  const contratos = filteredCalls.filter(c => c.tabulacao === "Contrato").length;
  const propostas = filteredCalls.filter(c => c.tabulacao === "Proposta").length;
  const simulacoes = filteredCalls.filter(c => c.tabulacao === "Simulação").length;
  const retornos = filteredCalls.filter(c => c.tabulacao === "Retorno").length;
  const taxaConversao = total > 0 ? ((contratos / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Resultados & Métricas da Operação</h1>
          <p className="text-slate-500 text-xs mt-0.5">Acompanhamento de conversão e produção diária • A&K Soluções Financeiras.</p>
        </div>

        {/* Filtro de Período */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button 
              onClick={() => setPeriod("hoje")} 
              className={`px-3 py-1 rounded-md transition ${period === "hoje" ? "bg-white shadow-xs text-blue-600" : "text-slate-600"}`}
            >
              Hoje
            </button>
            <button 
              onClick={() => setPeriod("ontem")} 
              className={`px-3 py-1 rounded-md transition ${period === "ontem" ? "bg-white shadow-xs text-blue-600" : "text-slate-600"}`}
            >
              Ontem
            </button>
            <button 
              onClick={() => setPeriod("7dias")} 
              className={`px-3 py-1 rounded-md transition ${period === "7dias" ? "bg-white shadow-xs text-blue-600" : "text-slate-600"}`}
            >
              7 Dias
            </button>
            <button 
              onClick={() => setPeriod("mes")} 
              className={`px-3 py-1 rounded-md transition ${period === "mes" ? "bg-white shadow-xs text-blue-600" : "text-slate-600"}`}
            >
              Este Mês
            </button>
          </div>

          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            <Calendar size={13} className="text-slate-400" />
            <input 
              type="date" 
              value={customDate} 
              onChange={e => { setCustomDate(e.target.value); setPeriod("custom"); }}
              className="text-xs font-semibold text-slate-700 outline-none"
            />
          </div>

          <button 
            onClick={fetchResults}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            title="Recarregar"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chamadas no Período</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{total}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Contratos Fechados</span>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{contratos}</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Taxa de Conversão</span>
              <p className="text-2xl font-bold text-blue-600 mt-0.5">{taxaConversao}%</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Simulações / Propostas</span>
              <p className="text-2xl font-bold text-teal-700 mt-0.5">{simulacoes + propostas}</p>
            </div>
          </div>

          {/* Tabela do Histórico Filtrado */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">
                Histórico de Ligações do Período ({filteredCalls.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {period === "hoje" ? "Hoje" : period === "ontem" ? "Ontem" : period === "custom" ? customDate : "Período selecionado"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">Banco</th>
                    <th className="px-6 py-3">Tabulação</th>
                    <th className="px-6 py-3">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCalls.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{c.leads?.nome || `Lead #${c.lead_id}`}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{c.leads?.telefone || "-"}</td>
                      <td className="px-6 py-3.5">{c.leads?.banco || "-"}</td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          c.tabulacao === "Contrato" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                          c.tabulacao === "Proposta" ? "bg-teal-50 text-teal-800 border border-teal-200" :
                          c.tabulacao === "Retorno" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {c.tabulacao}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                  {filteredCalls.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                        Nenhuma ligação registrada para esta data/período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
