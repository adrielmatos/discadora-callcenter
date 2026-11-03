import Image from "next/image";
import { 
  Smartphone, 
  Workflow, 
  Calculator, 
  BookOpenCheck, 
  Repeat, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";

interface FeaturesGridProps {
  onOpenDemoModal: () => void;
}

const features = [
  {
    id: "phone-link",
    icon: Smartphone,
    title: "Discador Preditivo & Softphone WebRTC",
    badge: "Zero Custo VoIP",
    description:
      "Automatiza o 'Vincular ao Celular' e WebRTC para discar pelo chip ilimitado do seu operador. Sem tarifas por minuto, sem bloqueios de operadora e sem complicação de PABX.",
    bullets: ["100% no chip do celular ou WebRTC", "Compatível com Android e iPhone", "Zero tarifas de telefonia"],
    image: "/mockups/dialer.png",
  },
  {
    id: "esteira-inss",
    icon: Workflow,
    title: "CRM & Funil de Tabulações Kanban",
    badge: "Foco no Fechamento",
    description:
      "Pipeline completo com 8 etapas: Fila → Interessado → Simulação → Proposta → Contrato Fechado, com filtros rápidos e inteligência artificial Sofia.",
    bullets: ["8 etapas de funil padronizadas", "Filtros por Sofia AI e Operador", "Esteira de propostas e contratos"],
    image: "/mockups/leads.png",
  },
  {
    id: "simulador-margem",
    icon: Calculator,
    title: "Gestão de Tarefas & Produtividade",
    badge: "Follow-up Ativo",
    description:
      "Organize a rotina operacional com controle diário de pendências, lembretes de contato e tarefas dos operadores para nunca perder uma negociação.",
    bullets: ["Controle de pendências diárias", "Alertas de tarefas vencendo", "Produtividade individual do operador"],
    image: "/mockups/tasks.png",
  },
  {
    id: "roteiro-objecoes",
    icon: BookOpenCheck,
    title: "Roteiro & Catálogo de Scripts",
    badge: "Mais Conversão",
    description:
      "Roteiro interativo direto na tela da chamada com catálogo completo de produtos (FGTS, INSS, SIAPE, Portabilidade) e argumentação rápida de objeções.",
    bullets: ["Scripts segmentados por produto", "Tratamento de objeções ao vivo", "Atualização instantânea pelo gestor"],
    image: "/mockups/scripts.png",
  },
  {
    id: "cadencia-rechamada",
    icon: Repeat,
    title: "Agenda de Retornos Sincronizada",
    badge: "Não Queima Base",
    description:
      "Sincronização em tempo real das chamadas agendadas pelo discador, com histórico detalhado e atalhos rápidos para ligação e WhatsApp.",
    bullets: ["Rechamadas com horário exato", "Disparo direto no WhatsApp", "Status em tempo real"],
    image: "/mockups/retornos.png",
  },
  {
    id: "lgpd-bloqueio",
    icon: ShieldCheck,
    title: "Painel da Central & Métricas",
    badge: "Visão 360º",
    description:
      "Acompanhe volume de leads na fila, chamadas ativas, contratos fechados, taxa de contato e colaboradores online em tempo real.",
    bullets: ["Métricas executivas em tempo real", "Colaboradores e carteiras ativas", "Auditoria completa de segurança"],
    image: "/mockups/dashboard.png",
  },
];

export default function FeaturesGrid({ onOpenDemoModal }: FeaturesGridProps) {
  return (
    <section id="funcionalidades" className="py-20 md:py-28 bg-navy-950 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-royal/20 border border-brand-blue/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
            <span>Diferenciais Exclusivos</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Tudo o Que Seu Correspondente Precisa para{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Vender Mais Consignado
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Criado especificamente para a realidade de promotoras de crédito e call centers de consignado.
            Sem funções genéricas de CRM que ninguém usa.
          </p>
        </div>

        {/* Features 3x2 Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                id={feature.id}
                className="bg-navy-900/80 rounded-2xl border border-navy-700/80 overflow-hidden shadow-xl hover:border-brand-blue/60 transition-all duration-300 flex flex-col justify-between group scroll-mt-28"
              >
                {/* Visual Preview Header */}
                <div className="relative aspect-[16/9] w-full bg-navy-950 overflow-hidden border-b border-navy-800">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 z-10">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-navy-950/90 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                      {feature.badge}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-navy-850 flex items-center justify-center text-amber-400 border border-navy-700 mb-4 group-hover:bg-amber-400 group-hover:text-navy-950 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                  </div>

                  <div>
                    <ul className="space-y-1.5 border-t border-navy-800 pt-4 mb-5">
                      {feature.bullets.map((bullet, i) => (
                        <li key={i} className="text-xs text-slate-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={onOpenDemoModal}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors group-hover:underline"
                    >
                      <span>Ver demonstração deste recurso</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
