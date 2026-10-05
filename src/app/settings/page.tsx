"use client";

import React, { useState, useEffect } from "react";
import { Settings, Building, Users, Target, Save, CheckCircle2, Plus, Trash2, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [empresaNome, setEmpresaNome] = useState("A&K Soluções Financeiras");
  const [metaLigacoes, setMetaLigacoes] = useState("120");
  const [metaContratos, setMetaContratos] = useState("5");
  
  // Operadores e Permissões
  const [operadores, setOperadores] = useState<any[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerfil, setNovoPerfil] = useState("operador");
  
  // Permissões do novo operador
  const [permCrm, setPermCrm] = useState(true);
  const [permExport, setPermExport] = useState(false);
  const [permReports, setPermReports] = useState(false);
  const [permScripts, setPermScripts] = useState(false);
  const [permCampanhas, setPermCampanhas] = useState(false);
  const [permDnd, setPermDnd] = useState(false);

  const [saved, setSaved] = useState(false);

  const fetchOperadores = async () => {
    const { data } = await supabase.from("operadores_app").select("*").order("id", { ascending: true });
    if (data) setOperadores(data);
  };

  useEffect(() => {
    fetchOperadores();
    const savedConfig = localStorage.getItem("ak_settings_full");
    if (savedConfig) {
      try {
        const c = JSON.parse(savedConfig);
        if (c.empresaNome) setEmpresaNome(c.empresaNome);
        if (c.metaLigacoes) setMetaLigacoes(c.metaLigacoes);
        if (c.metaContratos) setMetaContratos(c.metaContratos);
      } catch (e) {}
    }
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem("ak_settings_full", JSON.stringify({
      empresaNome,
      metaLigacoes,
      metaContratos
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleAddOperador = async () => {
    if (!novoNome.trim()) {
      alert("Informe o nome do funcionário.");
      return;
    }

    await supabase.from("operadores_app").insert({
      nome: novoNome.trim(),
      email: novoEmail.trim() || null,
      perfil: novoPerfil,
      ativo: true,
      can_crm: novoPerfil === "admin" ? true : permCrm,
      can_export: novoPerfil === "admin" ? true : permExport,
      can_reports: novoPerfil === "admin" ? true : permReports,
      can_scripts: novoPerfil === "admin" ? true : permScripts,
      can_campanhas: novoPerfil === "admin" ? true : permCampanhas,
      can_dnd: novoPerfil === "admin" ? true : permDnd
    });

    setNovoNome("");
    setNovoEmail("");
    fetchOperadores();
  };

  const togglePerm = async (id: number, field: string, currentValue: boolean) => {
    await supabase.from("operadores_app").update({ [field]: !currentValue }).eq("id", id);
    fetchOperadores();
  };

  const handleDeleteOperador = async (id: number) => {
    if (!confirm("Remover este funcionário do sistema?")) return;
    await supabase.from("operadores_app").delete().eq("id", id);
    fetchOperadores();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações & Controle de Acesso</h1>
          <p className="text-slate-500 text-xs mt-0.5">Gestão de equipe, permissões de telas para funcionários e metas da empresa.</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition"
        >
          <Save size={14} />
          <span>Salvar Metas</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}

          {/* Dados da Operação */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building className="text-blue-600" size={16} />
              <span>Identificação da Sua Empresa</span>
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Empresa / Call Center:</label>
              <input 
                type="text" 
                value={empresaNome}
                onChange={e => setEmpresaNome(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          {/* Metas da Operação */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Target className="text-emerald-600" size={16} />
              <span>Metas Diárias de Produção</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Meta de Ligações / Dia:</label>
                <input 
                  type="number" 
                  value={metaLigacoes}
                  onChange={e => setMetaLigacoes(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Meta de Contratos Fechados / Dia:</label>
                <input 
                  type="number" 
                  value={metaContratos}
                  onChange={e => setMetaContratos(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none font-mono font-bold text-emerald-700"
                />
              </div>
            </div>
          </div>

          {/* Gestão de Equipe & Permissões Reais */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="text-purple-600" size={16} />
                <span>Cadastro de Funcionários & Controle de Permissões</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Defina exatamente o que cada funcionário pode ver ou fazer na central.</p>
            </div>

            {/* Formulário Novo Atendente com Permissões */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Cadastrar Novo Funcionário</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <input 
                  type="text" 
                  placeholder="Nome do Atendente"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
                <input 
                  type="email" 
                  placeholder="E-mail (opcional)"
                  value={novoEmail}
                  onChange={e => setNovoEmail(e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
                <select 
                  value={novoPerfil}
                  onChange={e => setNovoPerfil(e.target.value)}
                  className="bg-white border border-slate-200 p-2 rounded-lg text-xs outline-none font-semibold text-slate-700"
                >
                  <option value="operador">Operador (Apenas telas liberadas)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </select>
              </div>

              {novoPerfil === "operador" && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">Selecione o que liberar para este funcionário:</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700 font-medium">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permCrm} onChange={e => setPermCrm(e.target.checked)} className="rounded text-blue-600" />
                      <span>Acessar CRM (Funil)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permExport} onChange={e => setPermExport(e.target.checked)} className="rounded text-blue-600" />
                      <span>Exportar Planilhas Excel</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permReports} onChange={e => setPermReports(e.target.checked)} className="rounded text-blue-600" />
                      <span>Ver Relatórios e Resultados</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permScripts} onChange={e => setPermScripts(e.target.checked)} className="rounded text-blue-600" />
                      <span>Editar Scripts de Vendas</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permCampanhas} onChange={e => setPermCampanhas(e.target.checked)} className="rounded text-blue-600" />
                      <span>Criar / Pausar Campanhas</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={permDnd} onChange={e => setPermDnd(e.target.checked)} className="rounded text-blue-600" />
                      <span>Gerenciar Não Perturbe</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-2 text-right">
                <button 
                  onClick={handleAddOperador}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
                >
                  + Cadastrar Funcionário
                </button>
              </div>
            </div>

            {/* Tabela de Funcionários Cadastrados com Switches de Permissão */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">Funcionários Cadastrados ({operadores.length})</span>
              {operadores.map(op => (
                <div key={op.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/50 space-y-2.5 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-200">
                        {op.nome.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-xs text-slate-900">{op.nome}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            op.perfil === "admin" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {op.perfil}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{op.email || "Sem e-mail"}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteOperador(op.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 transition"
                      title="Excluir funcionário"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {op.perfil !== "admin" && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px]">
                      <button 
                        onClick={() => togglePerm(op.id, "can_crm", op.can_crm)}
                        className={`px-2 py-1 rounded border font-semibold ${op.can_crm ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                      >
                        CRM: {op.can_crm ? "Liberado" : "Bloqueado"}
                      </button>
                      <button 
                        onClick={() => togglePerm(op.id, "can_export", op.can_export)}
                        className={`px-2 py-1 rounded border font-semibold ${op.can_export ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                      >
                        Exportar Excel: {op.can_export ? "Liberado" : "Bloqueado"}
                      </button>
                      <button 
                        onClick={() => togglePerm(op.id, "can_reports", op.can_reports)}
                        className={`px-2 py-1 rounded border font-semibold ${op.can_reports ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                      >
                        Resultados: {op.can_reports ? "Liberado" : "Bloqueado"}
                      </button>
                      <button 
                        onClick={() => togglePerm(op.id, "can_scripts", op.can_scripts)}
                        className={`px-2 py-1 rounded border font-semibold ${op.can_scripts ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                      >
                        Editar Scripts: {op.can_scripts ? "Liberado" : "Bloqueado"}
                      </button>
                      <button 
                        onClick={() => togglePerm(op.id, "can_campanhas", op.can_campanhas)}
                        className={`px-2 py-1 rounded border font-semibold ${op.can_campanhas ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}
                      >
                        Campanhas: {op.can_campanhas ? "Liberado" : "Bloqueado"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {operadores.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400">Nenhum funcionário cadastrado ainda. Use o formulário acima para adicionar.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
