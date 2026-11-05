"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { 
  Calculator, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Users,
  TrendingDown,
  Sparkles
} from "lucide-react";

interface RoiCalculatorProps {
  onOpenDemoModal: (extraMessage?: string) => void;
}

// Função única de precificação oficial por faixas (R$ 49,90, R$ 179,90, R$ 349,90 e >30 consultor)
export function getPlatformPrice(operators: number): {
  cost: number;
  formatted: string;
  isConsultant: boolean;
  tierName: string;
} {
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (operators <= 1) {
    return {
      cost: 49.90,
      formatted: formatter.format(49.90),
      isConsultant: false,
      tierName: "Iniciante / Individual (1 operador)",
    };
  }
  if (operators <= 5) {
    return {
      cost: 179.90,
      formatted: formatter.format(179.90),
      isConsultant: false,
      tierName: "Equipe Pro (2 a 5 operadores)",
    };
  }
  if (operators <= 30) {
    return {
      cost: 349.90,
      formatted: formatter.format(349.90),
      isConsultant: false,
      tierName: "Operação Escala (6 a 30 operadores)",
    };
  }
  return {
    cost: 349.90,
    formatted: "Sob consulta com consultor",
    isConsultant: true,
    tierName: "Enterprise (>30 operadores)",
  };
}

// Hook de animação numérica suave (requestAnimationFrame) estilo Nubank/Apple
function useAnimatedNumber(targetValue: number, durationMs: number = 250): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const currentValRef = useRef(displayValue);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = currentValRef.current;
    const diff = targetValue - startValue;

    if (Math.abs(diff) < 1) {
      setDisplayValue(targetValue);
      currentValRef.current = targetValue;
      return;
    }

    let frameId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      // Easing out cubic: 1 - pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(startValue + diff * easeProgress);
      setDisplayValue(nextVal);
      currentValRef.current = nextVal;

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [targetValue, durationMs]);

  return displayValue;
}

