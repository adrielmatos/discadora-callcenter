"use client";

import { useState } from "react";
import { siteConfig } from "@/config/site";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";

interface FaqAccordionProps {
  onOpenDemoModal: () => void;
}

export default function FaqAccordion({ onOpenDemoModal }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-[#040814] relative border-t border-slate-800/80 overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm shadow-blue-500/10">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Perguntas Frequentes de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              Correspondentes Bancários
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300">
            Respostas diretas e honestas para as principais dúvidas sobre tecnologia, implantação e operação.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {siteConfig.faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-slate-900/95 border-2 border-amber-500/40 shadow-xl shadow-amber-500/5"
                    : "bg-slate-900/70 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <button
                  onClick={() => toggleQuestion(index)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-white hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-bold">{faq.question}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 ${
                      isOpen
                        ? "rotate-180 bg-amber-500/20 text-amber-400 border-amber-500/50"
                        : "bg-slate-850 text-slate-400 border-slate-700"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 text-sm sm:text-base text-slate-300 leading-relaxed border-t border-slate-800/80 pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-14 text-center bg-slate-900/80 backdrop-blur-xl rounded-2xl p-7 border border-slate-800 shadow-xl">
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">
            Ainda ficou com alguma dúvida sobre sua operação?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-5 max-w-lg mx-auto">
            Nosso time técnico e comercial está online no WhatsApp para tirar qualquer dúvida em tempo real.
          </p>
          <button
            onClick={onOpenDemoModal}
            className="py-3.5 px-6 rounded-xl text-xs sm:text-sm font-black inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-slate-950" />
            <span>Falar Agora no WhatsApp</span>
          </button>
        </div>
      </div>
    </section>
  );
}
