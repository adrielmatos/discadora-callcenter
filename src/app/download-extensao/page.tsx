"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Download, ShieldCheck, CheckCircle2, Copy, Check, 
  ArrowLeft, Smartphone, Bot, Sparkles, ExternalLink, RefreshCw 
} from "lucide-react";

export default function DownloadExtensaoPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link 
            href="/omnichannel" 
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <ArrowLeft size={14} />
            <span>Voltar ao Sistema</span>
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300">Extensão Sofia AI WhatsApp Web</span>
          </div>
        </div>

        <Link
          href="/leads"
          className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
        >
          <span>Acessar CRM</span>
          <ExternalLink size={12} />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                100% Anti-Ban • Risco Zero
              </span>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Google Chrome & Microsoft Edge
              </span>
              <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                Custo R$ 0,00
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Instale a Sofia AI no seu WhatsApp Web
            </h1>

            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Atendimento automático inteligente pautado estritamente nas leis financeiras (sem alucinar taxas), mineração de clientes antigos e sincronização direta no CRM da Discadora em tempo real.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="/sofia-whatsapp-web.zip"
                download="sofia-whatsapp-web.zip"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-sm shadow-xl transition flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <Download size={18} />
                <span>Baixar Pacote da Extensão (.ZIP)</span>
              </a>

              <span className="text-xs text-slate-400 flex items-center gap-1.5 self-center">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Arquivo .ZIP pronto para descompactar</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Passos de Instalação */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Como Instalar em Menos de 1 Minuto</h2>
            <p className="text-xs text-slate-400 mt-1">Funciona tanto no Google Chrome quanto no Microsoft Edge, Opera ou Brave.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                1
              </div>
              <h3 className="text-sm font-bold text-white">Abra a Aba de Extensões</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                No seu navegador, digite na barra de endereços:
              </p>
              <div className="bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-emerald-400 select-all border border-slate-800">
                chrome://extensions
              </div>
              <p className="text-[10px] text-slate-400">
                (Se usar o Edge: <span className="font-mono text-slate-300">edge://extensions</span>)
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                2
              </div>
              <h3 className="text-sm font-bold text-white">Ative o Modo Desenvolvedor</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                No canto superior direito da página de extensões, ligue a chavinha:
              </p>
              <div className="bg-slate-950 p-2 rounded-lg text-[11px] text-slate-200 font-semibold border border-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Modo do desenvolvedor</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Isso habilita o botão para carregar extensões personalizadas.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-2xl space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                3
              </div>
              <h3 className="text-sm font-bold text-white">Carregue a Pasta</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clique no botão <strong>"Carregar sem compactação"</strong> e selecione a pasta extraída do ZIP.
              </p>
              <div className="bg-emerald-950/40 p-2 rounded-lg text-[11px] text-emerald-300 font-semibold border border-emerald-800/50 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span>Pronto! O robô já está instalado.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Como usar no WhatsApp Web */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white">O que você verá no seu WhatsApp Web:</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                <span className="font-bold text-xs text-white">Pílula [🟢 Sofia Ativa]</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aparece no canto superior direito do seu WhatsApp Web. Você pode ligar ou pausar a Sofia com um clique quando quiser assumir uma conversa pessoalmente.
              </p>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" />
                <span className="font-bold text-xs text-white">Botão [⚡ Minerar Conversa]</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Abra qualquer cliente antigo que parou de responder e aperte o botão. A Sofia faz o diagnóstico imediato e envia o lead classificado direto para o seu CRM!
              </p>
            </div>
          </div>
        </div>

      </main>

      <footer className="border-t border-slate-800 text-center py-5 text-xs text-slate-500">
        A&K Soluções Financeiras • Discadora & Call Center com Sofia AI Integrada
      </footer>
    </div>
  );
}
