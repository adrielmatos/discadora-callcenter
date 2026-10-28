"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  PhoneCall, Bot, Kanban, ShieldCheck, CheckCircle2, ArrowRight, 
  Sparkles, Zap, Users, BarChart3, Lock, MessageSquare, Headphones, 
  ChevronRight, Building2, Phone, Star, ShieldAlert
} from "lucide-react";

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"mensal" | "anual">("mensal");

  const plans = [
    {
      name: "Starter",
      badge: "Para Pequenas Equipes",
      description: "Ideal para correspondentes bancários iniciando na prospecção ativa.",
      price: billingPeriod === "mensal" ? "R$ 297" : "R$ 247",
      period: "/mês",
      features: [
        "Até 3 Operadores Simultâneos",
        "Discador WebRTC com 1 Clique",
        "CRM & Esteira de Contratos",
        "Validação de Não Perturbe (DND)",
        "Scripts de Atendimento Bacen",
        "Suporte via WhatsApp Comercial"
      ],
      popular: false,
      ctaText: "Começar no Starter",
      ctaLink: "/login"
    },
    {
      name: "Pro Performance",
      badge: "Mais Popular • Alta Conversão",
      description: "A solução completa com IA Sofia para escalar vendas e faturamento.",
      price: billingPeriod === "mensal" ? "R$ 597" : "R$ 497",
      period: "/mês",
      features: [
        "Até 10 Operadores Simultâneos",
        "Discador Preditivo & Softphone WebRTC",
        "Atendente Sofia IA no WhatsApp 24h",
        "Importação de Planilhas Ilimitada",
        "Acompanhamento de Margem & Saldo",
        "Extensão WhatsApp Anti-Ban Inclusa",
        "Relatórios de Contato & TMA",
        "Suporte Prioritário"
      ],
      popular: true,
      ctaText: "Testar Plano Pro",
      ctaLink: "/login"
    },
    {
      name: "Enterprise",
      badge: "Para Grandes Operações",
      description: "Infraestrutura dedicada com suporte executivo e múltiplos ramais PABX.",
      price: "Sob Consulta",
      period: "",
      features: [
        "Operadores e Ramais Ilimitados",
        "Múltiplas Empresas / Filiais (Multi-Tenant)",
        "PABX em Nuvem & URA Reversa Dedicada",
        "Treinamento de IA Personalizado",
        "Trilha de Auditoria Completa (LGPD)",
        "SLA de Atendimento Garantido",
        "Gerente de Conta Exclusivo"
      ],
      popular: false,
      ctaText: "Falar com Consultor",
      ctaLink: "https://wa.me/5571999191691?text=Ol%C3%A1!%20Gostaria%20de%20conhecer%20o%20plano%20Enterprise%20do%20Consignado%20360."
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-blue-600 selection:text-white font-sans">
      
      {/* ─── 1. NAVBAR PÚBLICA ────────────────────────────────────── */}
      <nav className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
              AK
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-base block leading-none">
                Consignado 360
              </span>
              <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase block mt-0.5">
                Call Center Pro & IA
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#recursos" className="hover:text-white transition">Recursos</a>
            <a href="#discador" className="hover:text-white transition">Discador Preditivo</a>
            <a href="#sofia" className="hover:text-white transition">Sofia IA WhatsApp</a>
            <a href="#planos" className="hover:text-white transition">Planos & Preços</a>
            <a href="#seguranca" className="hover:text-white transition">Segurança & LGPD</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-200 hover:text-white px-3.5 py-2 rounded-xl transition hover:bg-slate-800"
            >
              Entrar no Sistema
            </Link>
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-1.5"
            >
              <span>Acessar Grátis</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── 2. HERO SECTION ──────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-800/60">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-500/30 text-blue-300 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-inner">
            <Sparkles size={14} className="text-blue-400" />
            <span>A Plataforma Mais Completa para Correspondentes Bancários & Call Centers</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Discador Preditivo, Sofia IA no WhatsApp e CRM em um <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">único ecossistema</span>.
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Elimine o tempo ocioso entre chamadas, automatize a qualificação de clientes no WhatsApp 24h por dia e gerencie sua esteira de FGTS e INSS com controle absoluto de segurança e isolamento.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2"
            >
              <span>Acessar Plataforma Agora</span>
              <ArrowRight size={16} />
            </Link>
            <a
              href="https://wa.me/5571999191691?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20Consignado%20360."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm px-6 py-3.5 rounded-2xl transition flex items-center justify-center gap-2"
            >
              <MessageSquare size={16} className="text-emerald-400" />
              <span>Falar com Especialista</span>
            </a>
          </div>

          {/* Métricas Comprovadas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 text-left">
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <span className="text-2xl font-black text-white block">4x Mais</span>
              <span className="text-xs text-slate-400 font-medium">Contatos efetivos por operador/dia</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <span className="text-2xl font-black text-emerald-400 block">100% Zero</span>
              <span className="text-xs text-slate-400 font-medium">Rolagem de tela no Discador WebRTC</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <span className="text-2xl font-black text-blue-400 block">24h / 7d</span>
              <span className="text-xs text-slate-400 font-medium">Atendimento Sofia IA no WhatsApp</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <span className="text-2xl font-black text-purple-400 block">Bacen & LGPD</span>
              <span className="text-xs text-slate-400 font-medium">Conformidade e RLS Multi-Tenant</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. RECURSOS PRINCIPAIS (GRID) ────────────────────────── */}
      <section id="recursos" className="py-20 border-b border-slate-800/60 relative">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-950/70 border border-blue-500/30 px-3 py-1 rounded-full">
              Poder Operacional Completo
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Tudo o que sua equipe precisa para bater metas todos os dias.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Elimine ferramentas soltas. Da ligação ao contrato averbado, tudo flui sem atritos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Discador */}
            <div id="discador" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <PhoneCall size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Discador Preditivo & Softphone WebRTC</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tela única sem rolagem (100vh), com 4 etapas de script dinâmico, contorno instantâneo de objeções e discagem em 1 clique direto no fone.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Bloqueio de Não Perturbe (DND) automático</li>
                <li className="flex items-center gap-2">✓ Tabulação em 1 clique (Contrato, Proposta, Retorno)</li>
                <li className="flex items-center gap-2">✓ Suporte a Ramal SIP ou Linha Celular</li>
              </ul>
            </div>

            {/* Card 2: Sofia IA */}
            <div id="sofia" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bot size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Sofia IA Especialista no WhatsApp</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Atendente virtual com inteligência artificial humanizada. Responde dúvidas, quebra objeções e qualifica o saldo do cliente antes de transferir para o operador.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Atendimento automático 24 horas por dia</li>
                <li className="flex items-center gap-2">✓ Sincronização direta no CRM de vendas</li>
                <li className="flex items-center gap-2">✓ Modos WhatsApp Web Anti-Ban e API Oficial</li>
              </ul>
            </div>

            {/* Card 3: CRM Consignado */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-purple-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Kanban size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">CRM & Esteira de Crédito</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kanban visual completo para Saque FGTS, INSS, BPC/LOAS e Crédito em Folha. Acompanhe propostas, anuências pendentes e comissões em tempo real.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Alerta de prazo crítico de 5 dias Meu INSS</li>
                <li className="flex items-center gap-2">✓ Histórico auditado de todas as ligações</li>
                <li className="flex items-center gap-2">✓ Agendamento e aviso automático de retornos</li>
              </ul>
            </div>

            {/* Card 4: Importador */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-amber-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Higienização & Mailing Rápido</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Importe planilhas de qualquer formato (XLS, XLSX, CSV). O sistema normaliza números brasileiros e distribui entre os operadores sem colisão.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Deduplicação automática de contatos</li>
                <li className="flex items-center gap-2">✓ Leitura inteligente de colunas e bancos</li>
                <li className="flex items-center gap-2">✓ Fila concorrente com trava atômica</li>
              </ul>
            </div>

            {/* Card 5: Extensão Anti-Ban */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-teal-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Extensão Sofia Anti-Ban</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dispare propostas e mensagens personalizadas no WhatsApp Web nativo do seu navegador com risco zero de bloqueio e custo R$ 0,00 por mensagem.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Compatível com Chrome e Edge</li>
                <li className="flex items-center gap-2">✓ Download em pacote ZIP seguro</li>
                <li className="flex items-center gap-2">✓ Sem necessidade de QR Codes instáveis</li>
              </ul>
            </div>

            {/* Card 6: Multi-Tenant */}
            <div id="seguranca" className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-500/40 transition">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold text-white">Segurança Enterprise & LGPD</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Isolamento rígido entre empresas no banco de dados (Row Level Security). Seus leads, gravações e clientes nunca são acessados por terceiros.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">✓ Banco Supabase com RLS ativo</li>
                <li className="flex items-center gap-2">✓ Bloqueio imediato de contas suspensas</li>
                <li className="flex items-center gap-2">✓ Auditoria de ações administrativas</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ─── 4. PLANOS E PREÇOS ───────────────────────────────────── */}
      <section id="planos" className="py-20 border-b border-slate-800/60 relative">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full">
              Investimento Transparente
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Planos dimensionados para o tamanho da sua operação.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Sem taxas ocultas, sem fidelidade abusiva. Liberação imediata após a confirmação.
            </p>

            {/* Alternador Mensal / Anual */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setBillingPeriod("mensal")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingPeriod === "mensal"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                onClick={() => setBillingPeriod("anual")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  billingPeriod === "anual"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <span>Cobrança Anual</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  -20% OFF
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-3xl p-7 flex flex-col justify-between transition-all relative ${
                  plan.popular
                    ? "bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950/40 border-2 border-blue-500 shadow-2xl shadow-blue-500/10 scale-105"
                    : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow">
                    ⭐ Escolha Mais Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                      {plan.badge}
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                  </div>

                  <div className="pt-2 pb-4 border-b border-slate-800">
                    <span className="text-3xl sm:text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-xs font-medium text-slate-400 ml-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  <Link
                    href={plan.ctaLink}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. RODAPÉ COMERCIAL ─────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              AK
            </div>
            <div>
              <p className="text-white font-bold text-sm">Consignado 360 • A&K Soluções</p>
              <p className="text-[11px] text-slate-500">Call Center Pro, Discador Preditivo e IA para Correspondentes Bancários.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <Link href="/download-extensao" className="hover:text-white transition">Extensão WhatsApp</Link>
            <Link href="/login" className="hover:text-white transition">Área do Cliente</Link>
            <a href="https://wa.me/5571999191691" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Suporte Comercial</a>
          </div>

          <p className="text-[11px] text-slate-600 text-center md:text-right">
            © {new Date().getFullYear()} A&K Soluções Financeiras. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
