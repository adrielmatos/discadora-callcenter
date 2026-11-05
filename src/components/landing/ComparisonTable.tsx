"use client";

import { Check, X, Sparkles, ArrowRight } from "lucide-react";

interface ComparisonTableProps {
  onOpenDemoModal: () => void;
}

const comparisonRows = [
  {
    criterion: "Custo por Minuto Falado",
    us: "R$ 0,00 (Plano móvel ilimitado do chip)",
    usPositive: true,
    them: "R$ 0,08 a R$ 0,35 por minuto",
    themPositive: false,
    detail: "Em 100h de ligação/mês, o VoIP tradicional gera milhares de reais em minutos excedentes.",
  },
  {
    criterion: "Bloqueio de Chamadas e SPAM",
    us: "Livre (Ligação móvel natural celular-celular)",
    usPositive: true,
    them: "Alto risco de bloqueio e descarte de chamadas",
    themPositive: false,
    detail: "Clientes atendem 4x mais chamadas com identificador de chamada móvel comum.",
  },
  {
    criterion: "Esteira de Anuência Meu INSS",
    us: "Nativa com alerta de expiração e contagem regressiva",
    usPositive: true,
    them: "Não possui (CRM genérico)",
    themPositive: false,
    detail: "O funil acompanha os dias restantes para o cliente assinar antes do cancelamento pelo banco.",
  },
  {
    criterion: "Simulador de Margem INSS em Tela",
    us: "Integrado (bloqueia parcela acima do teto)",
    usPositive: true,
    them: "Requer calculadora externa ou sistema à parte",
    themPositive: false,
    detail: "O atendente calcula a proposta sem sair da chamada, com dados do benefício e coeficientes.",
  },
  {
    criterion: "Roteiro de Vendas com Objeções",
    us: "Checklist dinâmico + Cartões de Objeções",
    usPositive: true,
    them: "Texto estático ou inexistente",
    themPositive: false,
    detail: "Audita a aderência do operador e dá respostas prontas durante a negociação ao vivo.",
  },
  {
    criterion: "Cadência & Rediscagem por Disposição",
    us: "8 disposições com intervalo e hora preferencial",
    usPositive: true,
    them: "Cadência fixa simples ou inexistente",
    themPositive: false,
    detail: "Rechama no horário em que o lead tem maior probabilidade estatística de atender.",
  },
  {
    criterion: "Equipamento Necessário",
    us: "PC Windows + Qualquer celular que o operador já tem",
    usPositive: true,
    them: "Servidor PBX, gateways GSM ou troncos SIP caros",
    themPositive: false,
    detail: "Basta parear via Bluetooth/Wi-Fi pelo aplicativo nativo do Windows em 2 minutos.",
  },
];

export default function ComparisonTable({ onOpenDemoModal }: ComparisonTableProps) {
  return (
    <section id="comparativo" className="py-20 md:py-28 bg-[#040814] relative border-y border-slate-800/80 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-amber-500/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm shadow-amber-500/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comparativo Transparente</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Por Que Somos a Escolha Certa para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Operações de Consignado
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Compare recurso por recurso e entenda a diferença entre uma discadora genérica de VoIP e uma solução feita sob medida para crédito consignado.
          </p>
        </div>

        {/* Table Container */}
        <div className="max-w-5xl mx-auto bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80">
                  <th className="py-5 px-6 text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider w-2/5">
                    Critério / Funcionalidade
                  </th>
                  <th className="py-5 px-6 text-xs sm:text-sm font-extrabold text-amber-400 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-x-2 border-amber-500/40 w-3/10 text-center shadow-inner">
                    <span className="block text-white text-base sm:text-lg font-black">A&K Soluções</span>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Nossa Solução</span>
                  </th>
                  <th className="py-5 px-6 text-xs sm:text-sm font-bold text-slate-400 w-3/10 text-center">
                    <span className="block text-slate-300 text-sm sm:text-base">Discadoras VoIP Tradicionais</span>
                    <span className="text-[11px] font-normal text-slate-500">(Softphones e discadoras em nuvem)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {comparisonRows.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Criterion & Detail */}
                    <td className="py-4.5 px-6 text-white font-medium">
                      <div className="text-sm font-semibold">{row.criterion}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{row.detail}</div>
                    </td>

                    {/* Us (Winner) */}
                    <td className="py-4.5 px-6 bg-amber-500/[0.04] border-x-2 border-amber-500/30 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold text-emerald-300 text-xs sm:text-sm">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/30">
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        </div>
                        <span>{row.us}</span>
                      </div>
                    </td>

                    {/* Them */}
                    <td className="py-4.5 px-6 text-center text-slate-400">
                      <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <div className="w-5 h-5 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                          <X className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
                        </div>
                        <span>{row.them}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Footer CTA */}
          <div className="p-6 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs sm:text-sm text-slate-300 text-center sm:text-left font-medium">
              💡 Chega de pagar tarifas desnecessárias de telefonia no seu correspondente.
            </span>
            <button
              onClick={onOpenDemoModal}
              className="py-3 px-6 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>MIGRAR PARA A DISCADORA CONSIGNADO PRO</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
