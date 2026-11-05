"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { 
  Smartphone, 
  Workflow, 
  Calculator, 
  BookOpenCheck, 
  Repeat, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  BarChart3,
  Film,
  Play,
  X
} from "lucide-react";

interface FeaturesGridProps {
  onOpenDemoModal: () => void;
}

const features = [
  {
    id: "phone-link",
    icon: Smartphone,
    title: "Discador pelo celular & Softphone WebRTC",
    badge: "Zero Custo VoIP",
    tagline: "Disque pelo chip do celular via PC ou WebRTC nativo",
    description:
      "Automatiza o 'Vincular ao Celular' e WebRTC para discar pelo chip ilimitado do seu operador. Sem tarifas por minuto, sem bloqueios de operadora e sem complicação de servidores SIP.",
    bullets: [
      "100% no chip do celular Android / iPhone ou WebRTC", 
      "Zero custo de minutos falados ou tarifas", 
      "Quebra de objeções ao vivo na tela da chamada"
    ],
    image: "/mockups/dialer.png",
    featured: true,
    colSpan: "lg:col-span-2",
  },
  {
    id: "esteira-inss",
    icon: Workflow,
    title: "CRM & Funil de Tabulações Kanban",
    badge: "Foco no Fechamento",
    tagline: "Pipeline com 8 etapas padronizadas para consignado",
    description:
      "Pipeline completo de negociação: Fila de Espera → Interessado → Simulação → Proposta → Contrato Fechado, com filtros rápidos e inteligência artificial Sofia.",
    bullets: [
      "8 etapas de funil padronizadas", 
      "Filtros instantâneos por Sofia AI e Operador", 
      "Esteira integrada de formalização e anuência"
    ],
    image: "/mockups/leads.png",
    featured: true,
    colSpan: "lg:col-span-1",
  },
  {
    id: "simulador-margem",
    icon: Calculator,
    title: "Tarefas & Produtividade Operacional",
    badge: "Follow-up Ativo",
    tagline: "Controle diário de pendências e contatos",
    description:
      "Organize a rotina operacional com controle diário de pendências, lembretes de contato e tarefas dos operadores para nunca perder uma negociação em andamento.",
    bullets: [
      "Controle de pendências diárias em tempo real", 
      "Alertas visuais de tarefas vencendo hoje", 
      "Produtividade e métricas por operador"
    ],
    image: "/mockups/tasks.png",
    featured: false,
    colSpan: "lg:col-span-1",
  },
  {
    id: "roteiro-objecoes",
    icon: BookOpenCheck,
    title: "Catálogo de Roteiros & Scripts Dinâmicos",
    badge: "Mais Conversão",
    tagline: "Roteiros por produto e argumentação rápida",
    description:
      "Roteiro interativo direto na tela da chamada com catálogo completo de produtos (FGTS, INSS, SIAPE, Portabilidade) e argumentação rápida de objeções comuns.",
    bullets: [
      "Scripts segmentados por produto", 
      "Tratamento de objeções ao vivo com 1 clique", 
      "Padronização e melhoria contínua do pitch"
    ],
    image: "/mockups/scripts.png",
    featured: false,
    colSpan: "lg:col-span-1",
  },
  {
    id: "cadencia-rechamada",
    icon: Repeat,
    title: "Agenda de Retornos Sincronizada",
    badge: "Não Queima Base",
    tagline: "Rechamadas pontuais e integração com WhatsApp",
    description:
      "Sincronização em tempo real das chamadas agendadas pelo discador, com histórico detalhado e atalhos rápidos para re-discagem e envio no WhatsApp.",
    bullets: [
      "Rechamadas com horário exato e alerta", 
      "Disparo com 1 clique para WhatsApp", 
      "Sem risco de ligar duas vezes para o mesmo cliente"
    ],
    image: "/mockups/retornos.png",
    featured: false,
    colSpan: "lg:col-span-1",
  },
  {
    id: "painel-central",
    icon: ShieldCheck,
    title: "Painel Executivo & Visão 360º",
    badge: "Tempo Real",
    tagline: "Métricas executivas da operação ao vivo",
    description:
      "Acompanhe volume de leads na fila, chamadas ativas, contratos fechados, taxa de contato, agenda do dia e colaboradores online em tempo real.",
    bullets: [
      "Métricas consolidadas em tempo real", 
      "Gestão de colaboradores e carteiras ativas", 
      "Controle total de status e produtividade"
    ],
    image: "/mockups/dashboard.png",
    featured: true,
    colSpan: "lg:col-span-2",
  },
  {
    id: "metricas-performance",
    icon: BarChart3,
    title: "Resultados & Performance Analítica",
    badge: "Alta Gestão",
    tagline: "Ranking e relatórios para tomada de decisão",
    description:
      "Relatórios detalhados de efetividade de discagem, tempo de conversação e ranking de produção para premiar os melhores operadores.",
    bullets: [
      "Ranking de conversão por operador", 
      "Relatórios de contatabilidade e recusas", 
      "Exportação para Excel e planilhas"
    ],
    image: "/mockups/resultados.png",
    featured: false,
    colSpan: "lg:col-span-1",
  },
];

