import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowLeft, ShieldAlert, CheckCircle, FileCheck, PhoneCall } from "lucide-react";

export const metadata: Metadata = {
  title: "Termos de Uso do Sistema",
  description: "Termos e Condições Gerais de Uso da Plataforma Discadora Consignado Pro (A&K Soluções Financeiras).",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header de Navegação */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Página Inicial</span>
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            <span>Contrato de Licença de Software (SaaS)</span>
          </span>
        </div>

        {/* Título Principal */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Termos e Condições Gerais de Uso
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Vigência a partir de: 28 de Outubro de 2026 • Plataforma Discadora Consignado Pro
          </p>
        </div>

        {/* Seções dos Termos */}
        <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-slate-300">
          
          {/* Seção 1 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>1. Objeto e Licenciamento</span>
            </h2>
            <p>
              Estes Termos regem a disponibilização e utilização da plataforma <strong>Discadora Consignado Pro</strong>, desenvolvida e operada pela <strong>A&K Soluções Financeiras</strong>. O sistema constitui uma ferramenta de CRM, automação e telefonia assistida licenciada na modalidade Software como Serviço (SaaS) para correspondentes bancários, promotoras de crédito e empresas de televendas.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>2. Telefonia, Chip Próprio e Responsabilidade Operacional</span>
            </h2>
            <p>
              A discagem assistida é realizada mediante integração local com o smartphone corporativo do contratante (via aplicativo oficial Phone Link ou protocolo SIP WebRTC). A plataforma:
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li><strong>Não comercializa pacotes de minutos nem atua como operadora de telecomunicações STFC/SCM.</strong></li>
              <li>O tráfego de voz é cursado pelo chip GSM do plano contratado pelo próprio usuário junto à sua operadora móvel de preferência.</li>
              <li>O contratante é o único responsável pela titularidade do chip, gestão de planos e pela conduta ética dos seus operadores nas chamadas ativas.</li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>3. Conformidade com Banco Central, CDC e Anatel</span>
            </h2>
            <div className="bg-rose-950/20 border border-rose-900/50 p-4 rounded-xl text-xs space-y-2 text-rose-200">
              <p className="font-bold">PROIBIÇÃO EXPRESSA DE TAXA DE ANTECIPAÇÃO (Resolução Bacen nº 3.954/2011 e CDC Art. 39):</p>
              <p>
                É terminantemente vedado ao contratante ou aos seus prepostos utilizar a plataforma para solicitar qualquer depósito prévio, taxa de cadastro, seguro antecipado ou pagamento preliminar para liberação de empréstimos consignados. O sistema monitora mensagens e implementa guardrails automatizados que bloqueiam práticas abusivas.
              </p>
              <p className="font-bold pt-1">RESPEITO À LISTA NÃO PERTURBE (DND):</p>
              <p>
                O contratante compromete-se a respeitar os bloqueios registrados na base de Não Perturbe e nas plataformas públicas regulatórias (Procon e Anatel), abstendo-se de discar para números cadastrados na Blacklist.
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span>4. Planos, Cobrança e Cancelamento Sem Fidelidade</span>
            </h2>
            <p>
              A contratação da plataforma opera sob planos mensais pré-pagos conforme a quantidade de operadores contratados.
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li><strong>Sem Fidelidade Contratual:</strong> O contratante pode cancelar a renovação da assinatura a qualquer tempo, sem multas rescisórias.</li>
              <li><strong>Inadimplência:</strong> Em caso de não pagamento no vencimento, o acesso às funcionalidades operacionais será suspenso após o período de tolerância técnica.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              <span>5. Legislação Aplicável e Foro</span>
            </h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial pelo Marco Civil da Internet (Lei nº 12.965/2014) e pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018). As partes elegem o foro da comarca da sede da empresa para dirimir quaisquer controvérsias decorrentes deste contrato.
            </p>
          </section>

        </div>

        {/* Footer da Página */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} AK Soluções Financeiras. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacidade" className="hover:text-amber-400 transition">Política de Privacidade & LGPD</Link>
            <Link href="/" className="hover:text-amber-400 transition">Página Inicial</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
