import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade & Conformidade LGPD",
  description: "Política de Privacidade e Tratamento de Dados Pessoais da plataforma Discadora Consignado Pro em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
};

export default function PrivacidadePage() {
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
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Conformidade LGPD (Lei 13.709/2018)</span>
          </span>
        </div>

        {/* Título Principal */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Política de Privacidade e Proteção de Dados Pessoais
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Última atualização: 28 de Outubro de 2026 • Plataforma Discadora Consignado Pro (A&K Soluções Financeiras)
          </p>
        </div>

        {/* Conteúdo Estruturado */}
        <div className="space-y-8 text-xs sm:text-sm leading-relaxed text-slate-300">
          
          {/* Seção 1 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>1. Controlador, Operador e Encarregado de Dados (DPO)</span>
            </h2>
            <p>
              A <strong>A&K Soluções Financeiras</strong> atua como <strong>Operadora</strong> no tratamento dos dados dos clientes finais importados pelos correspondentes bancários, e como <strong>Controladora</strong> quanto aos dados cadastrais das empresas assinantes e seus operadores contratados.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <p><strong>Encarregado de Proteção de Dados (DPO):</strong> Setor de Segurança e Compliance A&K</p>
              <p><strong>Canal Direto de Privacidade:</strong> privacidade@aksolucoes.com.br</p>
              <p><strong>WhatsApp de Atendimento ao Titular:</strong> (79) 98105-2664</p>
            </div>
          </section>

          {/* Seção 2 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>2. Dados Coletados e Finalidade do Tratamento</span>
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Dados dos Assinantes/Operadores:</strong> Nome completo, e-mail corporativo, telefone e credenciais autenticadas via Supabase Auth para controle de acesso restrito (RBAC).
              </li>
              <li>
                <strong>Dados de Clientes Financeiros (Leads):</strong> Nome, telefone de contato, CPF, margem consignável estimada e status da esteira de crédito, tratados com a finalidade exclusiva de viabilizar a prospecção e formalização de crédito solicitada pelo cliente.
              </li>
              <li>
                <strong>Registros de Conexão e Auditoria:</strong> Endereço IP, data e hora de login, tabulações e gravações telefônicas, mantidos para cumprimento de obrigação legal (Marco Civil da Internet, Art. 15) e auditoria de conformidade.
              </li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>3. Bases Legais para o Tratamento (Art. 7º LGPD)</span>
            </h2>
            <p>
              Todo o tratamento de dados pessoais realizado pela plataforma fundamenta-se estritamente nas seguintes hipóteses legais da Lei nº 13.709/2018:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">Execução de Contrato (Inciso V)</span>
                Prestação dos serviços contratados pelo correspondente bancário e processamento de solicitações de crédito.
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">Obrigação Legal (Inciso II)</span>
                Guarda de registros e auditorias exigidas pelo Banco Central do Brasil e Marco Civil da Internet.
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-blue-400 block mb-1">Legítimo Interesse (Inciso IX)</span>
                Prevenção a fraudes, segurança cibernética e aprimoramento da estabilidade do software.
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="font-bold text-purple-400 block mb-1">Consentimento do Titular (Inciso I)</span>
                Captura de leads voluntários em formulários públicos da Landing Page e opt-in de WhatsApp.
              </div>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>4. Política de Cookies e Rastreamento de Terceiros</span>
            </h2>
            <p>
              A Discadora Consignado Pro opera com política de <strong>Zero Tracking Invasivo</strong>:
            </p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li><strong>Cookies Estritamente Necessários:</strong> Sessão JWT gerenciada pelo Supabase Auth para manter o operador conectado de forma segura.</li>
              <li><strong>Armazenamento Local (localStorage):</strong> Preferências de tema, estado de colapso da barra lateral e consentimento de cookies.</li>
              <li><strong>Ausência de Rastreadores Ocultos:</strong> Não inserimos pixels de publicidade invasiva (Meta Pixel, TikTok Pixel, Google Ads Tracking) nas telas internas operacionais do sistema.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>5. Direitos do Titular de Dados (Art. 18 LGPD)</span>
            </h2>
            <p>
              O titular dos dados pessoais possui o direito de solicitar a qualquer momento: confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos ou desatualizados, e a <strong>anonimização ou eliminação</strong> de dados desnecessários.
            </p>
            <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl text-xs text-emerald-200">
              <strong>Ferramenta Nativa de Anonimização:</strong> O CRM possui um botão direto de anonimização (Art. 18 LGPD) no painel do lead, permitindo substituir dados identificáveis por registros despersonalizados com trilha de auditoria gravada em `audit_logs`.
            </div>
          </section>

          {/* Seção 6 */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>6. Suboperadores e Transferência de Dados</span>
            </h2>
            <p>
              Para a execução técnica do software, a plataforma integra-se estritamente aos seguintes parceiros de infraestrutura sob contratos de confidencialidade:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <strong>Supabase Inc.</strong><br/>Banco de dados PostgreSQL & Auth (Região sa-east-1 Brasil).
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <strong>Vercel Inc.</strong><br/>Hospedagem e computação Serverless de alta disponibilidade.
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <strong>Gateways de Cobrança</strong><br/>Mercado Pago, Asaas e Efí para transações financeiras.
              </div>
            </div>
          </section>

        </div>

        {/* Footer da Página */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} AK Soluções Financeiras. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/termos" className="hover:text-amber-400 transition">Termos de Uso</Link>
            <Link href="/" className="hover:text-amber-400 transition">Página Inicial</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
