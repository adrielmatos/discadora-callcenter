"use client";

import { siteConfig } from "@/config/site";
import { Check, Zap, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface PricingProps {
  onOpenDemoModal: (extraMessage?: string) => void;
}

export default function Pricing({ onOpenDemoModal }: PricingProps) {
  return (
    <section id="planos" className="py-20 md:py-28 bg-[#040814] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm shadow-emerald-500/10">
            <Zap className="w-3.5 h-3.5" />
            <span>Preço Fixo Sem Surpresas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Planos Transparentes para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Qualquer Tamanho de Equipe
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Você paga apenas pelo software. Nunca cobramos por minuto discado nem por volume de chamadas.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {siteConfig.plans.map((plan) => {
            const isHighlight = plan.highlight;
            return (
              <div
                key={plan.id}
                className={`rounded-3xl flex flex-col justify-between transition-all duration-300 relative ${
                  isHighlight
                    ? "bg-gradient-to-b from-blue-950/40 via-slate-900/95 to-slate-950/98 backdrop-blur-2xl border-2 border-amber-400/80 shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)] md:-translate-y-2.5 hover:-translate-y-3.5 hover:shadow-[0_0_60px_-5px_rgba(245,158,11,0.35)]"
                    : "bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-slate-700 hover:-translate-y-1 shadow-xl"
                }`}
              >
                {/* Highlight Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center z-20">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5 ${
                        isHighlight
                          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black ring-2 ring-amber-400/40"
                          : "bg-slate-800 text-slate-300 border border-slate-700"
                      }`}
                    >
                      {isHighlight && <Sparkles className="w-3 h-3 fill-slate-950" />}
                      <span>{plan.badge}</span>
                    </span>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Title & Subtitle */}
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-6 min-h-[32px] leading-relaxed">
                    {plan.subtitle}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-6 border-b border-slate-800/80 pb-6">
                    <span className="text-sm font-semibold text-slate-400">R$</span>
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight font-mono">
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-400 font-medium">
                      {plan.period}
                    </span>
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isHighlight
                              ? "bg-amber-400/20 text-amber-400 ring-1 ring-amber-400/40"
                              : "bg-emerald-400/20 text-emerald-400 ring-1 ring-emerald-400/30"
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div className="p-6 sm:p-8 pt-0">
                  <button
                    onClick={() => {
                      const msg = `Olá! Gostaria de contratar ou testar o ${plan.name} (R$ ${plan.price}/mês) da AK Soluções Financeiras.`;
                      onOpenDemoModal(msg);
                    }}
                    className={`w-full py-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isHighlight
                        ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99]"
                        : "bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 active:scale-[0.99]"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2.5">
                    Sem fidelidade • Cancele a qualquer momento
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom enterprise banner */}
        <div className="mt-14 max-w-4xl mx-auto bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0 border border-slate-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Precisa de uma proposta customizada para mais de 30 operadores?
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Atendemos grandes correspondentes com servidor dedicado, regras de rodízio avançadas e onboarding VIP.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onOpenDemoModal(
                "Olá! Possuo uma operação com mais de 30 operadores e gostaria de uma proposta personalizada para a AK Soluções Financeiras."
              )
            }
            className="text-xs font-extrabold text-amber-400 hover:text-amber-300 whitespace-nowrap px-5 py-2.5 rounded-xl bg-slate-800 border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer shadow-sm"
          >
            Falar com Consultor Enterprise →
          </button>
        </div>
      </div>
    </section>
  );
}
