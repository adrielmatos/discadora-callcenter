"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleConsent = (level: "all" | "essential") => {
    localStorage.setItem("cookie_consent", JSON.stringify({ level, date: new Date().toISOString() }));
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      role="region"
      aria-label="Consentimento de Cookies e Privacidade"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 p-4 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-slate-200 text-xs animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>Privacidade & Cookies (LGPD)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </h4>
            <button
              onClick={() => handleConsent("essential")}
              aria-label="Fechar aviso de cookies"
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Utilizamos cookies estritamente necessários para autenticação segura e funcionamento do CRM. Não utilizamos rastreadores invasivos de terceiros sem seu consentimento. Veja nossa{" "}
            <Link href="/privacidade" className="text-amber-400 underline hover:text-amber-300">
              Política de Privacidade
            </Link>.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleConsent("all")}
              className="flex-1 py-1.5 px-3 rounded-lg font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition text-center text-[11px] cursor-pointer"
            >
              Aceitar Todos
            </button>
            <button
              onClick={() => handleConsent("essential")}
              className="py-1.5 px-3 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px] border border-slate-700 cursor-pointer"
            >
              Apenas Essenciais
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
