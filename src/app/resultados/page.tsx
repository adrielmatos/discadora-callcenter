"use client";

import React, { useEffect, useState } from "react";
import { BarChart2, TrendingUp, CheckCircle, PhoneCall, RefreshCw, XCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResultadosPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    const { data } = await supabase.from("historico_ligacoes").select("*, leads(nome, telefone, banco)").order("created_at", { ascending: false });
    if (data) {
      setCalls(data);
      const counts: Record<string, number> = {};
      data.forEach(c => {
        counts[c.tabulacao] = (counts[c.tabulacao] || 0) + 1;
      });
      setTabCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const total = calls.length;
  const contratos = tabCounts["Contrato"] || 0;
  const propostas = tabCounts["Proposta"] || 0;
  const simulacoes = tabCounts["Simulação"] || 0;
  const taxaConversao = total > 0 ? ((contratos / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resultados & Relatórios</h1>
          <p className="text-slate-500 text-sm mt-1">Análise de conversão e histórico detalhado de todas as chamadas realizadas.</p>
        </div>
        <button 
          onClick={fetchResults}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Atualizar Dados</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Métricas de Conversão */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total de Ligações</p>
              <h3 className="text-3xl font-extrabold text-slate-800">{total}</h3>
              <p className="text-xs text-slate-500 mt-1">Registradas no histórico</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Contratos Fechados</p>
              <h3 className="text-3xl font-extrabold text-emerald-600">{contratos}</h3>
              <p className="text-xs text-slate-500 mt-1">Vendas confirmadas</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Taxa de Conversão</p>
              <h3 className="text-3xl font-extrabold text-blue-600">{taxaConversao}%</h3>
              <p className="text-xs text-slate-500 mt-1">Contratos sobre o total</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">Simulações / Propostas</p>
              <h3 className="text-3xl font-extrabold text-teal-700">{propostas + simulacoes}</h3>
              <p className="text-xs text-slate-500 mt-1">Em fase de negociação</p>
            </div>
          </div>

          {/* Tabela de Detalhamento das Chamadas */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Histórico Completo de Ligações ({calls.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-3.5">ID Chamada</th>
                    <th className="px-6 py-3.5">Cliente (Lead)</th>
                    <th className="px-6 py-3.5">Telefone</th>
                    <th className="px-6 py-3.5">Banco</th>
                    <th className="px-6 py-3.5">Resultado (Tabulação)</th>
                    <th className="px-6 py-3.5">Data e Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calls.map((c) => {
                    const lead = c.leads || {};
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500 text-xs">#{c.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{lead.nome || `Lead #${c.lead_id}`}</td>
                        <td className="px-6 py-4 font-mono text-xs">{lead.telefone || "-"}</td>
                        <td className="px-6 py-4">{lead.banco || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            c.tabulacao === "Contrato" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                            c.tabulacao === "Proposta" ? "bg-teal-50 text-teal-800 border border-teal-200" :
                            c.tabulacao === "Simulação" ? "bg-cyan-50 text-cyan-800 border border-cyan-200" :
                            c.tabulacao === "Retorno" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                            c.tabulacao === "Não atendeu" ? "bg-orange-50 text-orange-800 border border-orange-200" :
                            c.tabulacao === "Não interessado" ? "bg-rose-50 text-rose-800 border border-rose-200" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {c.tabulacao}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    );
                  })}
                  {calls.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma chamada registrada no histórico ainda. Comece a discar para gerar métricas!
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
