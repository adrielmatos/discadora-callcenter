"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { X, MessageCircle, Send, Zap, ShieldCheck } from "lucide-react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMessage?: string;
}

export default function DemoModal({
  isOpen,
  onClose,
  defaultMessage,
}: DemoModalProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [operadores, setOperadores] = useState("1 a 5 operadores");
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Máscara dinâmica de telefone brasileiro (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) {
      setWhatsapp(raw ? `(${raw}` : "");
    } else if (raw.length <= 6) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else if (raw.length <= 10) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`);
    } else {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitFeedback(null);

    // Validação de telefone mínimo
    const cleanDigits = whatsapp.replace(/\D/g, "");
    if (cleanDigits.length < 10) {
      setSubmitFeedback("Por favor, digite o DDD e o número completo do seu WhatsApp.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Salva automaticamente no banco de dados / CRM via API blindada com honeypot e rate-limit
      const res = await fetch("/api/leads/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: whatsapp,
          tamanhoEquipe: operadores,
          mensagem: defaultMessage || "Demonstração solicitada via Landing Page",
          website_url: honeypot
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error) {
          console.warn("[DemoModal] Aviso ao registrar lead comercial:", data.error);
        }
      }
    } catch {
      // Continua para abrir o WhatsApp mesmo em caso de falha de rede
    }

    // 2. Abre a conversa no WhatsApp do Dono (5579981052664)
    const customText = defaultMessage
      ? defaultMessage
      : `Olá! Me chamo ${nome || "um Correspondente"}. Meu WhatsApp é ${whatsapp || "não informado"}. Tenho uma equipe com ${operadores}. Gostaria de conhecer e agendar uma demonstração da AK Soluções Financeiras!`;

    const cleanNumber = siteConfig.whatsappNumber.replace(/\D/g, "");
    const encodedText = encodeURIComponent(customText);
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

    window.open(whatsappUrl, "_blank");
    setIsSubmitting(false);
    onClose();
  };

  const handleDirectWhatsApp = () => {
    const cleanNumber = siteConfig.whatsappNumber.replace(/\D/g, "");
    const encodedText = encodeURIComponent(
      defaultMessage || siteConfig.whatsappDefaultMessage
    );
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-500/10 overflow-hidden text-slate-100">
        
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Fechar Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Demonstração VIP • Acesso Imediato</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Fale com um Especialista em Consignado
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Preencha seus dados para conectar direto com nosso WhatsApp comercial oficial: <strong className="text-white">(79) 98105-2664</strong>.
          </p>
        </div>

        {/* Lead Capture Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Honeypot invisível para bots */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website_url"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Seu Nome / Nome do Correspondente
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Silva - Promotora Cred"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Seu WhatsApp Comercial (com DDD)
            </label>
            <input
              type="tel"
              required
              placeholder="(79) 99999-9999"
              value={whatsapp}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tamanho Atual da Sua Equipe
            </label>
            <select
              value={operadores}
              onChange={(e) => setOperadores(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
            >
              <option value="1 operador (apenas eu)">1 operador (apenas eu)</option>
              <option value="2 a 5 operadores">2 a 5 operadores (Equipe Pro)</option>
              <option value="6 a 15 operadores">6 a 15 operadores</option>
              <option value="Mais de 15 operadores">Mais de 15 operadores (Enterprise)</option>
            </select>
          </div>

          {submitFeedback && (
            <p className="text-xs text-rose-400 font-semibold animate-pulse">{submitFeedback}</p>
          )}

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 mt-4 transition-all bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:brightness-110 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-60"
          >
            <Send className="w-4 h-4 fill-white" />
            <span>{isSubmitting ? "CONECTANDO..." : "RECEBER DEMONSTRAÇÃO NO WHATSAPP"}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center pt-1">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Dados 100% seguros sob conformidade LGPD. Sem spam.</span>
          </div>
        </form>

        {/* Divider / Direct alternative */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-center relative z-10">
          <button
            type="button"
            onClick={handleDirectWhatsApp}
            className="text-xs text-slate-400 hover:text-emerald-400 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prefere falar direto sem preencher o formulário? Clique aqui</span>
          </button>
        </div>
      </div>
    </div>
  );
}