export default function RoiCalculator({ onOpenDemoModal }: RoiCalculatorProps) {
  const [operators, setOperators] = useState<number>(6);
  const [voipCostPerAgent, setVoipCostPerAgent] = useState<number>(350);

  // Cálculos dinâmicos em tempo real
  const monthlyVoipTotal = useMemo(() => {
    return operators * voipCostPerAgent;
  }, [operators, voipCostPerAgent]);

  const annualVoipTotal = useMemo(() => {
    return monthlyVoipTotal * 12;
  }, [monthlyVoipTotal]);

  // Custo da plataforma AK Soluções Financeiras por faixas oficiais
  const platformPriceInfo = useMemo(() => {
    return getPlatformPrice(operators);
  }, [operators]);

  const monthlyOurCost = platformPriceInfo.cost;

  const annualOurCost = useMemo(() => {
    return monthlyOurCost * 12;
  }, [monthlyOurCost]);

  // Economia mensal e anual
  const rawMonthlySavings = useMemo(() => {
    return Math.max(0, monthlyVoipTotal - monthlyOurCost);
  }, [monthlyVoipTotal, monthlyOurCost]);

  const rawAnnualSavings = useMemo(() => {
    return rawMonthlySavings * 12;
  }, [rawMonthlySavings]);

  const savingsPercent = useMemo(() => {
    if (monthlyVoipTotal <= 0) return 0;
    return Math.round((rawMonthlySavings / monthlyVoipTotal) * 100);
  }, [rawMonthlySavings, monthlyVoipTotal]);

  // Valores animados fluidamente
  const animatedMonthlySavings = useAnimatedNumber(rawMonthlySavings, 200);
  const animatedAnnualSavings = useAnimatedNumber(rawAnnualSavings, 250);
  const animatedVoipTotal = useAnimatedNumber(monthlyVoipTotal, 180);
  const animatedOurCost = useAnimatedNumber(monthlyOurCost, 180);

  // Classificação dinâmica de porte de operação
  const tierInfo = useMemo(() => {
    if (operators <= 3) {
      return {
        label: "Operação Solo / Enxuta",
        color: "from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30"
      };
    }
    if (operators <= 15) {
      return {
        label: "Operação Média em Expansão",
        color: "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30"
      };
    }
    return {
      label: "Operação Escala Call Center",
      color: "from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30"
    };
  }, [operators]);

  // Porcentagem dos sliders para track fill
  const opSliderPercent = ((operators - 1) / (40 - 1)) * 100;
  const voipSliderPercent = ((voipCostPerAgent - 150) / (650 - 150)) * 100;

  const handleCtaClick = () => {
    const msg = `Olá! Fiz a simulação na calculadora para ${operators} operadores (${tierInfo.label}) e vi que o custo de VoIP da minha equipe (${formatCurrency(
      monthlyVoipTotal
    )}/mês) cai para apenas ${formatCurrency(monthlyOurCost)}/mês com a AK Soluções Financeiras. Quero garantir essa economia!`;
    onOpenDemoModal(msg);
  };

  return (
    <section id="calculadora" className="py-20 md:py-28 relative bg-[#040814] overflow-hidden">
      {/* Background Accent Gradients Reativos */}
      <div 
        className="absolute top-1/2 left-0 w-96 h-96 bg-blue-600/10 blur-[130px] rounded-full pointer-events-none transition-all duration-500" 
        style={{ opacity: 0.4 + (operators / 40) * 0.4 }}
      />
      <div 
        className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/15 blur-[140px] rounded-full pointer-events-none transition-all duration-500" 
        style={{ opacity: 0.5 + (operators / 40) * 0.5 }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm shadow-amber-500/10">
            <Calculator className="w-3.5 h-3.5" />
            <span>Simulador de Economia Real</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Veja Quanto Dinheiro Você Está{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Deixando no Ralo do VoIP
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Discadores tradicionais cobram mensalidade por posto mais cobrança por minuto falado.
            Com a AK Soluções Financeiras, sua chamada sai pelo chip ilimitado do celular dos operadores via PC.
          </p>
        </div>

        {/* Calculator Grid Box */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Sliders Input Panel - Nubank / Neon style */}
          <div className="lg:col-span-7 bg-slate-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <span className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Configure Sua Operação</span>
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border bg-gradient-to-r ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              </div>

              {/* Slider 1: Operators */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white">
                    Quantos operadores discam na sua equipe?
                  </label>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800 shadow-inner">
                    {operators} {operators === 1 ? "operador" : "operadores"}
                  </span>
                </div>
                
                {/* Custom Filled Gradient Track */}
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={operators}
                    onChange={(e) => setOperators(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f97316 ${opSliderPercent}%, #090d16 ${opSliderPercent}%, #090d16 100%)`
                    }}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-amber-400 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                  <span>1 op</span>
                  <span>10 ops</span>
                  <span>20 ops</span>
                  <span>30 ops</span>
                  <span>40+ ops</span>
                </div>
              </div>

              {/* Slider 2: Current VoIP Cost Per Agent */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white">
                    Gasto médio por operador com telefonia/minutos:
                  </label>
                  <span className="text-sm sm:text-base font-bold text-slate-200 font-mono bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 shadow-inner">
                    {formatCurrency(voipCostPerAgent)}/mês
                  </span>
                </div>

                {/* Custom Filled Gradient Track */}
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min="150"
                    max="650"
                    step="25"
                    value={voipCostPerAgent}
                    onChange={(e) => setVoipCostPerAgent(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #38bdf8 0%, #0284c7 ${voipSliderPercent}%, #090d16 ${voipSliderPercent}%, #090d16 100%)`
                    }}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-sky-400 outline-none transition-all shadow-inner"
                  />
                </div>
                
                {/* Total gasto calculado automaticamente com ticker animado */}
                <div className="mt-5 p-4 sm:p-5 bg-slate-950/90 border border-slate-800/90 rounded-2xl space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-400 font-medium">Gasto Atual no VoIP ({operators} ops):</span>
                    <span className="text-sm sm:text-base font-bold text-red-400 font-mono line-through">
                      {formatCurrency(animatedVoipTotal)}/mês
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Custo com A&K Soluções:</span>
                    </span>
                    <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                      {formatCurrency(animatedOurCost)}/mês
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider block">Sua Economia Todo Mês:</span>
                      <span className="text-xs text-emerald-400 font-bold inline-flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{savingsPercent}% de Redução</span>
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-mono">
                      {formatCurrency(animatedMonthlySavings)}/mês
                    </span>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleCtaClick}
                      className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>GARANTIR ESSA ECONOMIA NO WHATSAPP</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Considerando custo de minutos VoIP, licença de discador e tarifas de operadora.
              </span>
            </div>
          </div>

          {/* Results Summary Box - C6 Carbon / Apple Style */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border-2 border-amber-500/50 shadow-2xl shadow-amber-500/10 flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                  Resultado da Simulação
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  {savingsPercent}% de Redução
                </span>
              </div>

              {/* Comparison Numbers */}
              <div className="space-y-3.5 mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Gasto Atual no VoIP:</span>
                  <span className="font-mono text-red-400 font-semibold line-through">
                    {formatCurrency(animatedVoipTotal)}/mês
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-200 font-medium">AK Soluções Financeiras:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatCurrency(animatedOurCost)}/mês
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2 font-semibold">
                  <span className="text-amber-300">Economia Todo Mês:</span>
                  <span className="font-mono text-amber-300 font-black text-lg">
                    {formatCurrency(animatedMonthlySavings)}
                  </span>
                </div>
              </div>

              {/* Big Annual Savings Display */}
              <div className="bg-slate-950/90 rounded-2xl p-5 border border-amber-500/40 text-center mb-6 shadow-xl relative">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Sua Economia Anual Estimada
                </span>
                <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 font-mono tracking-tight py-1">
                  {formatCurrency(animatedAnnualSavings)}
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-block">
                  💰 Dinheiro que fica no caixa da sua empresa
                </span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleCtaClick}
              className="w-full py-4 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.99] shadow-lg shadow-amber-500/25 cursor-pointer bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 relative z-10"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>GARANTIR ESSA ECONOMIA NO WHATSAPP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
