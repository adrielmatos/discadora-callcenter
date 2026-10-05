"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, PhoneCall, CheckCircle, Clock, 
  BarChart2, TrendingUp, Calendar, AlertCircle, FileText, ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    pendentes: 0,
    ligacoesHoje: 0,
    contratos: 0,
    retornos: 0,
  });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [leadsRes, callsRes, retornosRes] = await Promise.all([
          supabase.from("leads").select("id, status"),
          supabase.from("historico_ligacoes").select("id, tabulacao, created_at, lead_id").order("created_at", { ascending: false }).limit(10),
          supabase.from("retornos").select("id").eq("concluido", false)
        ]);

        const leads = leadsRes.data || [];
        const calls = callsRes.data || [];
        const pendentes = leads.filter(l => l.status === "pendente").length;
        const contratos = calls.filter(c => c.tabulacao === "Contrato").length;

        setStats({
          totalLeads: leads.length,
          pendentes,
          ligacoesHoje: calls.length,
          contratos,
          retornos: (retornosRes.data || []).length
        });
        setRecentCalls(calls);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6] overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral da Operação</h1>
          <p className="text-slate-500 text-sm mt-1">Métricas reais sincronizadas com o banco de dados em tempo real.</p>
        </div>
        <Link 
          href="/dialer" 
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-sm transition"
        >
          <PhoneCall size={18} />
          <span>Abrir Discador</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Ligações Registradas</p>
              <h3 className="text-3xl font-bold text-slate-800">{loading ? "..." : stats.ligacoesHoje}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Contratos Fechados</p>
              <h3 className="text-3xl font-bold text-slate-800">{loading ? "..." : stats.contratos}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Retornos Agendados</p>
              <h3 className="text-3xl font-bold text-slate-800">{loading ? "..." : stats.retornos}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Fila Ativa (Pendentes)</p>
              <h3 className="text-3xl font-bold text-slate-800">{loading ? "..." : `${stats.pendentes} / ${stats.totalLeads}`}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          
          {/* Quick Actions */}
          <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-blue-500" size={20}/> Navegação Rápida
            </h3>
            <div className="space-y-3 flex-1">
              <Link href="/dialer" className="w-full flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-md text-blue-600"><PhoneCall size={18}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-sm">Workspace de Discagem</span>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
              <Link href="/retornos" className="w-full flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-100 p-2 rounded-md text-orange-600"><Calendar size={18}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-orange-700 text-sm">Agenda de Retornos</span>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-orange-600" />
              </Link>
              <Link href="/leads" className="w-full flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-md text-green-600"><Users size={18}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-green-700 text-sm">Importador & CRM</span>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-green-600" />
              </Link>
              <Link href="/scripts" className="w-full flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-md text-purple-600"><FileText size={18}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-purple-700 text-sm">Scripts de Venda</span>
                </div>
                <ArrowUpRight size={16} className="text-slate-400 group-hover:text-purple-600" />
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <BarChart2 className="mr-2 text-slate-500" size={20}/> Últimas Tabulações em Tempo Real
            </h3>
            
            {recentCalls.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <PhoneCall size={32} className="mx-auto mb-2 opacity-50" />
                <p>Nenhuma ligação registrada recentemente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCalls.map((call, i) => (
                  <div key={call.id || i} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                        #{call.lead_id}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">Lead ID #{call.lead_id}</p>
                        <p className="text-xs text-slate-400">{new Date(call.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {call.tabulacao}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
