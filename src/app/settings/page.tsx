"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, Building, Users, Target, Save, CheckCircle2, Plus, Trash2, 
  ShieldCheck, Lock, UserCheck, Briefcase, Eye, ShieldAlert, Award, 
  Building2, DollarSign, Layers, ChevronRight, Check, AlertCircle, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  created_at?: string;
  plano_nome?: string;
  plano_preco?: string;
}

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
  const [activeTab, setActiveTab] = useState<"empresas" | "equipe" | "parametros">("empresas");

  // Configurações Gerais
  const [empresaNome, setEmpresaNome] = useState("A&K Soluções Financeiras");
  const [responsavelNome, setResponsavelNome] = useState("Adriel Matos Santos");
  const [metaLigacoes, setMetaLigacoes] = useState("120");
  const [metaContratos, setMetaContratos] = useState("5");
  const [ticketMedio, setTicketMedio] = useState("4500");
  const [saved, setSaved] = useState(false);

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
      if (tabParam === "empresas" || tabParam === "equipe" || tabParam === "parametros") {
        setActiveTab(tabParam);
      }
    }

    const savedConfig = localStorage.getItem("ak_settings_full_v2");
    if (savedConfig) {
      try {
        const c = JSON.parse(savedConfig);
        if (c.empresaNome) setEmpresaNome(c.empresaNome);
        if (c.responsavelNome) setResponsavelNome(c.responsavelNome);
        if (c.metaLigacoes) setMetaLigacoes(c.metaLigacoes);
        if (c.metaContratos) setMetaContratos(c.metaContratos);
        if (c.ticketMedio) setTicketMedio(c.ticketMedio);
      } catch (e) {}
    }
  }, []);

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
      const { data, error } = await supabase.from("empresas").insert({
        razao_social: novaRazao.trim(),
        nome_fantasia: novoFantasia.trim() || novaRazao.trim(),
        cnpj: novoCnpj.trim() || null,
        email_gestor: novoEmailGestor.trim().toLowerCase(),
        status: novoStatusEmpresa,
        plano_id: novoPlanoId || null,
        limite_operadores: parseInt(novoLimiteOperadores) || 5,
        limite_ramais: parseInt(novoLimiteOperadores) || 5,
        interna: false
      }).select().single();

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

  const handleSaveConfig = () => {
    localStorage.setItem("ak_settings_full_v2", JSON.stringify({
      empresaNome,
      responsavelNome,
      metaLigacoes,
      metaContratos,
      ticketMedio
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
          <button
            onClick={() => setActiveTab("empresas")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
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

          <button
            onClick={() => setActiveTab("equipe")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "equipe"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={15} />
            <span>Colaboradores da Equipe (A&K)</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {operadores.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("parametros")}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "parametros"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Target size={15} />
            <span>Metas & Parâmetros da Loja</span>
          </button>
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
                        <th className="px-3 py-3">CNPJ</th>
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
                            {!emp.interna ? (
                              <button
                                onClick={() => toggleStatusEmpresa(emp.id, emp.status)}
                                className={`text-[11px] font-bold px-2 py-1 rounded transition ${
                                  emp.status === "ativa"
                                    ? "text-rose-600 hover:bg-rose-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                {emp.status === "ativa" ? "Suspender" : "Reativar"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Dona</span>
                            )}
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
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">CNPJ (opcional):</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000/0001-00"
                    value={novoCnpj}
                    onChange={e => setNovoCnpj(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 font-mono"
                  />
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
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="ativa">Ativa (Acesso Liberado)</option>
                  <option value="trial">Período de Testes (Trial 7 dias)</option>
                  <option value="bloqueada">Bloqueada / Aguardando Pagamento</option>
                </select>
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

    </div>
  );
}
