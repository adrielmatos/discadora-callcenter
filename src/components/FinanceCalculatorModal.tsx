"use client";

import React, { useState, useMemo } from "react";
import { 
  Calculator, X, DollarSign, Percent, ArrowRight, 
  Copy, Check, Sparkles, TrendingUp, ShieldCheck, RefreshCw
} from "lucide-react";

interface FinanceCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName?: string;
  leadPhone?: string;
  initialMargem?: number;
  onSendSimulationWhatsApp?: (text: string) => void;
}

export default function FinanceCalculatorModal({
  isOpen,
  onClose,
  leadName,
  leadPhone,
  initialMargem = 150,
  onSendSimulationWhatsApp
}: FinanceCalculatorModalProps) {
  const [activeTab, setActiveTab] = useState<"fgts" | "portabilidade" | "margem">("fgts");
  const [copied, setCopied] = useState(false);

  // Estados FGTS
  const [saldoFgts, setSaldoFgts] = useState<number>(3500);
  const [anosFgts, setAnosFgts] = useState<number>(7);
  const taxaFgts = 0.0169; // 1,69% a.m.

  // Estados Portabilidade com Troco
  const [parcelaAtual, setParcelaAtual] = useState<number>(450);
  const [prazoRestante, setPrazoRestante] = useState<number>(64);
  const [taxaAtualEst, setTaxaAtualEst] = useState<number>(2.15); // % a.m.
  const [novaTaxa, setNovaTaxa] = useState<number>(1.68); // % a.m.

  // Estados Margem Livre Consignado (INSS / SIAPE)
  const [margemLivre, setMargemLivre] = useState<number>(initialMargem || 150);
  const [prazoConsignado, setPrazoConsignado] = useState<number>(84);
  const taxaConsignado = 0.0166; // 1.66% a.m. (teto INSS)

  // ─── CÁLCULO OFICIAL FGTS SAQUE-ANIVERSÁRIO (Tabela CEF) ───────────
  const calculoFgts = useMemo(() => {
    let saldo = saldoFgts;
    let valorLiberadoTotal = 0;

    // Calcula saque anual de acordo com alíquota e parcela adicional da Caixa
    const calcularSaqueAnual = (s: number) => {
      if (s <= 500) return s * 0.5;
      if (s <= 1000) return s * 0.4 + 50;
      if (s <= 5000) return s * 0.3 + 150;
      if (s <= 10000) return s * 0.2 + 650;
      if (s <= 15000) return s * 0.15 + 1150;
      if (s <= 20000) return s * 0.1 + 1900;
      return s * 0.05 + 2900;
    };

    // Antecipação composta de N anos trazida a valor presente com taxa mensal
    for (let i = 1; i <= Math.min(anosFgts, 10); i++) {
      if (saldo <= 50) break;
      const parcelaAno = calcularSaqueAnual(saldo);
      saldo = Math.max(0, saldo - parcelaAno);
      // Desconto a valor presente para i anos (i * 12 meses)
      const meses = i * 12;
      const valorPresente = parcelaAno / Math.pow(1 + taxaFgts, meses);
      valorLiberadoTotal += valorPresente;
    }

    // Margem líquida estimada liberada via PIX
    const valorLiquido = Math.round(valorLiberadoTotal * 0.95); // Deducao de IOF e taxas acessórias
    return {
      valorLiquido: valorLiquido > 0 ? valorLiquido : 0,
      saldoBloqueado: Math.round(saldoFgts * 0.85),
      anos: anosFgts
    };
  }, [saldoFgts, anosFgts]);

  // ─── CÁLCULO PORTABILIDADE COM TROCO ────────────────────────────────
  const calculoPortabilidade = useMemo(() => {
    // Saldo devedor estimado da dívida atual (Valor presente das parcelas atuais)
    const taxaMesAtual = (taxaAtualEst || 2.15) / 100;
    const taxaMesNova = (novaTaxa || 1.68) / 100;

    // VP da dívida atual
    const saldoDevedor = (parcelaAtual * (1 - Math.pow(1 + taxaMesAtual, -prazoRestante))) / taxaMesAtual;

    // Novo contrato refinanciado em 84 parcelas mantendo ou reduzindo parcela
    const novoPrazo = 84;
    // Valor total liberado no novo contrato com a mesma parcela
    const valorNovoTotal = (parcelaAtual * (1 - Math.pow(1 + taxaMesNova, -novoPrazo))) / taxaMesNova;

    // Troco líquido estimado = Valor Novo Total - Quitação da Dívida Antiga - IOF
    const trocoBruto = valorNovoTotal - saldoDevedor;
    const trocoLiquido = Math.max(0, Math.round(trocoBruto * 0.92));

    // Opção B: Mantém prazo e reduz a parcela
    const parcelaReduzida = (saldoDevedor * taxaMesNova) / (1 - Math.pow(1 + taxaMesNova, -prazoRestante));
    const economiaMensal = Math.max(0, Math.round(parcelaAtual - parcelaReduzida));

    return {
      trocoLiquido,
      saldoDevedorEstimado: Math.round(saldoDevedor),
      parcelaReduzida: Math.round(parcelaReduzida),
      economiaMensal,
      parcelaAtual
    };
  }, [parcelaAtual, prazoRestante, taxaAtualEst, novaTaxa]);

  // ─── CÁLCULO MARGEM LIVRE CONSIGNADO ─────────────────────────────────
  const calculoMargem = useMemo(() => {
    const i = taxaConsignado;
    const n = prazoConsignado;
    // Coeficiente Price: (1 - (1+i)^-n) / i
    const fator = (1 - Math.pow(1 + i, -n)) / i;
    const valorLiberado = Math.round(margemLivre * fator * 0.96); // Desconto de IOF
    return {
      valorLiberado: valorLiberado > 0 ? valorLiberado : 0,
      parcela: margemLivre,
      prazo: prazoConsignado
    };
  }, [margemLivre, prazoConsignado]);

  // Texto formatado para envio
  const simulationText = useMemo(() => {
    const nome = leadName || "Cliente";
    if (activeTab === "fgts") {
      return `Olá, ${nome}! 🚀 Conforme calculamos agora, com seu saldo de FGTS liberamos aproximadamente R$ ${calculoFgts.valorLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em até 2 horas direto na sua conta via PIX! Sem consulta ao SPC/Serasa e sem pagar nenhuma parcela mensal. Vamos formalizar?`;
    }
    if (activeTab === "portabilidade") {
      return `Olá, ${nome}! 💰 Excelente notícia: com a Portabilidade com Troco, mantemos sua parcela de R$ ${parcelaAtual.toFixed(2)} e liberamos cerca de R$ ${calculoPortabilidade.trocoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de TROCO em dinheiro vivo na sua conta! Reduzimos sua taxa de juros bancária. Posso gerar o link de formalização?`;
    }
    return `Olá, ${nome}! 🌟 Com sua margem disponível de R$ ${margemLivre.toFixed(2)}, liberamos R$ ${calculoMargem.valorLiberado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${prazoConsignado}x no consignado com a menor taxa do mercado! Desconto direto em folha sem boletos. Vamos fechar?`;
  }, [activeTab, leadName, calculoFgts, calculoPortabilidade, calculoMargem, parcelaAtual, margemLivre, prazoConsignado]);

  const handleCopy = () => {
    navigator.clipboard.writeText(simulationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (onSendSimulationWhatsApp) {
      onSendSimulationWhatsApp(simulationText);
    } else if (leadPhone) {
      const clean = leadPhone.replace(/\D/g, "");
      const phone = clean.startsWith("55") ? clean : `55${clean}`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(simulationText)}`, "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Calculadora de Crédito & Troco</h2>
              <p className="text-[11px] text-slate-400">Simulador de alta conversão para o operador • Padrão Fincept</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("fgts")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x cursor-pointer ${
              activeTab === "fgts"
                ? "bg-white text-blue-600 border-slate-200 -mb-px"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Saque FGTS
          </button>
          <button
            onClick={() => setActiveTab("portabilidade")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x cursor-pointer ${
              activeTab === "portabilidade"
                ? "bg-white text-emerald-600 border-slate-200 -mb-px"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Portabilidade + Troco
          </button>
          <button
            onClick={() => setActiveTab("margem")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x cursor-pointer ${
              activeTab === "margem"
                ? "bg-white text-purple-600 border-slate-200 -mb-px"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Margem Livre (INSS)
          </button>
        </div>

        {/* Corpo dos Cálculos */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* TAB 1: FGTS */}
          {activeTab === "fgts" && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Saldo Disponível no FGTS (R$):</label>
                  <span className="text-sm font-extrabold text-blue-600">
                    R$ {saldoFgts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <input 
                  type="range" 
                  min={500} 
                  max={40000} 
                  step={100}
                  value={saldoFgts} 
                  onChange={e => setSaldoFgts(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer" 
                />
                <div className="flex gap-2 mt-2">
                  {[1500, 3500, 7000, 15000].map(v => (
                    <button 
                      key={v} 
                      onClick={() => setSaldoFgts(v)}
                      className="text-[10px] font-semibold px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded border border-slate-200 cursor-pointer"
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Anos Antecipados:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map(anos => (
                    <button
                      key={anos}
                      onClick={() => setAnosFgts(anos)}
                      className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        anosFgts === anos
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {anos} Anos
                    </button>
                  ))}
                </div>
              </div>

              {/* Card de Resultado */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Valor Liberado via PIX:</span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    R$ {calculoFgts.valorLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Taxa 1,69% a.m. • Liberação média em até 2 horas
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                  <Sparkles size={22} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PORTABILIDADE COM TROCO */}
          {activeTab === "portabilidade" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Parcela Atual (R$):</label>
                  <input
                    type="number"
                    value={parcelaAtual}
                    onChange={e => setParcelaAtual(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prazo Restante (Meses):</label>
                  <input
                    type="number"
                    value={prazoRestante}
                    onChange={e => setPrazoRestante(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Taxa Atual Est. (% a.m.):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={taxaAtualEst}
                    onChange={e => setTaxaAtualEst(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nova Taxa Portabilidade:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={novaTaxa}
                    onChange={e => setNovaTaxa(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Card de Resultado */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Troco Líquido Liberado no Bolso:
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    R$ {calculoPortabilidade.trocoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1 block">
                    Mantendo a parcela atual de R$ {parcelaAtual.toFixed(2)} em 84x
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MARGEM LIVRE */}
          {activeTab === "margem" && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Margem Consignável Disponível (R$):</label>
                  <span className="text-sm font-extrabold text-purple-600">
                    R$ {margemLivre.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <input 
                  type="range" 
                  min={20} 
                  max={2500} 
                  step={10}
                  value={margemLivre} 
                  onChange={e => setMargemLivre(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prazo do Contrato:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[36, 60, 84].map(p => (
                    <button
                      key={p}
                      onClick={() => setPrazoConsignado(p)}
                      className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        prazoConsignado === p
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p} Meses
                    </button>
                  ))}
                </div>
              </div>

              {/* Card de Resultado */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">
                    Crédito Liberado em Conta:
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    R$ {calculoMargem.valorLiberado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-600 mt-1 block">
                    Taxa 1,66% a.m. • Parcela de R$ {margemLivre.toFixed(2)} descontada em folha
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
                  <DollarSign size={22} />
                </div>
              </div>
            </div>
          )}

          {/* Script de Argumentação Pronta para o Operador */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
              Texto da Simulação para o Lead:
            </span>
            <p className="text-xs text-slate-700 italic leading-relaxed">
              "{simulationText}"
            </p>
          </div>
        </div>

        {/* Rodapé com Ações Rápidas */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <span>Enviar no WhatsApp</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
