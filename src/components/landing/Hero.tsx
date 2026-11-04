"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { 
  ArrowRight, 
  Calculator, 
  CheckCircle2, 
  Zap,
  Maximize2,
  X,
  Sparkles,
  Eye
} from "lucide-react";
import { siteConfig } from "@/config/site";

interface HeroProps {
  onOpenDemoModal: () => void;
}

const previewTabs = siteConfig.screenshots.map((s) => ({
  id: s.id,
  name: s.title,
  badge: s.tag,
  tagline: s.desc,
  image: s.src,
  route: s.id,
  highlights: [s.tag, "Interface Nativa", "Sincronização 100% em Tempo Real"]
}));

const AUTO_PLAY_DURATION = 5000; // 5 segundos por tela

export default function Hero({ onOpenDemoModal }: HeroProps) {
  const [activeTab, setActiveTab] = useState(previewTabs[0].id);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Efeito 3D Tilt do Mockup
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const mockupRef = useRef<HTMLDivElement>(null);

  const currentTab = previewTabs.find((t) => t.id === activeTab) || previewTabs[0];

  // Ciclo automático com barra de progresso (pausa se mouse em cima ou lightbox aberto)
  useEffect(() => {
    if (isHovered || lightboxOpen) return;

    const intervalTime = 50; // atualiza a cada 50ms
    const step = (intervalTime / AUTO_PLAY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          // Avança para a próxima tela
          const currentIndex = previewTabs.findIndex((t) => t.id === activeTab);
          const nextIndex = (currentIndex + 1) % previewTabs.length;
          setActiveTab(previewTabs[nextIndex].id);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeTab, isHovered, lightboxOpen]);

  // Troca manual de aba reinicia o progresso
  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setProgress(0);
  };

  // Cálculo de rotação 3D suave baseado no movimento do mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mockupRef.current) return;
    const rect = mockupRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = Number((((x - centerX) / centerX) * 4.5).toFixed(2));
    const rotateX = Number((-((y - centerY) / centerY) * 4.5).toFixed(2));

    setTilt({
      rotateX,
      rotateY,
      glareX: Number(((x / rect.width) * 100).toFixed(1)),
      glareY: Number(((y / rect.height) * 100).toFixed(1)),
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Fecha lightbox com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    if (lightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen]);

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-grid-pattern">
      {/* Background Lighting Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-brand-royal/20 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Announcement Badge */}
        <div className="flex justify-center mb-6">
          <div 
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-navy-850/90 border border-amber-500/30 shadow-lg shadow-amber-500/10 hover:border-amber-400/50 transition-all cursor-pointer group"
            onClick={onOpenDemoModal}
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Tecnologia Phone Link
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1 group-hover:text-white">
              Zero Custo com Minutos VoIP <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            A Única Discadora para Consignado com{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Zero Custo VoIP
            </span>{" "}
            e Foco Total em Fechar a{" "}
            <span className="text-amber-400 font-extrabold">
              Anuência Meu INSS
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
            Pare de queimar dinheiro com pacotes caros de minutos VoIP e bloqueios de operadora. 
            Disque pelo chip ilimitado do celular dos operadores via PC, qualifique o cliente com 
            simulador de margem integrado e nunca mais perca contratos por prazo de anuência expirado.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenDemoModal}
              className="btn-cta-vibrant w-full sm:w-auto px-8 py-4 rounded-xl text-sm sm:text-base flex items-center justify-center gap-3 shadow-2xl group"
            >
              <Zap className="w-5 h-5 text-navy-950 fill-navy-950 group-hover:scale-110 transition-transform" />
              <span>TESTAR GRÁTIS NA MINHA OPERAÇÃO</span>
              <ArrowRight className="w-4 h-4 text-navy-950 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#calculadora"
              className="w-full sm:w-auto px-6 py-4 rounded-xl text-sm sm:text-base font-bold text-slate-200 bg-navy-850 hover:bg-navy-800 border border-navy-700 hover:border-brand-blue/50 flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-brand-blue/20"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Calcular Economia com VoIP</span>
            </a>
          </div>

          {/* Trust bullet badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sem contrato de fidelidade</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Disca pelo chip Android ou iPhone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Instalação e início em 15 minutos</span>
            </div>
          </div>
        </div>

        {/* Realistic Interactive Mockup Viewer with Real System Screenshots */}
        <div className="mt-14 max-w-6xl mx-auto">
          {/* Navigation Tabs with Animated Progress Bar (Apple / Nubank Style) */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 no-scrollbar">
            {previewTabs.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border overflow-hidden ${
                    active
                      ? "bg-brand-royal text-white border-brand-blue shadow-lg shadow-brand-blue/40"
                      : "bg-navy-900/80 text-slate-400 border-navy-800 hover:text-white hover:bg-navy-850"
                  }`}
                >
                  {/* Barra de Progresso Viva na Aba Ativa */}
                  {active && (
                    <div 
                      className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  <span>{tab.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                      active
                        ? "bg-amber-400 text-navy-950"
                        : "bg-navy-800 text-slate-300"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Perspective 3D Interactive Mockup Container */}
          <div 
            style={{ perspective: 1200 }} 
            className="mt-4"
          >
            <div
              ref={mockupRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                transition: isHovered ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className="relative rounded-2xl bg-navy-900 border border-navy-700/80 shadow-2xl shadow-navy-950/90 overflow-hidden group cursor-pointer"
            >
              {/* Dynamic Glare Reflection overlay */}
              <div
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
                style={{
                  background: isHovered
                    ? `radial-gradient(800px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.08), transparent 60%)`
                    : "none",
                }}
              />

              {/* Window Topbar */}
              <div className="bg-navy-950 px-4 py-3 border-b border-navy-800 flex items-center justify-between relative z-20">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 text-xs text-slate-400 font-mono hidden sm:inline">
                    discadora-callcenter.vercel.app/{currentTab.id}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-navy-800/80 hover:bg-navy-700 border border-navy-700 px-2.5 py-1 rounded-md transition-colors"
                    title="Ampliar em tela cheia"
                  >
                    <Maximize2 className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Ampliar</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Sistema em Produção
                  </span>
                </div>
              </div>

              {/* Screen Screenshot Container with Fluid Fade Transition */}
              <div 
                onClick={() => setLightboxOpen(true)}
                className="relative aspect-[16/9] w-full bg-navy-950 overflow-hidden flex items-center justify-center"
              >
                <div 
                  key={currentTab.id}
                  className="relative w-full h-full animate-in fade-in zoom-in-95 duration-300"
                >
                  <Image
                    src={currentTab.image}
                    alt={currentTab.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1200px"
                    className="object-contain object-top group-hover:scale-[1.01] transition-transform duration-500"
                    priority
                  />
                </div>

                {/* Hover Click Hint */}
                <div className="absolute inset-0 bg-navy-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="px-4 py-2 rounded-xl bg-navy-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xl">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Clique para inspecionar em tela cheia</span>
                  </div>
                </div>

                {/* Bottom Info Bar Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy-950 via-navy-950/90 to-transparent p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-navy-800/60 z-10">
                  <div>
                    <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      <span>{currentTab.name}:</span>
                      <span className="text-slate-300 font-normal">{currentTab.tagline}</span>
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentTab.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-medium bg-navy-850/90 text-blue-200 border border-brand-blue/30 px-2.5 py-0.5 rounded-full"
                        >
                          ✓ {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDemoModal();
                    }}
                    className="btn-cta-vibrant shrink-0 px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2"
                  >
                    <span>VER ESTA TELA AO VIVO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal em Tela Cheia */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-navy-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="relative w-full max-w-6xl max-h-[90vh] bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="px-6 py-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-navy-950">
                  {currentTab.badge}
                </span>
                <h3 className="text-base font-bold text-white">{currentTab.name}</h3>
                <span className="text-xs text-slate-400 hidden sm:inline">— {currentTab.tagline}</span>
              </div>
              <button
                onClick={() => setLightboxOpen(false)}
                className="w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Fechar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Image Container */}
            <div className="relative aspect-[16/9] w-full flex-1 bg-navy-950">
              <Image
                src={currentTab.image}
                alt={currentTab.name}
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Lightbox Footer */}
            <div className="px-6 py-3 bg-navy-950 border-t border-navy-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Pressione <kbd className="px-1.5 py-0.5 rounded bg-navy-800 text-slate-200 font-mono text-[10px]">ESC</kbd> para fechar
              </span>
              <button
                onClick={() => {
                  setLightboxOpen(false);
                  onOpenDemoModal();
                }}
                className="btn-cta-vibrant px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2"
              >
                <span>Solicitar Demonstração</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
