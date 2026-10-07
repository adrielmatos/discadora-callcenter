"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, PhoneCall, CheckCircle2, Clock, 
  BarChart3, TrendingUp, Calendar, ArrowUpRight, Target, Bot, Award, Zap
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
          supabase.from("historico_ligacoes").select("id, tabulacao, created_at, lead_id").order("created_at", { ascending: false }).limit(8),
          supabase.from("retornos").select("id").eq("concluido", false)
        ]);

        const leads = leadsRes.data || [];
        const calls = callsRes.data || [];
        const pendentes = leads.filter((l: any) => l.status === "pendente").length;
        const contratos = calls.filter((c: any) => c.tabulacao === "Contrato").length;

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
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-y-auto font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Visão Geral da Operação</h1>
          <p className="text-slate-500 text-xs mt-0.5">Central de controle e acompanhamento em tempo real • A&K Soluções Financeiras</p>
        </div>
        <Link 
          href="/dialer" 
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-xs transition"
        >
          <PhoneCall size={14} />
          <span>Abrir Discador</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">
              <PhoneCall size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ligações Hoje</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? "..." : stats.ligacoesHoje}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contratos Fechados</span>
              <p className="text-2xl font-bold text-emerald-600 mt-0.5">{loading ? "..." : stats.contratos}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center font-bold">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Retornos Pendentes</span>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{loading ? "..." : stats.retornos}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center font-bold">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fila Restante</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? "..." : `${stats.pendentes} / ${stats.totalLeads}`}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ações Rápidas */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 flex flex-col">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Atalhos Operacionais</span>
            <div className="space-y-2 flex-1">
              <Link href="/dialer" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition group">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <PhoneCall size={14}/>
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs">Discador com Pulo Automático</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
              <Link href="/leads" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition group">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp size={14}/>
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs">CRM & Esteira de Contratos</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
              <Link href="/omnichannel" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition group">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bot size={14}/>
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs">Atendente IA 24h & WhatsApp</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
              <Link href="/retornos" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition group">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Calendar size={14}/>
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs">Agenda de Retornos</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
              <Link href="/campanhas" className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition group">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Target size={14}/>
                  </div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-xs">Campanhas por Convênio</span>
                </div>
                <ArrowUpRight size={14} className="text-slate-400 group-hover:text-blue-600" />
              </Link>
            </div>
          </div>

          {/* Histórico Recente */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 block">
              Últimas Ligações Tabuladas
            </span>
            
            {recentCalls.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Nenhuma ligação tabulada recentemente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentCalls.map((call, i) => (
                  <div key={call.id || i} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-md flex items-center justify-center text-slate-600 font-bold text-xs">
                        #{call.lead_id}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Lead #{call.lead_id}</p>
                        <p className="text-[10px] text-slate-400">{new Date(call.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {call.tabulacao}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel do Squad de Atendimento & Metas Diárias (Squad Style) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Award size={18} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Produtividade do Squad • A&K Soluções</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Metas Operacionais do Dia</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Membros do Squad */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Integrantes Ativos</span>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Adriel (Você)</h4>
                    <p className="text-[10px] text-slate-500">Operador Principal • Administrador</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {stats.ligacoesHoje} ligações hoje
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Sofia (Atendente IA 24h)</h4>
                    <p className="text-[10px] text-indigo-600 font-semibold">Atendimento Receptivo WhatsApp</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    Online 24/7
                  </span>
                </div>
              </div>
            </div>

            {/* Progresso de Metas */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Metas da Empresa</span>
              
              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Meta de Ligações: {stats.ligacoesHoje} / 100</span>
                  <span className="text-blue-600">{Math.min(100, Math.round((stats.ligacoesHoje / 100) * 100))}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((stats.ligacoesHoje / 100) * 100))}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className="text-slate-700">Meta de Contratos Fechados: {stats.contratos} / 5</span>
                  <span className="text-emerald-600">{Math.min(100, Math.round((stats.contratos / 5) * 100))}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((stats.contratos / 5) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
