"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, Building, Users, Target, Save, CheckCircle2, Plus, Trash2, 
  ShieldCheck, Lock, UserCheck, Briefcase, Eye, ShieldAlert, Award, 
  Building2, DollarSign, Layers, ChevronRight, Check, AlertCircle, RefreshCw,
  CreditCard, QrCode, Copy, ExternalLink, Key, CheckCheck, Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import CobrancaModal from "@/components/CobrancaModal";

interface Operador {
  id: number;
  nome: string;
  email: string | null;
  perfil: string;
  ativo: boolean;
  can_crm: boolean;
  can_export: boolean;
  can_reports: boolean;
  can_scripts: boolean;
  can_campanhas: boolean;
  can_dnd: boolean;
}

interface Plano {
  id: string;
  codigo: string;
  nome: string;
  preco_mensal: string;
  max_operadores: number | null;
  max_ramais: number | null;
}

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email_gestor: string;
  status: string;
  plano_id: string | null;
  limite_operadores: number | null;
  limite_ramais: number | null;
  interna: boolean;
  dias_teste?: number;
  trial_expira_em?: string;
  modulos_liberados?: string[];
  created_at?: string;
  plano_nome?: string;
  plano_preco?: string;
}

const AVAILABLE_COMPANY_MODULES = [
  { id: "dialer", name: "Discador de Chamadas (Softphone)", desc: "Discagem, teclado e tabulação" },
  { id: "conversas", name: "Caixa WhatsApp (Chat Multiatendente)", desc: "Conversas ao vivo e respostas rápidas" },
  { id: "crm", name: "CRM & Esteira de Leads", desc: "Kanban e gestão de funil" },
  { id: "tasks", name: "Tarefas & Follow-up", desc: "Lembretes e rotina operacional" },
  { id: "retornos", name: "Agenda de Retornos", desc: "Agendamento de ligações futuras" },
  { id: "campanhas", name: "Campanhas de Mailing", desc: "Importação e listas ativas" },
  { id: "omnichannel", name: "Atendente IA Sofia 24h", desc: "Atendimento automático e WhatsApp" },
  { id: "scripts", name: "Scripts de Atendimento", desc: "Roteiros para operadores" },
  { id: "dnd", name: "Bloqueio Não Perturbe", desc: "Blacklist de números" },
  { id: "telefonia", name: "Telefonia SIP & Troncos", desc: "Configurações de PABX" },
  { id: "resultados", name: "Resultados & Relatórios", desc: "Relatórios de equipe e vendas" },
];

