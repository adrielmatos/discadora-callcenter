"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  ArrowRight, 
  Calculator, 
  CheckCircle2, 
  Zap,
  Maximize2,
  X,
  Sparkles,
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Film,
  Monitor,
  Flame,
  Clock
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
  // Modo de exibição: "video" (Filme de Lançamento) ou "interactive" (Tour nas 7 Telas)
  const [showcaseMode, setShowcaseMode] = useState<"video" | "interactive">("video");

  // Estado do Vídeo Oficial
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(siteConfig.launchVideo?.durationSeconds || 18);
  const [cinemaModalOpen, setCinemaModalOpen] = useState(false);

  // Estado das Telas Interativas
  const [activeTab, setActiveTab] = useState(previewTabs[0].id);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Efeito 3D Tilt do Mockup
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const mockupRef = useRef<HTMLDivElement>(null);

  const currentTab = previewTabs.find((t) => t.id === activeTab) || previewTabs[0];
  const videoScenes = siteConfig.launchVideo?.scenes || [];

  // Identifica a cena atual do vídeo
  const activeSceneIndex = videoScenes.findIndex(
    (scene) => currentTime >= scene.start && currentTime < scene.end
  );
  const currentScene = videoScenes[activeSceneIndex] || videoScenes[0];

  // Atualização de tempo do vídeo
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setVideoDuration(videoRef.current.duration);
      }
    }
  };

  // Pular para cena específica
  const handleJumpToScene = (startSeconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startSeconds;
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Mudo / Som
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // Ciclo automático nas 7 abas interativas (quando no modo interativo)
  useEffect(() => {
    if (showcaseMode !== "interactive" || isHovered || lightboxOpen) return;

    const intervalTime = 50;
    const step = (intervalTime / AUTO_PLAY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          const currentIndex = previewTabs.findIndex((t) => t.id === activeTab);
          const nextIndex = (currentIndex + 1) % previewTabs.length;
          setActiveTab(previewTabs[nextIndex].id);
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [showcaseMode, activeTab, isHovered, lightboxOpen]);

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

    const rotateY = Number((((x - centerX) / centerX) * 4).toFixed(2));
    const rotateX = Number((-((y - centerY) / centerY) * 4).toFixed(2));

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

  // Fecha modais com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setCinemaModalOpen(false);
      }
    };
    if (lightboxOpen || cinemaModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, cinemaModalOpen]);

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
              Lançamento Oficial
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1 group-hover:text-white">
              Assista ao Filme de Apresentação (18s) <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
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

        {/* Master Showcase: Cinema Keynote + Tour Interativo */}
        <div className="mt-14 max-w-6xl mx-auto">
          {/* Top Switcher: Video Keynote vs Interactive Screens */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-1 rounded-2xl bg-navy-900 border border-navy-700/80 shadow-xl inline-flex gap-2">
              <button
                onClick={() => setShowcaseMode("video")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                  showcaseMode === "video"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 shadow-lg shadow-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-navy-800"
                }`}
              >
                <Film className="w-4 h-4" />
                <span>🎬 Filme de Lançamento (18s)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-950/20 font-extrabold uppercase">
                  Destaque
                </span>
              </button>

              <button
                onClick={() => setShowcaseMode("interactive")}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
                  showcaseMode === "interactive"
                    ? "bg-brand-royal text-white shadow-lg shadow-brand-blue/30 border border-brand-blue"
                    : "text-slate-300 hover:text-white hover:bg-navy-800"
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>🖥️ Tour Interativo (7 Telas)</span>
              </button>
            </div>
          </div>

          {/* Subtabs for Interactive Mode */}
          {showcaseMode === "interactive" && (
            <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar animate-in fade-in duration-300">
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
          )}

          {/* Perspective 3D Interactive Stage */}
          <div style={{ perspective: 1200 }}>
            <div
              ref={mockupRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
                transition: isHovered ? "transform 0.1s ease-out" : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
              className="relative rounded-2xl bg-navy-900 border border-navy-700/80 shadow-2xl shadow-navy-950/90 overflow-hidden group"
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
                    {showcaseMode === "video" 
                      ? "discadora-callcenter.vercel.app/videos/discadora-launch.mp4 • 1080p 60fps" 
                      : `discadora-callcenter.vercel.app/${currentTab.id}`}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {showcaseMode === "video" ? (
                    <>
                      <button
                        onClick={() => toggleMute()}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-navy-850 hover:bg-navy-800 px-2.5 py-1 rounded-md border border-navy-700"
                        title={isMuted ? "Ativar som" : "Desativar som"}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="text-[11px] hidden sm:inline">{isMuted ? "Mudo" : "Som Ativo"}</span>
                      </button>

                      <button
                        onClick={() => setCinemaModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-navy-800/80 hover:bg-navy-700 border border-navy-700 px-2.5 py-1 rounded-md transition-colors"
                        title="Expandir Cinema (Tela Cheia)"
                      >
                        <Maximize2 className="w-3 h-3 text-amber-400" />
                        <span className="hidden sm:inline">Expandir Cinema</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-navy-800/80 hover:bg-navy-700 border border-navy-700 px-2.5 py-1 rounded-md transition-colors"
                      title="Ampliar em tela cheia"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-400" />
                      <span className="hidden sm:inline">Ampliar</span>
                    </button>
                  )}

                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Produção Oficial
                  </span>
                </div>
              </div>

              {/* Main Content Area */}
              {showcaseMode === "video" ? (
                /* CINEMATIC VIDEO PLAYER (18s) */
                <div className="relative aspect-[16/9] w-full bg-navy-950 overflow-hidden flex flex-col justify-between">
                  <video
                    ref={videoRef}
                    src="/videos/discadora-launch.mp4"
                    poster="/videos/discadora-poster.jpg"
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlay}
                    className="w-full h-full object-contain cursor-pointer"
                  />

                  {/* Play / Pause Center Overlay Hint on Click */}
                  <div 
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    {!isPlaying && (
                      <div className="w-20 h-20 rounded-full bg-navy-950/80 backdrop-blur-md border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-2xl">
                        <Play className="w-8 h-8 ml-1 fill-amber-400" />
                      </div>
                    )}
                  </div>

                  {/* Scrubber de 4 Cenas Interativas Sincronizadas em Tempo Real */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy-950 via-navy-950/95 to-transparent p-4 sm:p-6 border-t border-navy-800/60 z-20">
                    {/* Linha de Progresso Global */}
                    <div className="relative w-full h-1.5 bg-navy-800 rounded-full mb-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-all duration-100"
                        style={{ width: `${(currentTime / (videoDuration || 18)) * 100}%` }}
                      />
                    </div>

                    {/* 4 Cards de Cenas Interativas com Scrubber */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                      {videoScenes.map((scene, idx) => {
                        const isActive = idx === activeSceneIndex;
                        return (
                          <button
                            key={scene.id}
                            onClick={() => handleJumpToScene(scene.start)}
                            className={`p-2 rounded-xl text-left transition-all border ${
                              isActive
                                ? "bg-navy-800/90 border-amber-500/70 shadow-lg shadow-amber-500/10"
                                : "bg-navy-900/60 border-navy-800 hover:bg-navy-850 hover:border-navy-700"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? "text-amber-400" : "text-slate-400"}`}>
                                {scene.timeRange}
                              </span>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs font-bold text-white truncate">{scene.label}</p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Descrição da Cena Ativa e Atalho de Demonstração */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-navy-800/50">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-white">{currentScene?.label}:</span>
                        <span className="text-slate-300 truncate max-w-xl">{currentScene?.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setShowcaseMode("interactive")}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-navy-850 hover:bg-navy-800 border border-navy-700 flex items-center gap-1.5 transition-colors"
                        >
                          <Monitor className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ver Telas do Sistema</span>
                        </button>

                        <button
                          onClick={onOpenDemoModal}
                          className="btn-cta-vibrant px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5"
                        >
                          <span>QUERO ESTA DISCADORA</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* INTERACTIVE TOUR (7 SCREENS) */
                <div 
                  onClick={() => setLightboxOpen(true)}
                  className="relative aspect-[16/9] w-full bg-navy-950 overflow-hidden flex items-center justify-center cursor-pointer"
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

                  <div className="absolute inset-0 bg-navy-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="px-4 py-2 rounded-xl bg-navy-950/80 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xl">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span>Clique para inspecionar em tela cheia</span>
                    </div>
                  </div>

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

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowcaseMode("video");
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-navy-850 hover:bg-navy-800 border border-navy-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Film className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Filme (18s)</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDemoModal();
                        }}
                        className="btn-cta-vibrant px-4 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-2"
                      >
                        <span>VER ESTA TELA AO VIVO</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal para Imagem em Tela Cheia */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-navy-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="relative w-full max-w-6xl max-h-[90vh] bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="relative aspect-[16/9] w-full flex-1 bg-navy-950">
              <Image
                src={currentTab.image}
                alt={currentTab.name}
                fill
                className="object-contain"
                priority
              />
            </div>

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

      {/* Cinema Modal para Vídeo em Tela Cheia */}
      {cinemaModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-navy-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setCinemaModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-6xl max-h-[92vh] bg-navy-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-navy-950 border-b border-navy-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-navy-950">
                  Cinema Keynote
                </span>
                <h3 className="text-base font-bold text-white">Filme Oficial de Apresentação (18s)</h3>
              </div>
              <button
                onClick={() => setCinemaModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                title="Fechar (ESC)"
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
                Pressione <kbd className="px-1.5 py-0.5 rounded bg-navy-800 text-slate-200 font-mono text-[10px]">ESC</kbd> para sair do modo Cinema
              </span>
              <button
                onClick={() => {
                  setCinemaModalOpen(false);
                  onOpenDemoModal();
                }}
                className="btn-cta-vibrant px-5 py-2 rounded-lg text-xs font-black flex items-center gap-2"
              >
                <span>TESTAR GRÁTIS NA MINHA OPERAÇÃO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
