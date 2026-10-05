"use client";

import React, { useState, useEffect } from "react";
import { Settings, Building, Users, Target, Save, CheckCircle2, Plus, Trash2, ShieldCheck, Lock, UserCheck, Briefcase, Eye, ShieldAlert, Award } from "lucide-react";
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
  const [empresaNome, setEmpresaNome] = useState("A&K Soluções Financeiras");
  const [responsavelNome, setResponsavelNome] = useState("Adriel");
  const [metaLigacoes, setMetaLigacoes] = useState("120");
  const [metaContratos, setMetaContratos] = useState("5");
  const [ticketMedio, setTicketMedio] = useState("4500");
  
  // Operadores e Permissões
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoCargo, setNovoCargo] = useState("operador");
  
  // Permissões do formulário
  const [permCrm, setPermCrm] = useState(false);
  const [permExport, setPermExport] = useState(false);
  const [permReports, setPermReports] = useState(false);
  const [permScripts, setPermScripts] = useState(false);
  const [permCampanhas, setPermCampanhas] = useState(false);
  const [permDnd, setPermDnd] = useState(false);

  const [saved, setSaved] = useState(false);
  const [showModalAdd, setShowModalAdd] = useState(false);

  const fetchOperadores = async () => {
    const { data } = await supabase.from("operadores_app").select("*").order("id", { ascending: true });
    if (data) setOperadores(data as Operador[]);
  };

  useEffect(() => {
    fetchOperadores();
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

  // Quando muda o cargo no select, preenche as permissões padrão automaticamente
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
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações & Gestão de Equipe</h1>
          <p className="text-slate-500 text-xs mt-0.5">Cargos, controle de acesso a módulos para colaboradores e metas operacionais.</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition"
        >
          {saved ? <CheckCircle2 size={14} className="text-emerald-300" /> : <Save size={14} />}
          <span>{saved ? "Parâmetros Salvos!" : "Salvar Parâmetros"}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Seção 1: Matriz de Cargos Oficiais */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Briefcase size={18} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Cargos da Operação & O que Cada Um Libera</h2>
                  <p className="text-xs text-slate-500">Estrutura organizacional recomendada para call centers e correspondentes de crédito.</p>
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

          {/* Seção 2: Equipe de Atendimento & Controle Granular de Acesso */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <Users size={18} className="text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Equipe de Atendimento & Permissões Ativas ({operadores.length})</h2>
                  <p className="text-xs text-slate-500">Marque ou desmarque individualmente os módulos que cada colaborador pode acessar.</p>
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
                <span>+ Adicionar Colaborador</span>
              </button>
            </div>

            {/* Tabela de Colaboradores com Switches de Permissão */}
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

                        {/* Permissão: CRM */}
                        <td className="px-3 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={op.can_crm || false} 
                            onChange={() => togglePerm(op.id, "can_crm", op.can_crm)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Permissão: Campanhas */}
                        <td className="px-3 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={op.can_campanhas || false} 
                            onChange={() => togglePerm(op.id, "can_campanhas", op.can_campanhas)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Permissão: Relatórios */}
                        <td className="px-3 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={op.can_reports || false} 
                            onChange={() => togglePerm(op.id, "can_reports", op.can_reports)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Permissão: Scripts */}
                        <td className="px-3 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={op.can_scripts || false} 
                            onChange={() => togglePerm(op.id, "can_scripts", op.can_scripts)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Permissão: Blacklist DND */}
                        <td className="px-3 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={op.can_dnd || false} 
                            onChange={() => togglePerm(op.id, "can_dnd", op.can_dnd)}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </td>

                        {/* Permissão: Exportar Base */}
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
                        Nenhum colaborador cadastrado além de você.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seção 3: Identificação & Metas Operacionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados da Empresa */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                <Building size={17} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Identificação da Operação</h3>
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
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
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
        </div>
      </div>

      {/* Modal Adicionar Colaborador */}
      {showModalAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <UserCheck size={16} className="text-blue-600" />
              <span>Cadastrar Novo Colaborador</span>
            </h3>

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
