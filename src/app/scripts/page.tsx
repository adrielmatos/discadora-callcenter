"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, CheckCircle2, Plus, Trash2, Sparkles, Copy, Layers, Search, MessageCircle, Target, HelpCircle, Send, Info } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

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
  const filteredScripts = scripts.filter(s => s.produto.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <div className="w-[320px] bg-white border-r border-slate-200/80 overflow-hidden flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Buscar Produto
            </span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Ex: Saque FGTS..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 transition"
              />
            </div>
          </div>
          
          <div className="p-4 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Catálogo ({filteredScripts.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
            {filteredScripts.map(s => {
              const isSelected = selectedScript?.id === s.id;
              const isItemMaster = s.produto?.toLowerCase().includes("mestre");
              return (
                <div 
                  key={s.id}
                  onClick={() => selectScript(s)}
                  className={`w-full text-left px-3 py-3 rounded-xl text-[13px] font-semibold cursor-pointer transition flex items-center justify-between group ${
                    isSelected 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                      : isItemMaster ? "bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100" : "text-slate-700 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    {isItemMaster ? <Sparkles size={16} className={isSelected ? "text-amber-200" : "text-amber-500 shrink-0"} /> : <FileText size={16} className={isSelected ? "text-blue-200" : "text-slate-400"} />}
                    <span className="truncate">{s.produto}</span>
                  </div>
                  {!isItemMaster && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      className={`p-1 rounded-md transition opacity-0 group-hover:opacity-100 ${isSelected ? "text-blue-200 hover:bg-blue-700 hover:text-white" : "text-slate-400 hover:bg-rose-100 hover:text-rose-600"}`}
                      title="Excluir roteiro"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
            {filteredScripts.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">Nenhum produto encontrado.</div>
            )}
          </div>
        </div>

        {/* Editor do Script */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
          {selectedScript ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                    {isMaster ? "Script Mestre / Global" : "Roteiro Específico"}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {isMaster && <Sparkles size={18} className="text-amber-500" />}
                    {selectedScript.produto}
                  </h2>
                </div>

                <div className="flex items-center space-x-3">
                  {isMaster && (
                    <button 
                      onClick={handlePropagateMaster}
                      className="flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded-lg font-bold text-xs transition shadow-sm"
                      title="Aplica a Abertura e o Fechamento deste script em todos os outros produtos"
                    >
                      <Layers size={14} />
                      <span>Propagar Padrão</span>
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    {savedSuccess && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center space-x-1 animate-pulse">
                        <CheckCircle2 size={14} />
                        <span>Roteiro Salvo!</span>
                      </span>
                    )}
                    <button 
                      onClick={handleSave}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-[13px] shadow-sm transition"
                    >
                      <Save size={15} />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Box de Informação Moderno */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3 shadow-sm">
                <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Dica de Produtividade: Personalize o roteiro usando variáveis dinâmicas.</p>
                  <p className="text-blue-800/80">O sistema substitui essas tags automaticamente pelo nome e dados do cliente na tela da discadora.</p>
                  <div className="pt-2 flex gap-2">
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-700 cursor-default select-all">[NOME]</code>
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-700 cursor-default select-all">[BANCO]</code>
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 font-bold text-blue-700 cursor-default select-all">[VALOR]</code>
                  </div>
                </div>
              </div>

              <div className="space-y-5 pt-2">
                
                {/* 1. Abertura */}
                <div className="bg-white border-2 border-blue-100 rounded-xl overflow-hidden shadow-sm transition focus-within:border-blue-400 focus-within:shadow-md">
                  <div className="bg-blue-50/70 px-4 py-2.5 border-b border-blue-100 flex items-center gap-2">
                    <MessageCircle size={15} className="text-blue-600" />
                    <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">1. Abertura do Atendimento</label>
                  </div>
                  <textarea 
                    value={abertura}
                    onChange={e => setAbertura(e.target.value)}
                    placeholder="Ex: Oi, [NOME], tudo bem? Aqui é..."
                    className="w-full p-4 text-[13px] h-20 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"
                  />
                </div>

                {/* 2. Motivo */}
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm transition focus-within:border-slate-400 focus-within:shadow-md">
                  <div className="bg-slate-50/70 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                    <Target size={15} className="text-slate-600" />
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Motivo da Ligação (Apresentação)</label>
                  </div>
                  <textarea 
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    placeholder="Ex: Identificamos que você possui margem no [BANCO]..."
                    className="w-full p-4 text-[13px] h-24 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"
                  />
                </div>

                {/* 3. Qualificação */}
                <div className="bg-white border-2 border-amber-100 rounded-xl overflow-hidden shadow-sm transition focus-within:border-amber-400 focus-within:shadow-md">
                  <div className="bg-amber-50/70 px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                    <HelpCircle size={15} className="text-amber-600" />
                    <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">3. Qualificação & Sondagem</label>
                  </div>
                  <textarea 
                    value={qualificacao}
                    onChange={e => setQualificacao(e.target.value)}
                    placeholder="Ex: Você já utiliza a modalidade do saque-aniversário?"
                    className="w-full p-4 text-[13px] h-20 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"
                  />
                </div>

                {/* 4. Fechamento */}
                <div className="bg-white border-2 border-emerald-100 rounded-xl overflow-hidden shadow-sm transition focus-within:border-emerald-400 focus-within:shadow-md">
                  <div className="bg-emerald-50/70 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
                    <Send size={15} className="text-emerald-600" />
                    <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">4. Fechamento & Simulação</label>
                  </div>
                  <textarea 
                    value={fechamento}
                    onChange={e => setFechamento(e.target.value)}
                    placeholder="Ex: Posso te enviar uma simulação no WhatsApp?"
                    className="w-full p-4 text-[13px] h-24 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"
                  />
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Selecione um Roteiro</h3>
              <p className="text-slate-500 text-sm mt-2">Escolha um produto no menu lateral para editar os scripts de venda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Roteiro */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Plus size={20} className="text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Novo Produto</h3>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5 uppercase tracking-wider">Nome do Produto:</label>
              <input 
                type="text" 
                placeholder="Ex: Saque FGTS"
                value={newProduto}
                onChange={e => setNewProduto(e.target.value)}
                className="w-full border-2 border-slate-200 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition"
                autoFocus
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button onClick={handleCreateNew} className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition">Criar Roteiro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