function SpotlightCard({ 
  children, 
  colSpan = "", 
  onClick 
}: { 
  children: React.ReactNode; 
  colSpan?: string;
  onClick?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative rounded-2xl bg-navy-900/90 border border-navy-700/80 overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer ${colSpan}`}
    >
      {/* Spotlight Radial Glow Effect (C6 Carbon / Apple Style) */}
      {mousePos && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 opacity-100 z-20"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 158, 11, 0.12), transparent 45%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}

export default function FeaturesGrid({ onOpenDemoModal }: FeaturesGridProps) {
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <section id="funcionalidades" className="py-20 md:py-28 bg-navy-950 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-royal/20 border border-brand-blue/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Diferenciais Exclusivos & Arquitetura Nativa</span>
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

        {/* Asymmetric Bento Grid (Apple / C6 Carbon Style) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isFeaturedVideo = feature.id === "phone-link";

            return (
              <SpotlightCard
                key={feature.id}
                colSpan={feature.colSpan}
                onClick={onOpenDemoModal}
              >
                {/* Visual Preview Header with Real System Mockup */}
                <div className={`relative ${feature.featured ? "aspect-[21/9] sm:aspect-[16/8]" : "aspect-[16/9]"} w-full bg-navy-950 overflow-hidden border-b border-navy-800`}>
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                    {isFeaturedVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVideoModalOpen(true);
                        }}
                        className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500 text-navy-950 hover:bg-amber-400 transition-colors shadow-lg flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-navy-950" />
                        <span>Ver no Vídeo (18s)</span>
                      </button>
                    )}
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-navy-950/90 text-amber-400 border border-amber-500/30 backdrop-blur-sm shadow-md">
                      {feature.badge}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between relative z-10">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-navy-850 flex items-center justify-center text-amber-400 border border-navy-700 mb-4 group-hover:bg-amber-400 group-hover:text-navy-950 transition-colors shadow-md">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-amber-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-amber-300/80 font-medium mb-3">
                      {feature.tagline}
                    </p>
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

                    <div className="flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemoModal();
                        }}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors group-hover:translate-x-1 duration-200"
                      >
                        <span>Ver demonstração deste recurso</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {isFeaturedVideo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVideoModalOpen(true);
                          }}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <Film className="w-3 h-3 text-amber-400" />
                          <span>Assistir Teaser</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      {/* Video Modal Triggered from Bento Grid */}
      {videoModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-navy-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setVideoModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl max-h-[90vh] bg-navy-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-navy-950">
                  Apresentação Oficial
                </span>
                <h3 className="text-base font-bold text-white">Discadora Consignado Pro (18s)</h3>
              </div>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center">
              <video
                src="/videos/discadora-launch.mp4"
                poster="/videos/discadora-poster.jpg"
                autoPlay
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            <div className="px-6 py-3 bg-navy-950 border-t border-navy-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Pressione <kbd className="px-1.5 py-0.5 rounded bg-navy-800 text-slate-200 font-mono text-[10px]">ESC</kbd> para fechar
              </span>
              <button
                onClick={() => {
                  setVideoModalOpen(false);
                  onOpenDemoModal();
                }}
                className="btn-cta-vibrant px-5 py-2 rounded-lg text-xs font-black flex items-center gap-2"
              >
                <span>TESTAR NA MINHA OPERAÇÃO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
