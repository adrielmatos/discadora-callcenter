"use client";

import { useState, useEffect } from "react";
import { siteConfig } from "@/config/site";
import { PhoneCall, MessageCircle, LogIn, Menu, X, Sparkles } from "lucide-react";

interface NavbarProps {
  onOpenDemoModal: () => void;
}

export default function Navbar({ onOpenDemoModal }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#040814]/90 backdrop-blur-2xl border-b border-slate-800/80 shadow-2xl shadow-black/60 py-3"
          : "bg-[#040814]/60 backdrop-blur-md border-b border-white/5 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo A&K */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-all">
              <PhoneCall className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  A&K <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Soluções Financeiras</span>
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-300 border border-blue-500/30 tracking-wider">
                  CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Zero VoIP • CRM & Esteira INSS
              </p>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-300">
            <a
              href="#funcionalidades"
              className="hover:text-amber-400 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#calculadora"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <span>Economia VoIP</span>
              <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                Simulador
              </span>
            </a>
            <a
              href="#esteira-inss"
              className="hover:text-amber-400 transition-colors"
            >
              Esteira Meu INSS
            </a>
            <a
              href="#comparativo"
              className="hover:text-amber-400 transition-colors"
            >
              Comparativo
            </a>
            <a
              href="#planos"
              className="hover:text-amber-400 transition-colors"
            >
              Planos
            </a>
            <a
              href="#faq"
              className="hover:text-amber-400 transition-colors"
            >
              Dúvidas
            </a>
          </nav>

          {/* Action Buttons: Acessar Sistema (Oficial) + WhatsApp CTA */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Botão Oficial de Login do Sistema */}
            <a
              href={siteConfig.systemLoginUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-200 hover:text-white bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm"
              title="Acessar o Painel Operacional da Discadora"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Acessar Sistema</span>
            </a>

            {/* CTA Vibrante */}
            <button
              onClick={onOpenDemoModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>Falar no WhatsApp</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href={siteConfig.systemLoginUrl}
              className="p-2 rounded-xl bg-slate-900 text-cyan-400 border border-slate-700 flex items-center gap-1.5 text-xs font-bold"
              title="Acessar Sistema"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#040814]/98 backdrop-blur-2xl border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2 text-base font-semibold text-slate-200">
            <a
              href="#funcionalidades"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#calculadora"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 flex items-center justify-between transition-colors"
            >
              <span>Calculadora de Economia</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                Simulador
              </span>
            </a>
            <a
              href="#esteira-inss"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Esteira Meu INSS
            </a>
            <a
              href="#comparativo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Comparativo VoIP
            </a>
            <a
              href="#planos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Tabela de Planos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Perguntas Frequentes
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <a
              href={siteConfig.systemLoginUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 border border-slate-700"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Acessar Painel do Sistema</span>
            </a>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDemoModal();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>Agendar Demonstração no WhatsApp</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
