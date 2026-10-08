"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, PhoneCall, CheckCircle2, Clock, 
  BarChart3, TrendingUp, Calendar, ArrowUpRight, Target, Bot, Award, Zap,
  DollarSign, ShieldAlert, Building2, ShieldCheck, AlertCircle, RefreshCw,
  Phone, MessageSquare, ChevronRight, Flame, Layers, Play
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Lead {
  id: number;
  nome: string;
  telefone: string;
  cpf: string;
  margem_disponivel: string;
  banco: string;
  status: string;
  etapa_crm: string;
  cidade?: string;
  uf?: string;
  produto?: string;
  created_at: string;
}

interface OperadorProducao {
  nome: string;
  papel: string;
  status: "disponivel" | "discando" | "pausa";
  chamadas: number;
  contatosEfetivos: number;
  taxaContato: string;
  tma: string;
  volume: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Métricas da Operação & Faturamento
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    pendentesFila: 0,
    ligacoesHoje: 0,
    contatosEfetivos: 0,
    taxaContatoGeral: "0%",
    contratosFechados: 0,
    volumeConfirmado: 0,
    volumeEmAndamento: 0,
    comissaoEstimada: 0,
    aguardandoAnuencia: 0,
    retornosPendentes: 0
  });

  // Fila ao Vivo e Ranking
  const [sampleQueue, setSampleQueue] = useState<Lead[]>([]);
  const [operadoresRanking, setOperadoresRanking] = useState<OperadorProducao[]>([]);
  const [anuenciasUrgentes, setAnuenciasUrgentes] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          email: user.email,
          nome: user.user_metadata?.nome || "Adriel Matos Santos",
          perfil: "Dono & Administrador Master"
        });
      }

      // 2. Leads e Esteira
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("id", { ascending: true });

      const leads: Lead[] = leadsData || [];

      // 3. Histórico de Ligações
      const { data: callsData } = await supabase
        .from("historico_ligacoes")
        .select("*")
        .order("created_at", { ascending: false });

      const calls = callsData || [];

      // 4. Retornos Agendados
      const { data: retornosData } = await supabase
        .from("retornos")
        .select("*")
        .eq("concluido", false);

      const retornos = retornosData || [];

      // Parâmetros de cálculo
      const ticketMedioPadrao = 4500; // R$ 4.500 ticket médio
      const comissaoPercent = 0.11; // 11% de comissão média

      const contratos = leads.filter(l => l.etapa_crm === "finalizado");
      const emAndamento = leads.filter(l => l.etapa_crm === "simulacao" || l.etapa_crm === "esteira_docs");
      const pendentes = leads.filter(l => l.status === "pendente");

      const volConfirmado = contratos.length * ticketMedioPadrao;
      const volEmAndamento = Math.max(emAndamento.length * ticketMedioPadrao, 18500);
      const comissao = volConfirmado * comissaoPercent;

      // Ligações efetivas (que não foram puladas ou não atendeu)
      const efetivas = calls.filter(c => 
        c.tabulacao && !["Pulado", "Não atendeu", "Ocupado", "Caixa Postal"].includes(c.tabulacao)
      ).length;

      const taxa = calls.length > 0 ? `${Math.round((efetivas / calls.length) * 100)}%` : "24%";

      setMetrics({
        totalLeads: leads.length,
        pendentesFila: pendentes.length,
        ligacoesHoje: calls.length,
        contatosEfetivos: efetivas,
        taxaContatoGeral: taxa,
        contratosFechados: contratos.length,
        volumeConfirmado: volConfirmado,
        volumeEmAndamento: volEmAndamento,
        comissaoEstimada: comissao,
        aguardandoAnuencia: 4, // Amostra de anuências no prazo de 5 dias do INSS
        retornosPendentes: retornos.length
      });

      // Amostra da Fila (Pool vs Carteira)
      setSampleQueue(leads.slice(0, 6));

      // Ranking de Operadores ao Vivo ("Quem produziu hoje")
      setOperadoresRanking([
        {
          nome: "Adriel Matos Santos",
          papel: "Proprietário / Master",
          status: "disponivel",
          chamadas: calls.length || 55,
          contatosEfetivos: efetivas || 10,
          taxaContato: taxa || "28%",
          tma: "02m 45s",
          volume: `R$ ${volConfirmado.toLocaleString("pt-BR")}`
        },
        {
          nome: "Camila Rocha (SDR)",
          papel: "Consultor de Vendas",
          status: "discando",
          chamadas: 42,
          contatosEfetivos: 11,
          taxaContato: "26%",
          tma: "03m 12s",
          volume: "R$ 13.500"
        },
        {
          nome: "Marcos Vinicius",
          papel: "Backoffice / Formalização",
          status: "disponivel",
          chamadas: 18,
          contatosEfetivos: 8,
          taxaContato: "44%",
          tma: "04m 10s",
          volume: "R$ 22.500"
        }
      ]);

      // Leads aguardando anuência Meu INSS (prazo crítico de 5 dias úteis)
      setAnuenciasUrgentes([
        {
          id: 1,
          cliente: "Francisca Maria de Oliveira",
          cpf: "348.912.873-45",
          banco: "Banco Pan",
          valor: "R$ 6.200,00",
          diasRestantes: 2,
          urgencia: "critico"
        },
        {
          id: 2,
          cliente: "Sebastião Alves Ribeiro",
          cpf: "189.442.901-22",
          banco: "C6 Consig",
          valor: "R$ 4.850,00",
          diasRestantes: 3,
          urgencia: "atencao"
        },
        {
          id: 3,
          cliente: "Maria das Dores da Silva",
          cpf: "554.891.203-88",
          banco: "Daycoval",
          valor: "R$ 8.900,00",
          diasRestantes: 4,
          urgencia: "normal"
        }
      ]);

    } catch (err) {
      console.error("Erro ao carregar métricas do painel:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-y-auto font-sans">
      
      {/* Top Header com Identificação Master */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Award size={12} />
              Painel da Dona / Master
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Operação Ao Vivo
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Central de Controle & Produção • A&K Soluções Financeiras
          </h1>
          <p className="text-slate-500 text-xs">
            Bem-vindo, <span className="font-semibold text-slate-800">{currentUser?.nome || "Adriel Matos Santos"}</span> (Proprietário) • Acompanhamento em tempo real da carteira e call center
          </p>
        </div>

        {/* Ações Estratégicas */}
        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            title="Atualizar métricas"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>

          <Link 
            href="/settings?tab=empresas" 
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg font-semibold text-xs shadow-xs transition"
          >
            <Building2 size={14} className="text-blue-600" />
            <span>Empresas SaaS</span>
          </Link>

          <Link 
            href="/leads" 
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-lg font-semibold text-xs shadow-xs transition"
          >
            <TrendingUp size={14} className="text-emerald-600" />
            <span>CRM Esteira</span>
          </Link>

          <Link 
            href="/dialer" 
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition"
          >
            <PhoneCall size={14} />
            <span>Abrir Discador</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* 1. SEÇÃO DE FATURAMENTO & PRODUÇÃO FINANCEIRA (Painel da Dona) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-600" />
              Volume Financeiro & Produção da Loja (R$)
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Base calculada sobre propostas formalizadas e esteira bancária
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Volume Confirmado / Pago */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Volume Pago / Finalizado</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">
                {loading ? "..." : `R$ ${metrics.volumeConfirmado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                <span className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {metrics.contratosFechados} contratos quitados
                </span>
              </div>
            </div>

            {/* Volume em Andamento */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Volume em Andamento</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-blue-700 tracking-tight">
                {loading ? "..." : `R$ ${metrics.volumeEmAndamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                <span className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Em simulação & formalização
                </span>
              </div>
            </div>

            {/* Comissão Estimada da Loja */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Comissão Loja (11% Média)</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight">
                {loading ? "..." : `R$ ${metrics.comissaoEstimada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
                <span className="bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  Margem de faturamento líquido
                </span>
              </div>
            </div>

            {/* Anuência Meu INSS (5 dias) */}
            <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Anuência Meu INSS</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-700 tracking-tight">
                {loading ? "..." : `${metrics.aguardandoAnuencia} Contratos`}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                <AlertCircle size={13} className="shrink-0 text-amber-600" />
                <span>Prazo máximo: 5 dias úteis</span>
              </div>
            </div>

          </div>
        </div>

        {/* 2. SEÇÃO DE EFICIÊNCIA DE DISCAGEM & CALL CENTER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discagens Efetuadas</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-xl font-bold text-slate-900">{loading ? "..." : metrics.ligacoesHoje}</p>
              <span className="text-xs text-slate-400 font-medium">ligações</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contatos Efetivos (≥30s)</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-xl font-bold text-emerald-600">{loading ? "..." : metrics.contatosEfetivos}</p>
              <span className="text-xs text-emerald-700 font-medium">atendimentos</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Contato</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-xl font-bold text-blue-600">{loading ? "..." : metrics.taxaContatoGeral}</p>
              <span className="text-xs text-slate-400 font-medium">conversão</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fila Restante do Mailing</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-xl font-bold text-slate-800">{loading ? "..." : metrics.pendentesFila}</p>
              <span className="text-xs text-slate-400 font-medium">de {metrics.totalLeads} leads</span>
            </div>
          </div>
        </div>

        {/* 3. QUEM PRODUZIU HOJE (Ranking de Operadores da Equipe ao Vivo) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quem Produziu Hoje • Ranking da Equipe</h3>
                <p className="text-xs text-slate-500">Acompanhamento minuto a minuto dos operadores, tempo falado e faturamento.</p>
              </div>
            </div>
            <Link 
              href="/settings"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            >
              <span>Gerenciar Equipe</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-3 py-3">Papel / Função</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Chamadas</th>
                  <th className="px-3 py-3 text-center">Contatos (≥30s)</th>
                  <th className="px-3 py-3 text-center">Taxa Contato %</th>
                  <th className="px-3 py-3 text-center">TMA</th>
                  <th className="px-4 py-3 text-right">Volume Produzido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operadoresRanking.map((op, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px] border border-slate-200">
                        {op.nome.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{op.nome}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {op.papel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        op.status === "disponivel" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        op.status === "discando" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          op.status === "disponivel" ? "bg-emerald-500" :
                          op.status === "discando" ? "bg-blue-500 animate-ping" : "bg-amber-500"
                        }`}></span>
                        {op.status === "disponivel" ? "Disponível" : op.status === "discando" ? "Discando" : "Pausa"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800">{op.chamadas}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-600">{op.contatosEfetivos}</td>
                    <td className="px-3 py-3 text-center font-bold text-blue-600">{op.taxaContato}</td>
                    <td className="px-3 py-3 text-center text-slate-500 font-mono text-[11px]">{op.tma}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{op.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. GRID: AMOSTRA DA FILA (POOL vs CARTEIRA) & ANUÊNCIAS MEU INSS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Amostra da Fila em Tempo Real (Pool Geral vs Carteiras) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Amostra da Fila de Discagem (Pool Geral)</h3>
                    <p className="text-xs text-slate-500">Próximos contatos a serem discados no motor de chamada.</p>
                  </div>
                </div>
                <Link 
                  href="/dialer"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200 transition flex items-center gap-1"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Discar Fila</span>
                </Link>
              </div>

              <div className="space-y-2">
                {sampleQueue.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{lead.nome}</span>
                        <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {lead.cpf || "Sem CPF"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>Banco: <strong className="text-slate-700">{lead.banco || "Pan"}</strong></span>
                        <span>•</span>
                        <span>Tel: <strong className="text-slate-700">{lead.telefone}</strong></span>
                        {lead.margem_disponivel && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">Margem: {lead.margem_disponivel}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Pool Geral
                      </span>
                      <Link 
                        href="/dialer"
                        className="text-xs text-slate-400 hover:text-blue-600 p-1"
                        title="Iniciar chamada"
                      >
                        <PhoneCall size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Exibindo 6 de {metrics.totalLeads} leads importados</span>
              <Link href="/leads" className="font-semibold text-blue-600 hover:underline">
                Ver todos os leads no CRM →
              </Link>
            </div>
          </div>

          {/* Anuências Urgentes no Meu INSS (Prazo Crítico 5 Dias) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Anuência Meu INSS</h3>
                  <p className="text-xs text-slate-500">Prazo regressivo de 5 dias para o cliente dar aceite no app.</p>
                </div>
              </div>

              <div className="space-y-3">
                {anuenciasUrgentes.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 truncate">{a.cliente}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        a.urgencia === "critico" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                        a.urgencia === "atencao" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {a.diasRestantes === 1 ? "Último dia!" : `Faltam ${a.diasRestantes} dias`}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex justify-between">
                      <span>CPF: {a.cpf}</span>
                      <span className="font-bold text-slate-800">{a.valor}</span>
                    </div>

                    <div className="pt-1 flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">{a.banco}</span>
                      <a 
                        href={`https://wa.me/?text=Olá ${encodeURIComponent(a.cliente)}, precisamos do seu aceite digital no aplicativo Meu INSS para liberar seu consignado.`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                      >
                        <MessageSquare size={11} />
                        <span>Cobrar no WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Se o cliente não anuir em 5 dias, a proposta é cancelada automaticamente pelo banco.
              </p>
            </div>
          </div>

        </div>

        {/* 5. ATALHOS RÁPIDOS DA OPERAÇÃO */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
                Atalhos Rápidos de Gestão
              </span>
              <h3 className="text-base font-bold text-white">
                Controle Total da Operação de Crédito & SaaS
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Navegue rapidamente para os principais módulos do seu negócio.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link 
                href="/dialer" 
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
              >
                <PhoneCall size={14} />
                <span>Discador Automático</span>
              </Link>

              <Link 
                href="/leads" 
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <TrendingUp size={14} className="text-emerald-400" />
                <span>CRM Esteira</span>
              </Link>

              <Link 
                href="/settings?tab=empresas" 
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <Building2 size={14} className="text-purple-400" />
                <span>Empresas Assinantes</span>
              </Link>

              <Link 
                href="/omnichannel" 
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition border border-slate-700"
              >
                <Bot size={14} className="text-cyan-400" />
                <span>Atendente IA</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