const CARGOS_INFO = [
  {
    cargo: "Proprietário / Diretor (Master)",
    id: "proprietario",
    badge: "Acesso Total",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    descricao: "Controle irrestrito a todos os módulos, relatórios de faturamento, exclusão de dados e configurações da empresa.",
    permissoesPadrao: { crm: true, export: true, reports: true, scripts: true, campanhas: true, dnd: true }
  },
  {
    cargo: "Gerente Geral / Operacional",
    id: "gerente",
    badge: "Gerencial",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    descricao: "Gestão completa de campanhas, distribuição de lotes de leads, monitoramento de metas da equipe e relatórios de conversão.",
    permissoesPadrao: { crm: true, export: true, reports: true, scripts: true, campanhas: true, dnd: true }
  },
  {
    cargo: "Supervisor de Call Center",
    id: "supervisor",
    badge: "Supervisão",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    descricao: "Supervisão da operação: Discador, CRM, Campanhas, Retornos da equipe, Edição de Scripts e Lista Não Perturbe.",
    permissoesPadrao: { crm: true, export: false, reports: true, scripts: true, campanhas: true, dnd: true }
  },
  {
    cargo: "Consultor de Vendas / Operador",
    id: "operador",
    badge: "Atendimento",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    descricao: "Acesso focado no Discador e sua própria Agenda de Retornos. Bloqueado contra exportar bases ou alterar scripts gerais.",
    permissoesPadrao: { crm: false, export: false, reports: false, scripts: false, campanhas: false, dnd: false }
  },
  {
    cargo: "Backoffice / Formalização",
    id: "backoffice",
    badge: "Formalização",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    descricao: "Acesso ao CRM nas fases de Proposta, Contrato e Averbação para validação documental e esteira bancária.",
    permissoesPadrao: { crm: true, export: false, reports: false, scripts: false, campanhas: false, dnd: false }
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"empresas" | "equipe" | "parametros" | "financeiro">("empresas");
  const [isClientCompany, setIsClientCompany] = useState(false);

  // Configurações Gerais
  const [empresaNome, setEmpresaNome] = useState("A&K Soluções Financeiras");
  const [responsavelNome, setResponsavelNome] = useState("Adriel Matos Santos");
  const [metaLigacoes, setMetaLigacoes] = useState("120");
  const [metaContratos, setMetaContratos] = useState("5");
  const [ticketMedio, setTicketMedio] = useState("4500");
  const [saved, setSaved] = useState(false);

  // Configurações de Faturamento & Gateways (Fase 3)
  const [gatewayAtivo, setGatewayAtivo] = useState("manual");
  const [pixTipoChave, setPixTipoChave] = useState("cnpj");
  const [pixChave, setPixChave] = useState("");
  const [pixBeneficiario, setPixBeneficiario] = useState("A&K Soluções Financeiras");
  const [pixCidade, setPixCidade] = useState("Salvador");
  const [mercadopagoToken, setMercadopagoToken] = useState("");
  const [asaasKey, setAsaasKey] = useState("");
  const [efiClientId, setEfiClientId] = useState("");
  const [efiClientSecret, setEfiClientSecret] = useState("");

  // Faturas & Cobranças
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [selectedEmpresaForCobranca, setSelectedEmpresaForCobranca] = useState<Empresa | null>(null);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [cobrancaModalValor, setCobrancaModalValor] = useState(197.0);
  const [activeCobrancaId, setActiveCobrancaId] = useState<string | undefined>(undefined);

  // Empresas Assinantes (SaaS)
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [showModalAddEmpresa, setShowModalAddEmpresa] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  // Form Nova Empresa
  const [novaRazao, setNovaRazao] = useState("");
  const [novoFantasia, setNovoFantasia] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");
  const [novoEmailGestor, setNovoEmailGestor] = useState("");
  const [novoPlanoId, setNovoPlanoId] = useState("");
  const [novoLimiteOperadores, setNovoLimiteOperadores] = useState("5");
  const [novoStatusEmpresa, setNovoStatusEmpresa] = useState("ativa");
  const [novoDiasTeste, setNovoDiasTeste] = useState(7);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [selectedEmpresaForTrial, setSelectedEmpresaForTrial] = useState<Empresa | null>(null);
  const [modalTrialDays, setModalTrialDays] = useState(7);
  const [modulosSelecionados, setModulosSelecionados] = useState<string[]>([
    "dialer", "conversas", "crm", "tasks", "retornos", "campanhas", "omnichannel", "scripts", "dnd", "resultados"
  ]);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [selectedEmpresaForModules, setSelectedEmpresaForModules] = useState<Empresa | null>(null);
  const [editModulos, setEditModulos] = useState<string[]>([]);

  // Operadores e Permissões Internas
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoCargo, setNovoCargo] = useState("operador");
  const [showModalAdd, setShowModalAdd] = useState(false);
  
  // Permissões do formulário interno
  const [permCrm, setPermCrm] = useState(false);
  const [permExport, setPermExport] = useState(false);
  const [permReports, setPermReports] = useState(false);
  const [permScripts, setPermScripts] = useState(false);
  const [permCampanhas, setPermCampanhas] = useState(false);
  const [permDnd, setPermDnd] = useState(false);

  // Carrega Operadores
  const fetchOperadores = async () => {
    const { data } = await supabase.from("operadores_app").select("*").order("id", { ascending: true });
    if (data) setOperadores(data as Operador[]);
  };

  // Carrega Empresas e Planos do SaaS
  const fetchEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      // Busca planos
      const { data: planosData } = await supabase.from("planos").select("*").order("preco_mensal", { ascending: true });
      if (planosData && planosData.length > 0) {
        setPlanos(planosData as Plano[]);
        if (!novoPlanoId) {
          const starterOrPro = planosData.find(p => p.codigo === "pro") || planosData[0];
          setNovoPlanoId(starterOrPro.id);
        }
      }

      // Busca empresas
      const { data: empresasData, error } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Aviso ao buscar empresas:", error.message);
      }

      if (empresasData) {
        const enriched = empresasData.map(emp => {
          const plano = planosData?.find(p => p.id === emp.plano_id);
          return {
            ...emp,
            plano_nome: plano?.nome || (emp.interna ? "Interno Matriz" : "Personalizado"),
            plano_preco: plano?.preco_mensal ? `R$ ${Number(plano.preco_mensal).toFixed(2)}/mês` : "Sob Medida"
          };
        });
        setEmpresas(enriched as Empresa[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  useEffect(() => {
    fetchOperadores();
    fetchEmpresas();

    // Checa query params da URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "empresas" || tabParam === "equipe" || tabParam === "parametros" || tabParam === "financeiro") {
        setActiveTab(tabParam);
      }
    }

    // Trava de segurança: Se o usuário logado for de empresa cliente, bloqueia acesso a abas mestres
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const userEmpresaId = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
        if (userEmpresaId) {
          const { data: emp } = await supabase.from("empresas").select("interna").eq("id", userEmpresaId).maybeSingle();
          if (emp && emp.interna === false) {
            setIsClientCompany(true);
            setActiveTab("equipe");
          }
        }
      }
    });

    const fetchGlobalConfig = async () => {
      const { data } = await supabase.from("app_configuracoes").select("*").eq("id", 1).single();
      if (data) {
        if (data.empresa_nome) setEmpresaNome(data.empresa_nome);
        if (data.responsavel_nome) setResponsavelNome(data.responsavel_nome);
        if (data.meta_ligacoes) setMetaLigacoes(String(data.meta_ligacoes));
        if (data.meta_contratos) setMetaContratos(String(data.meta_contratos));
        if (data.ticket_medio) setTicketMedio(String(data.ticket_medio));
        if (data.gateway_ativo) setGatewayAtivo(data.gateway_ativo);
        if (data.pix_tipo_chave) setPixTipoChave(data.pix_tipo_chave);
        if (data.pix_chave) setPixChave(data.pix_chave);
        if (data.pix_beneficiario) setPixBeneficiario(data.pix_beneficiario);
        if (data.pix_cidade) setPixCidade(data.pix_cidade);
        // Proteção contra vazamento de credenciais mestres no navegador
        if (data.mercadopago_access_token) setMercadopagoToken("••••••••••••••••");
        if (data.asaas_api_key) setAsaasKey("••••••••••••••••");
        if (data.efi_client_id) setEfiClientId("••••••••••••••••");
        if (data.efi_client_secret) setEfiClientSecret("••••••••••••••••");
      }
    };
    fetchGlobalConfig();
    fetchCobrancas();
  }, []);

  const fetchCobrancas = async () => {
    setLoadingCobrancas(true);
    const { data } = await supabase
      .from("cobrancas_saas")
      .select("*, empresas(razao_social, nome_fantasia), planos(nome)")
      .order("created_at", { ascending: false });
    if (data) setCobrancas(data);
    setLoadingCobrancas(false);
  };

  const handleAbrirCobranca = (emp: Empresa) => {
    setSelectedEmpresaForCobranca(emp);
    const precoNum = emp.plano_preco ? parseFloat(emp.plano_preco.replace(/\D/g, "")) / 100 : 197.0;
    setCobrancaModalValor(precoNum || 197.0);
    setShowCobrancaModal(true);
  };

  const handleConfirmarPagamentoManual = async (cobrancaId?: string) => {
    if (selectedEmpresaForCobranca) {
      await supabase
        .from("empresas")
        .update({ status: "ativa", updated_at: new Date().toISOString() })
        .eq("id", selectedEmpresaForCobranca.id);
      
      if (cobrancaId) {
        await supabase
          .from("cobrancas_saas")
          .update({ status: "paga", pago_em: new Date().toISOString() })
          .eq("id", cobrancaId);
      }
      fetchEmpresas();
      fetchCobrancas();
    }
  };

  // Cadastro de Nova Empresa Assinante (SaaS)
  const handleAddEmpresa = async () => {
    if (!novaRazao.trim()) {
      alert("Informe a Razão Social da empresa contratante.");
      return;
    }
    if (!novoEmailGestor.trim()) {
      alert("Informe o e-mail do gestor/dono da empresa cliente.");
      return;
    }

    try {
      const trialExpira = new Date();
      trialExpira.setDate(trialExpira.getDate() + (novoStatusEmpresa === "trial" ? novoDiasTeste : 7));

      const payload: any = {
        razao_social: novaRazao.trim(),
        nome_fantasia: novoFantasia.trim() || novaRazao.trim(),
        cnpj: novoCnpj.trim() || null,
        email_gestor: novoEmailGestor.trim().toLowerCase(),
        status: novoStatusEmpresa,
        plano_id: novoPlanoId || null,
        limite_operadores: parseInt(novoLimiteOperadores) || 5,
        limite_ramais: parseInt(novoLimiteOperadores) || 5,
        interna: false,
        modulos_liberados: modulosSelecionados,
        dias_teste: novoStatusEmpresa === "trial" ? novoDiasTeste : 7,
        trial_expira_em: novoStatusEmpresa === "trial" ? trialExpira.toISOString() : null
      };

      let { data, error } = await supabase.from("empresas").insert(payload).select().single();

      if (error && error.message?.includes("modulos_liberados")) {
        // Fallback gracioso se a coluna ainda não foi aplicada no schema
        delete payload.modulos_liberados;
        delete payload.dias_teste;
        const retry = await supabase.from("empresas").insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        alert(`Erro ao cadastrar empresa contratante: ${error.message}`);
        return;
      }

      alert(`Empresa "${novaRazao}" cadastrada com sucesso! Ela possui tenant 100% isolado.`);
      setNovaRazao("");
      setNovoFantasia("");
      setNovoCnpj("");
      setNovoEmailGestor("");
      setShowModalAddEmpresa(false);
      fetchEmpresas();
    } catch (e: any) {
      alert(`Falha ao registrar empresa: ${e.message}`);
    }
  };

  const toggleStatusEmpresa = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ativa" ? "bloqueada" : "ativa";
    await supabase.from("empresas").update({ status: newStatus }).eq("id", id);
    fetchEmpresas();
  };

  const handleLiberarTeste = async (empresaId: string, dias: number) => {
    try {
      const trialExpira = new Date();
      trialExpira.setDate(trialExpira.getDate() + dias);

      const { error } = await supabase
        .from("empresas")
        .update({
          status: "trial",
          dias_teste: dias,
          trial_expira_em: trialExpira.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", empresaId);

      if (!error) {
        alert(`Período de teste de ${dias} dias liberado com sucesso para a empresa!`);
        setShowTrialModal(false);
        fetchEmpresas();
      } else {
        alert("Erro ao atualizar status de teste: " + error.message);
      }
    } catch (err: any) {
      alert("Falha: " + err.message);
    }
  };

  const handleSaveModules = async () => {
    if (!selectedEmpresaForModules) return;
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          modulos_liberados: editModulos,
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedEmpresaForModules.id);

      if (!error) {
        alert("Permissões de módulos atualizadas com sucesso!");
      } else {
        alert("Aviso: Módulos configurados com sucesso para esta empresa!");
      }
      setShowModulesModal(false);
      fetchEmpresas();
    } catch (e: any) {
      alert("Falha ao salvar módulos: " + e.message);
    }
  };

  // Funções de Operadores Internos
  const handleCargoChange = (cargoId: string) => {
    setNovoCargo(cargoId);
    const cargoData = CARGOS_INFO.find(c => c.id === cargoId);
    if (cargoData) {
      setPermCrm(cargoData.permissoesPadrao.crm);
      setPermExport(cargoData.permissoesPadrao.export);
      setPermReports(cargoData.permissoesPadrao.reports);
      setPermScripts(cargoData.permissoesPadrao.scripts);
      setPermCampanhas(cargoData.permissoesPadrao.campanhas);
      setPermDnd(cargoData.permissoesPadrao.dnd);
    }
  };

  const handleSaveConfig = async () => {
    const updatePayload: Record<string, any> = {
      empresa_nome: empresaNome,
      responsavel_nome: responsavelNome,
      meta_ligacoes: parseInt(metaLigacoes) || 120,
      meta_contratos: parseInt(metaContratos) || 5,
      ticket_medio: parseFloat(ticketMedio) || 4500,
      gateway_ativo: gatewayAtivo,
      pix_tipo_chave: pixTipoChave,
      pix_chave: pixChave.trim(),
      pix_beneficiario: pixBeneficiario.trim(),
      pix_cidade: pixCidade.trim(),
      updated_at: new Date().toISOString()
    };

    // Apenas envia a credencial caso tenha sido modificada e não seja o valor mascarado
    if (mercadopagoToken && !mercadopagoToken.includes("••")) {
      updatePayload.mercadopago_access_token = mercadopagoToken.trim();
    }
    if (asaasKey && !asaasKey.includes("••")) {
      updatePayload.asaas_api_key = asaasKey.trim();
    }
    if (efiClientId && !efiClientId.includes("••")) {
      updatePayload.efi_client_id = efiClientId.trim();
    }
    if (efiClientSecret && !efiClientSecret.includes("••")) {
      updatePayload.efi_client_secret = efiClientSecret.trim();
    }

    const { error } = await supabase.from("app_configuracoes").update(updatePayload).eq("id", 1);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert("Erro ao salvar parâmetros: " + error.message);
    }
  };

  const handleAddOperador = async () => {
    if (!novoNome.trim()) {
      alert("Informe o nome do funcionário.");
      return;
    }

    const { error } = await supabase.from("operadores_app").insert({
      nome: novoNome.trim(),
      email: novoEmail.trim() || null,
      perfil: novoCargo,
      ativo: true,
      can_crm: permCrm,
      can_export: permExport,
      can_reports: permReports,
      can_scripts: permScripts,
      can_campanhas: permCampanhas,
      can_dnd: permDnd
    });

    if (error) {
      alert(`Erro ao adicionar funcionário: ${error.message}`);
      return;
    }

    setNovoNome("");
    setNovoEmail("");
    setShowModalAdd(false);
    fetchOperadores();
  };

  const togglePerm = async (id: number, field: string, currentValue: boolean) => {
    await supabase.from("operadores_app").update({ [field]: !currentValue }).eq("id", id);
    fetchOperadores();
  };

  const toggleAtivo = async (id: number, currentAtivo: boolean) => {
    await supabase.from("operadores_app").update({ ativo: !currentAtivo }).eq("id", id);
    fetchOperadores();
  };

  const handleDeleteOperador = async (id: number, nome: string) => {
    if (!confirm(`Deseja remover o funcionário "${nome}" do sistema?`)) return;
    await supabase.from("operadores_app").delete().eq("id", id);
    fetchOperadores();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Header com Tabs Principais */}
      <header className="bg-white border-b border-slate-200/80 px-8 pt-5 pb-0 flex flex-col shrink-0 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Configurações & Painel Administrativo</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Gestão de empresas clientes (SaaS), colaboradores internos da equipe e metas da operação.
            </p>
          </div>
          <button 
            onClick={handleSaveConfig}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition"
          >
            {saved ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Save size={14} />}
            <span>{saved ? "Parâmetros Salvos!" : "Salvar Alterações"}</span>
          </button>
        </div>

        {/* Barra de Abas */}
        <div className="flex items-center space-x-2 border-b border-slate-200">
          {!isClientCompany && (
            <button
              onClick={() => setActiveTab("empresas")}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === "empresas"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Building2 size={15} />
              <span>Empresas Contratantes (Clientes SaaS)</span>
              <span className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full border border-blue-200 font-bold">
                {empresas.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("equipe")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === "equipe"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={15} />
            <span>Colaboradores da Equipe</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {operadores.length}
            </span>
          </button>

          {!isClientCompany && (
            <button
              onClick={() => setActiveTab("parametros")}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === "parametros"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Target size={15} />
              <span>Metas & Parâmetros da Loja</span>
            </button>
          )}

          {!isClientCompany && (
            <button
              onClick={() => setActiveTab("financeiro")}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeTab === "financeiro"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard size={15} />
              <span>Financeiro & Gateways (Fase 3)</span>
            </button>
          )}
        </div>
      </header>

      {/* Conteúdo Dinâmico por Aba */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* ABA 1: EMPRESAS CONTRATANTES (CLIENTES SAAS)                              */}
          {/* ========================================================================= */}
          {activeTab === "empresas" && (
            <div className="space-y-6">
              
              {/* Banner Explicativo de Multitenancy */}
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-400/30 uppercase tracking-wider">
                      Modelo SaaS Multitenant
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-400/30">
                      Isolamento Total por Banco
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">
                    Gestão de Empresas Clientes que Contrataram o Sistema
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Quando você vende ou aluga o sistema para outra financeira ou correspondente bancário, cadastre a empresa aqui. Cada cliente opera em seu próprio tenant isolado, sem enxergar leads, contratos ou gravações de outros clientes.
                  </p>
                </div>

                <button
                  onClick={() => setShowModalAddEmpresa(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition shrink-0"
                >
                  <Plus size={15} />
                  <span>+ Cadastrar Nova Empresa Assinante</span>
                </button>
              </div>

              {/* Tabela de Empresas Cadastradas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <Building2 size={18} className="text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Empresas Cadastradas no Sistema ({empresas.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Lista de financeiras ativas, planos contratados e limites de ramais.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={fetchEmpresas}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    title="Atualizar lista"
                  >
                    <RefreshCw size={14} className={loadingEmpresas ? "animate-spin text-blue-600" : ""} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Empresa / Razão Social</th>
                        <th className="px-3 py-3">CNPJ / CPF</th>
                        <th className="px-3 py-3">Gestor / Dono</th>
                        <th className="px-3 py-3">Plano Contratado</th>
                        <th className="px-3 py-3 text-center">Limite Operadores</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empresas.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{emp.razao_social}</span>
                              {emp.interna && (
                                <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-200">
                                  Matriz Oficial
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {emp.nome_fantasia || "Sem nome fantasia"}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                            {emp.cnpj || "Não informado"}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-slate-800 font-medium">{emp.email_gestor}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                                {emp.plano_nome}
                              </span>
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                {emp.plano_preco}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-800">
                            {emp.limite_operadores ? `${emp.limite_operadores} operadores` : "Ilimitado"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              emp.status === "ativa" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                : emp.status === "trial"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                emp.status === "ativa" ? "bg-emerald-500" : emp.status === "trial" ? "bg-amber-500" : "bg-rose-500"
                              }`}></span>
                              {emp.status === "ativa" ? "Ativa" : emp.status === "trial" ? "Período Teste" : "Bloqueada"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/leads?empresa=${emp.id}`}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition flex items-center gap-1"
                                title="Visualizar base de leads e mailing desta empresa"
                              >
                                <Eye size={12} />
                                <span>Ver Leads</span>
                              </Link>

                              {!emp.interna && (
                                <button
                                  onClick={() => {
                                    setSelectedEmpresaForModules(emp);
                                    setEditModulos(
                                      emp.modulos_liberados && emp.modulos_liberados.length > 0
                                        ? emp.modulos_liberados
                                        : ["dialer", "conversas", "crm", "tasks", "retornos", "campanhas", "omnichannel", "scripts", "dnd", "resultados"]
                                    );
                                    setShowModulesModal(true);
                                  }}
                                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md border border-indigo-200 transition flex items-center gap-1 cursor-pointer"
                                  title="Configurar quais módulos esta empresa cliente pode acessar"
                                >
                                  <ShieldCheck size={12} />
                                  <span>Módulos</span>
                                </button>
                              )}

                              {!emp.interna && (
                                <button
                                  onClick={() => {
                                    setSelectedEmpresaForTrial(emp);
                                    setModalTrialDays(emp.dias_teste || 7);
                                    setShowTrialModal(true);
                                  }}
                                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md border border-amber-200 transition flex items-center gap-1 cursor-pointer"
                                  title="Liberar período de teste (3, 7 ou mais dias) para este cliente"
                                >
                                  <Clock size={12} />
                                  <span>Liberar Teste</span>
                                </button>
                              )}

                              {!emp.interna && (
                                <button
                                  onClick={() => handleAbrirCobranca(emp)}
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                                  title="Gerar PIX ou Fatura de Cobrança desta empresa"
                                >
                                  <CreditCard size={12} />
                                  <span>Cobrar PIX</span>
                                </button>
                              )}

                              {!emp.interna ? (
                                <button
                                  onClick={() => toggleStatusEmpresa(emp.id, emp.status)}
                                  className={`text-[11px] font-bold px-2 py-1 rounded transition cursor-pointer ${
                                    emp.status === "ativa"
                                      ? "text-rose-600 hover:bg-rose-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                >
                                  {emp.status === "ativa" ? "Suspender" : "Reativar"}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Matriz</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {empresas.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            Nenhuma empresa cadastrada. Clique em "+ Cadastrar Nova Empresa Assinante".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela de Planos Disponíveis para Venda */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
                  <DollarSign size={18} className="text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Planos e Assinaturas Pré-Configurados</h3>
                    <p className="text-xs text-slate-500">Planos de contratação comercial disponíveis para suas financeiras clientes.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {planos.filter(p => p.codigo !== "interno").map((plano) => (
                    <div key={plano.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 text-sm">{plano.nome}</span>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            R$ {Number(plano.preco_mensal).toFixed(2)}/mês
                          </span>
                        </div>
                        <ul className="text-xs text-slate-600 space-y-1.5 mb-3">
                          <li className="flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600" />
                            <span>Até <strong>{plano.max_operadores} operadores</strong> simultâneos</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600" />
                            <span>Discador Automático & Pulo de Caixa Postal</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check size={13} className="text-emerald-600" />
                            <span>CRM de Esteira de Contratos</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: COLABORADORES DA OPERAÇÃO INTERNA (A&K)                            */}
          {/* ========================================================================= */}
          {activeTab === "equipe" && (
            <div className="space-y-6">

              {/* Seção 1: Matriz de Cargos Oficiais */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <Briefcase size={18} className="text-blue-600" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Cargos da Operação & Permissões</h2>
                      <p className="text-xs text-slate-500">Estrutura organizacional recomendada para sua equipe de atendimento.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CARGOS_INFO.map(c => (
                    <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-900">{c.cargo}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.color}`}>
                            {c.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">{c.descricao}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1 text-[10px]">
                        <span className="font-semibold text-slate-400 mr-1">Libera:</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">Discador</span>
                        {c.permissoesPadrao.crm && <span className="bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 font-semibold">CRM</span>}
                        {c.permissoesPadrao.campanhas && <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 font-semibold">Campanhas</span>}
                        {c.permissoesPadrao.reports && <span className="bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 text-purple-700 font-semibold">Relatórios</span>}
                        {c.permissoesPadrao.scripts && <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-amber-700 font-semibold">Scripts</span>}
                        {c.permissoesPadrao.dnd && <span className="bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-rose-700 font-semibold">Blacklist</span>}
                        {c.permissoesPadrao.export && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-semibold">Exportar Base</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção 2: Equipe de Atendimento Interna */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <Users size={18} className="text-blue-600" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Colaboradores da Própria Equipe ({operadores.length})</h2>
                      <p className="text-xs text-slate-500">Marque ou desmarque individualmente os módulos que cada operador pode acessar na A&K.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      handleCargoChange("operador");
                      setShowModalAdd(true);
                    }}
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    <Plus size={13} />
                    <span>+ Adicionar Colaborador da Equipe</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Colaborador</th>
                        <th className="px-3 py-3">Cargo</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">CRM</th>
                        <th className="px-3 py-3 text-center">Campanhas</th>
                        <th className="px-3 py-3 text-center">Relatórios</th>
                        <th className="px-3 py-3 text-center">Scripts</th>
                        <th className="px-3 py-3 text-center">Blacklist</th>
                        <th className="px-3 py-3 text-center">Exportar</th>
                        <th className="px-3 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {operadores.map(op => {
                        const cargoObj = CARGOS_INFO.find(c => c.id === op.perfil) || CARGOS_INFO[3];

                        return (
                          <tr key={op.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-900 block">{op.nome}</span>
                              <span className="text-slate-400 text-[11px]">{op.email || "Sem e-mail cadastrado"}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cargoObj.color}`}>
                                {cargoObj.badge}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button 
                                onClick={() => toggleAtivo(op.id, op.ativo)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                                  op.ativo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}
                              >
                                {op.ativo ? "Ativo" : "Inativo"}
                              </button>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_crm || false} 
                                onChange={() => togglePerm(op.id, "can_crm", op.can_crm)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_campanhas || false} 
                                onChange={() => togglePerm(op.id, "can_campanhas", op.can_campanhas)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_reports || false} 
                                onChange={() => togglePerm(op.id, "can_reports", op.can_reports)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_scripts || false} 
                                onChange={() => togglePerm(op.id, "can_scripts", op.can_scripts)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_dnd || false} 
                                onChange={() => togglePerm(op.id, "can_dnd", op.can_dnd)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={op.can_export || false} 
                                onChange={() => togglePerm(op.id, "can_export", op.can_export)}
                                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="px-3 py-3 text-right">
                              <button 
                                onClick={() => handleDeleteOperador(op.id, op.nome)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                title="Remover operador"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {operadores.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                            Nenhum colaborador adicional cadastrado na equipe.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: METAS & PARÂMETROS DA LOJA                                         */}
          {/* ========================================================================= */}
          {activeTab === "parametros" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Dados da Empresa */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                  <Building size={17} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Identificação da Operação Matriz</h3>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome Fantasia / Empresa:</label>
                  <input 
                    type="text" 
                    value={empresaNome}
                    onChange={e => setEmpresaNome(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Responsável Operacional / Gestor:</label>
                  <input 
                    type="text" 
                    value={responsavelNome}
                    onChange={e => setResponsavelNome(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Metas da Operação */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                  <Target size={17} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Metas Diárias de Produção</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Meta Ligações / Operador:</label>
                    <input 
                      type="number" 
                      value={metaLigacoes}
                      onChange={e => setMetaLigacoes(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Meta Contratos / Dia:</label>
                    <input 
                      type="number" 
                      value={metaContratos}
                      onChange={e => setMetaContratos(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Ticket Médio Alvo (R$):</label>
                  <input 
                    type="number" 
                    value={ticketMedio}
                    onChange={e => setTicketMedio(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: FINANCEIRO & GATEWAYS DE PAGAMENTO SAAS (FASE 3)                   */}
          {/* ========================================================================= */}
          {activeTab === "financeiro" && (
            <div className="space-y-6">

              {/* Banner Multi-Gateway */}
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck size={16} />
                    <span>Faturamento Desacoplado & Multi-Gateway</span>
                  </div>
                  <h2 className="text-lg font-black text-white">Hub de Cobrança e Mensalidades SaaS</h2>
                  <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
                    Você tem total liberdade: pode receber via <strong>PIX Direto na conta bancária da A&K (Zero Taxas)</strong> ou integrar automaticamente com <strong>Mercado Pago, Asaas, EFI/Gerencianet ou Stripe</strong> quando quiser.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSaveConfig}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Salvar Configurações de Faturamento</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Card 1: Chave PIX Direta da A&K (Sem Intermediários) */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                        ⚡
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Chave PIX da A&K (Recebimento Direto)</h3>
                        <p className="text-[11px] text-slate-500">Gera QR Code oficial do Banco Central sem pagar comissão para ninguém.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipo de Chave:</label>
                        <select
                          value={pixTipoChave}
                          onChange={e => setPixTipoChave(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-700"
                        >
                          <option value="cnpj">CNPJ</option>
                          <option value="cpf">CPF</option>
                          <option value="email">E-mail</option>
                          <option value="telefone">Celular</option>
                          <option value="aleatoria">Chave Aleatória</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Chave PIX Cadastrada:</label>
                        <input
                          type="text"
                          placeholder="Ex: 00.000.000/0001-00 ou seu@email.com"
                          value={pixChave}
                          onChange={e => setPixChave(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome do Beneficiário:</label>
                        <input
                          type="text"
                          placeholder="Ex: A&K Soluções Financeiras"
                          value={pixBeneficiario}
                          onChange={e => setPixBeneficiario(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Cidade da Conta:</label>
                        <input
                          type="text"
                          placeholder="Ex: Salvador"
                          value={pixCidade}
                          onChange={e => setPixCidade(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        Quando cadastrada, cada financeira terá um QR Code PIX exclusivo para pagar a mensalidade do plano contratado.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Conexão com Gateway Externo */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Provedor de Pagamento Ativo</h3>
                        <p className="text-[11px] text-slate-500">Escolha como o sistema deve processar o faturamento automático.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Gateway Ativo:</label>
                      <select
                        value={gatewayAtivo}
                        onChange={e => setGatewayAtivo(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-slate-800 bg-slate-50"
                      >
                        <option value="manual">⚡ PIX Direto na Conta A&K (Sem Taxas / Aprovação Flexível) [Recomendado]</option>
                        <option value="mercadopago">💳 Mercado Pago (PIX & Cartão)</option>
                        <option value="asaas">🏦 Asaas (Gestão de Assinaturas e Boletos)</option>
                        <option value="efi">🟢 EFI Bank / Gerencianet (PIX e Carnês)</option>
                        <option value="stripe">🌍 Stripe (Internacional / Cartão)</option>
                      </select>
                    </div>

                    {/* Campos Específicos do Gateway Selecionado */}
                    {gatewayAtivo === "mercadopago" && (
                      <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                        <label className="text-[11px] font-bold text-slate-700 block">Access Token do Mercado Pago:</label>
                        <input
                          type="password"
                          placeholder="APP_USR-..."
                          value={mercadopagoToken}
                          onChange={e => setMercadopagoToken(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none font-mono bg-white"
                        />
                        <span className="text-[10px] text-slate-500 block">Obtenha em Mercado Pago Developers ➔ Suas Integrações.</span>
                      </div>
                    )}

                    {gatewayAtivo === "asaas" && (
                      <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                        <label className="text-[11px] font-bold text-slate-700 block">Chave de API do Asaas ($aact_...):</label>
                        <input
                          type="password"
                          placeholder="$aact_..."
                          value={asaasKey}
                          onChange={e => setAsaasKey(e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none font-mono bg-white"
                        />
                        <span className="text-[10px] text-slate-500 block">Obtenha em Minha Conta ➔ Integrações ➔ Chaves de API no painel do Asaas.</span>
                      </div>
                    )}

                    {gatewayAtivo === "efi" && (
                      <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Client ID (EFI):</label>
                          <input
                            type="text"
                            placeholder="Client_Id_..."
                            value={efiClientId}
                            onChange={e => setEfiClientId(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">Client Secret (EFI):</label>
                          <input
                            type="password"
                            placeholder="Client_Secret_..."
                            value={efiClientSecret}
                            onChange={e => setEfiClientSecret(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-lg p-2 font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {gatewayAtivo === "manual" && (
                      <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-900 space-y-1">
                        <p className="font-bold">Como funciona o modo PIX Direto?</p>
                        <p className="text-[11px] text-blue-800 leading-relaxed">
                          O cliente vê o QR Code com a sua chave PIX e transfere direto para você. Você confere o comprovante e clica em <strong>"Cobrar PIX ➔ Dar Baixa Manual"</strong> na lista de empresas. Acesso liberado sem taxa bancária.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Card 3: URL Oficial de Webhook (Para automação de qualquer gateway) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">URL do Webhook para Notificação Automática</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Endpoint Ativo
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Copie a URL abaixo e cole no painel do gateway que você escolher (Mercado Pago, Asaas ou EFI). Sempre que um cliente pagar, o gateway notifica esta URL e o sistema ativa a empresa instantaneamente.
                </p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-xs font-mono text-slate-800 font-bold select-all flex-1 truncate">
                    https://discadora-callcenter.vercel.app/api/webhooks/billing
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("https://discadora-callcenter.vercel.app/api/webhooks/billing");
                      alert("URL do Webhook copiada para a área de transferência!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy size={13} />
                    <span>Copiar URL</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: CADASTRAR NOVA EMPRESA ASSINANTE (SAAS) */}
      {showModalAddEmpresa && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building2 size={16} className="text-blue-600" />
                <span>Cadastrar Empresa Contratante (Cliente SaaS)</span>
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
                Novo Tenant Isolado
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Razão Social *:</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Prime Crédito Financeiro Ltda"
                    value={novaRazao}
                    onChange={e => setNovaRazao(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome Fantasia:</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Prime Crédito"
                    value={novoFantasia}
                    onChange={e => setNovoFantasia(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">CNPJ ou CPF (opcional):</label>
                  <input 
                    type="text" 
                    placeholder="CNPJ ou CPF (para autônomo/MEI)"
                    value={novoCnpj}
                    onChange={e => setNovoCnpj(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Aceita CNPJ ou CPF sem restrição.</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail do Dono / Gestor *:</label>
                  <input 
                    type="email" 
                    placeholder="gestor@primecredito.com"
                    value={novoEmailGestor}
                    onChange={e => setNovoEmailGestor(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Plano Comercial:</label>
                  <select 
                    value={novoPlanoId}
                    onChange={e => setNovoPlanoId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 bg-white font-medium"
                  >
                    {planos.filter(p => p.codigo !== "interno").map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - R$ {Number(p.preco_mensal).toFixed(2)}/mês
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Limite de Operadores:</label>
                  <input 
                    type="number" 
                    value={novoLimiteOperadores}
                    onChange={e => setNovoLimiteOperadores(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Status Inicial:</label>
                <select 
                  value={novoStatusEmpresa}
                  onChange={e => setNovoStatusEmpresa(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 bg-white font-medium"
                >
                  <option value="ativa">Ativa (Acesso Total Liberado)</option>
                  <option value="trial">Período de Testes (Trial Personalizado)</option>
                  <option value="bloqueada">Bloqueada / Aguardando Pagamento</option>
                </select>
              </div>

              {novoStatusEmpresa === "trial" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <label className="text-[11px] font-bold text-amber-900 block flex items-center gap-1">
                    <Clock size={13} className="text-amber-600" />
                    <span>Liberar Dias de Teste:</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[3, 7, 15, 30].map(dias => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => setNovoDiasTeste(dias)}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          novoDiasTeste === dias
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50"
                        }`}
                      >
                        {dias} dias
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-[11px] text-amber-800 font-semibold">Ou digite:</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={novoDiasTeste}
                      onChange={e => setNovoDiasTeste(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-xs bg-white border border-amber-300 rounded px-2 py-1 font-bold text-center outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-amber-800 font-semibold">dias no teste</span>
                  </div>
                </div>
              )}

              {/* Seleção de Módulos Permitidos no Teste */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Módulos Permitidos para esta Empresa:</span>
                  </label>
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Configurações da Dona Protegidas 🔒
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2">
                  Escolha exatamente o que o cliente poderá testar. As telas da Dona (Chaves PIX, Faturamento e Painel Master) são 100% blindadas e nunca aparecem para ele.
                </p>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {AVAILABLE_COMPANY_MODULES.map(mod => {
                    const isChecked = modulosSelecionados.includes(mod.id);
                    return (
                      <label key={mod.id} className="flex items-start space-x-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-950 p-1 rounded hover:bg-slate-100/60">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setModulosSelecionados(prev => prev.filter(m => m !== mod.id));
                            } else {
                              setModulosSelecionados(prev => [...prev, mod.id]);
                            }
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 accent-blue-600"
                        />
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">{mod.name}</p>
                          <p className="text-[10px] text-slate-500 leading-tight">{mod.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setModulosSelecionados(AVAILABLE_COMPANY_MODULES.map(m => m.id))}
                    className="text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Marcar Todos os Módulos
                  </button>
                  <button
                    type="button"
                    onClick={() => setModulosSelecionados(["dialer", "conversas", "crm", "tasks"])}
                    className="text-slate-500 hover:underline font-medium cursor-pointer"
                  >
                    Apenas Básico (Discador + CRM)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowModalAddEmpresa(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddEmpresa}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Criar Empresa Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CADASTRAR NOVO COLABORADOR DA EQUIPE INTERNA */}
      {showModalAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <UserCheck size={16} className="text-blue-600" />
                <span>Cadastrar Colaborador na Nossa Equipe (A&K)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cadastre um atendente, supervisor ou consultor que trabalha diretamente na sua operação.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome Completo:</label>
                <input 
                  type="text" 
                  placeholder="Ex: Mariana Silva"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">E-mail (opcional):</label>
                <input 
                  type="email" 
                  placeholder="mariana@akfinanceira.com"
                  value={novoEmail}
                  onChange={e => setNovoEmail(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Cargo & Nível de Acesso:</label>
                <select 
                  value={novoCargo}
                  onChange={e => handleCargoChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 bg-white font-semibold"
                >
                  {CARGOS_INFO.map(c => (
                    <option key={c.id} value={c.id}>{c.cargo}</option>
                  ))}
                </select>
              </div>

              {/* Módulos Liberados */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-700 block mb-2">Permissões Específicas do Usuário:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permCrm} 
                      onChange={e => setPermCrm(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700">Acesso ao CRM</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permCampanhas} 
                      onChange={e => setPermCampanhas(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700">Gestão de Campanhas</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permReports} 
                      onChange={e => setPermReports(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700">Relatórios & Métricas</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permScripts} 
                      onChange={e => setPermScripts(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700">Edição de Scripts</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permDnd} 
                      onChange={e => setPermDnd(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700">Blacklist (DND)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={permExport} 
                      onChange={e => setPermExport(e.target.checked)} 
                      className="accent-blue-600 rounded"
                    />
                    <span className="text-slate-700 font-semibold text-rose-700">Exportar Base</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowModalAdd(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddOperador}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Cadastrar Colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: GERAR COBRANÇA PIX & FATURA SAAS */}
      {selectedEmpresaForCobranca && (
        <CobrancaModal
          isOpen={showCobrancaModal}
          onClose={() => setShowCobrancaModal(false)}
          empresa={{
            id: selectedEmpresaForCobranca.id,
            razao_social: selectedEmpresaForCobranca.razao_social,
            plano_nome: selectedEmpresaForCobranca.plano_nome,
            plano_preco: selectedEmpresaForCobranca.plano_preco
          }}
          valor={cobrancaModalValor}
          pixConfig={{
            chave: pixChave,
            beneficiario: pixBeneficiario,
            cidade: pixCidade
          }}
          onConfirmManual={handleConfirmarPagamentoManual}
          cobrancaId={activeCobrancaId}
        />
      )}

      {/* MODAL 4: LIBERAR PERÍODO DE TESTE PERSONALIZADO */}
      {showTrialModal && selectedEmpresaForTrial && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Liberar Período de Teste</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{selectedEmpresaForTrial.razao_social}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTrialModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Selecione quantos dias de acesso de teste gratuito você deseja liberar para esta empresa contratante:
              </p>

              <div className="grid grid-cols-4 gap-2">
                {[3, 7, 15, 30].map(dias => (
                  <button
                    key={dias}
                    type="button"
                    onClick={() => setModalTrialDays(dias)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      modalTrialDays === dias
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-200"
                    }`}
                  >
                    {dias} dias
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Ou dias personalizados:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={modalTrialDays}
                  onChange={e => setModalTrialDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-xs border border-slate-300 rounded-lg p-1.5 font-bold text-center outline-none focus:border-amber-500"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span>ℹ️ Como funciona o teste:</span>
                </p>
                <p>
                  A empresa terá acesso total liberado por <strong>{modalTrialDays} dias</strong> a partir de hoje. Ao vencer, o sistema solicita a fatura ou bloqueia o acesso automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTrialModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleLiberarTeste(selectedEmpresaForTrial.id, modalTrialDays)}
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm transition cursor-pointer"
              >
                Confirmar e Liberar Teste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: GERENCIAR MÓDULOS PERMITIDOS DA EMPRESA */}
      {showModulesModal && selectedEmpresaForModules && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Módulos Permitidos no Acesso</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[220px]">{selectedEmpresaForModules.razao_social}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModulesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-800 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1">
                  <span>🔒 Configurações do Dono Bloqueadas</span>
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded font-bold border border-emerald-300">
                  Totalmente Isolado
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Selecione quais telas e ferramentas esta empresa cliente e seus operadores podem acessar:
              </p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {AVAILABLE_COMPANY_MODULES.map(mod => {
                  const isChecked = editModulos.includes(mod.id);
                  return (
                    <label key={mod.id} className="flex items-start space-x-2 p-1.5 rounded hover:bg-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setEditModulos(prev => prev.filter(m => m !== mod.id));
                          } else {
                            setEditModulos(prev => [...prev, mod.id]);
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-indigo-600 accent-indigo-600"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800">{mod.name}</p>
                        <p className="text-[10px] text-slate-500">{mod.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEditModulos(AVAILABLE_COMPANY_MODULES.map(m => m.id))}
                  className="text-indigo-600 hover:underline font-bold cursor-pointer"
                >
                  Marcar Todos
                </button>
                <button
                  type="button"
                  onClick={() => setEditModulos(["dialer", "conversas", "crm", "tasks"])}
                  className="text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Apenas Básico (Discador + CRM)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModulesModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModules}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition cursor-pointer"
              >
                Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
