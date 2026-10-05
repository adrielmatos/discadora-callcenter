"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, CheckCircle2, Plus, Trash2, Sparkles, Copy, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [abertura, setAbertura] = useState("");
  const [motivo, setMotivo] = useState("");
  const [qualificacao, setQualificacao] = useState("");
  const [fechamento, setFechamento] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal Novo Roteiro
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProduto, setNewProduto] = useState("");

  const fetchScripts = async () => {
    setLoading(true);
    const { data } = await supabase.from("scripts_ligacao").select("*").order("id", { ascending: true });
    if (data && data.length > 0) {
      setScripts(data);
      if (!selectedScript) selectScript(data[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const selectScript = (s: any) => {
    setSelectedScript(s);
    setAbertura(s.abertura || "");
    setMotivo(s.motivo || "");
    setQualificacao(s.qualificacao || "");
    setFechamento(s.fechamento || "");
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedScript?.id) return;

    await supabase.from("scripts_ligacao").update({
      abertura,
      motivo,
      qualificacao,
      fechamento
    }).eq("id", selectedScript.id);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    fetchScripts();
  };

  // Propagar Script Mestre para todos os outros produtos
  const handlePropagateMaster = async () => {
    if (!confirm("Deseja aplicar a Abertura e o Fechamento deste Script Mestre para todos os outros produtos? Os motivos específicos de cada produto serão preservados.")) return;

    const updates = scripts.filter(s => s.id !== selectedScript.id).map(s => 
      supabase.from("scripts_ligacao").update({
        abertura,
        fechamento
      }).eq("id", s.id)
    );

    await Promise.all(updates);
    alert("Script Mestre propagado com sucesso para todos os produtos da central!");
    fetchScripts();
  };

  const handleCreateNew = async () => {
    if (!newProduto.trim()) {
      alert("Informe o nome do produto.");
      return;
    }

    const { data, error } = await supabase.from("scripts_ligacao").insert({
      produto: newProduto.trim(),
      abertura: `Olá, [NOME], tudo bem? Aqui é o Adriel da A&K Soluções Financeiras.`,
      motivo: `Estou entrando em contato referente à liberação de ${newProduto} pelo [BANCO].`,
      qualificacao: `Gostaria de conhecer os prazos e condições disponíveis?`,
      fechamento: `Posso formatar a proposta de [VALOR] e te enviar pelo WhatsApp para analisar?`
    }).select().single();

    if (error) {
      alert("Erro ao criar script: " + error.message);
      return;
    }

    setNewProduto("");
    setShowNewModal(false);
    await fetchScripts();
    if (data) selectScript(data);
  };

  const handleDelete = async (id: number) => {
    if (scripts.length <= 1) {
      alert("É necessário manter ao menos um roteiro no sistema.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este roteiro de produto?")) return;

    await supabase.from("scripts_ligacao").delete().eq("id", id);
    setSelectedScript(null);
    fetchScripts();
  };

  const isMaster = selectedScript?.produto?.toLowerCase().includes("mestre") || selectedScript?.produto?.toLowerCase().includes("geral");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catálogo de Roteiros & Scripts</h1>
          <p className="text-slate-500 text-xs mt-0.5">Roteiros operacionais de crédito consignado, cartões, FGTS e garantias.</p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition"
        >
          <Plus size={14} />
          <span>Novo Roteiro de Produto</span>
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de Roteiros */}
        <div className="w-72 bg-white border-r border-slate-200/80 overflow-y-auto p-3 space-y-1 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-2">
            Produtos Cadastrados ({scripts.length})
          </span>
          {scripts.map(s => {
            const isSelected = selectedScript?.id === s.id;
            const isItemMaster = s.produto?.toLowerCase().includes("mestre");
            return (
              <div 
                key={s.id}
                onClick={() => selectScript(s)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center justify-between group ${
                  isSelected 
                    ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold" 
                    : isItemMaster ? "bg-amber-50/50 text-amber-900 border border-amber-200/60" : "text-slate-700 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  {isItemMaster ? <Sparkles size={14} className="text-amber-500 shrink-0" /> : <FileText size={14} className={isSelected ? "text-blue-600" : "text-slate-400"} />}
                  <span className="truncate">{s.produto}</span>
                </div>
                {!isItemMaster && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 p-0.5 transition"
                    title="Excluir roteiro"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Editor do Script */}
        <div className="flex-1 p-8 overflow-y-auto">
          {selectedScript ? (
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs p-6 max-w-3xl space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
                    {isMaster ? "Script Mestre / Global" : "Roteiro Específico"}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{selectedScript.produto}</h2>
                </div>

                <div className="flex items-center space-x-2">
                  {isMaster && (
                    <button 
                      onClick={handlePropagateMaster}
                      className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-bold text-xs transition"
                      title="Aplica a Abertura e o Fechamento deste script em todos os outros produtos"
                    >
                      <Layers size={13} />
                      <span>Propagar para Todos</span>
                    </button>
                  )}

                  {savedSuccess && (
                    <span className="text-emerald-600 font-semibold text-xs flex items-center space-x-1">
                      <CheckCircle2 size={14} />
                      <span>Salvo!</span>
                    </span>
                  )}
                  <button 
                    onClick={handleSave}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition"
                  >
                    <Save size={13} />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-2.5 text-[11px] text-slate-600">
                Variáveis dinâmicas: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">[NOME]</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">[BANCO]</code> e <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">[VALOR]</code>.
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">1. Abertura do Atendimento:</label>
                  <textarea 
                    value={abertura}
                    onChange={e => setAbertura(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs h-20 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">2. Motivo da Ligação (Apresentação do Produto):</label>
                  <textarea 
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs h-20 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">3. Qualificação & Sondagem:</label>
                  <textarea 
                    value={qualificacao}
                    onChange={e => setQualificacao(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs h-16 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">4. Fechamento e Simulação:</label>
                  <textarea 
                    value={fechamento}
                    onChange={e => setFechamento(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs h-20 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">Carregando catálogo de roteiros...</div>
          )}
        </div>
      </div>

      {/* Modal Novo Roteiro */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Novo Roteiro de Produto</h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome do Produto:</label>
              <input 
                type="text" 
                placeholder="Ex: Empréstimo com Débito em Conta"
                value={newProduto}
                onChange={e => setNewProduto(e.target.value)}
                className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleCreateNew} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs">Criar Roteiro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
