import { siteConfig } from "@/config/site";
import { LogIn, ShieldCheck, PhoneCall } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#02050c] border-t border-slate-800/80 text-slate-400 text-xs py-12 md:py-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
                <PhoneCall className="w-4 h-4 text-amber-200" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                A&K <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Soluções Financeiras</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md">
              A plataforma definitiva de CRM e discagem celular via PC para correspondentes bancários, promotoras de crédito e call centers de crédito consignado (INSS, BPC, FGTS e SIAPE).
            </p>
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conformidade com a LGPD (Lei 13.709/2018).</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-4">
              Navegação
            </h4>
            <ul className="space-y-2.5 font-medium">
              <li>
                <a href="#funcionalidades" className="hover:text-amber-400 transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#calculadora" className="hover:text-amber-400 transition-colors">
                  Calculadora VoIP
                </a>
              </li>
              <li>
                <a href="#esteira-inss" className="hover:text-amber-400 transition-colors">
                  Esteira Meu INSS
                </a>
              </li>
              <li>
                <a href="#comparativo" className="hover:text-amber-400 transition-colors">
                  Comparativo de Mercado
                </a>
              </li>
              <li>
                <a href="#planos" className="hover:text-amber-400 transition-colors">
                  Tabela de Preços
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-amber-400 transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Sistema & Acesso Oficial */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-4">
              Acesso ao Sistema
            </h4>
            <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
              Já é cliente ou operador cadastrado? Acesse seu painel de discagem:
            </p>
            <a
              href={siteConfig.systemLoginUrl}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-slate-600 text-xs font-bold transition-all shadow-sm"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Acessar Painel Oficial</span>
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} A&K Soluções Financeiras. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4">
            <a href="/termos" className="hover:text-amber-400 transition-colors">Termos de Uso</a>
            <span>•</span>
            <a href="/privacidade" className="hover:text-amber-400 transition-colors">Privacidade & Cookies (LGPD)</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
