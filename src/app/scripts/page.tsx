"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, CheckCircle2, Plus, Trash2, Sparkles, Copy, Layers, Search, MessageCircle, Target, HelpCircle, Send, Info, ArrowLeft, FolderOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "editor">("grid");
  
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const openEditor = (s: any) => {
    setSelectedScript(s);
    setAbertura(s.abertura || "");
    setMotivo(s.motivo || "");
    setQualificacao(s.qualificacao || "");
    setFechamento(s.fechamento || "");
    setSavedSuccess(false);
    setViewMode("editor");
  };

  const closeEditor = () => {
    setSelectedScript(null);
    setViewMode("grid");
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
    if (data) openEditor(data);
  };

  const handleDelete = async (id: number) => {
    if (scripts.length <= 1) {
      alert("É necessário manter ao menos um roteiro no sistema.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este roteiro de produto?")) return;

    await supabase.from("scripts_ligacao").delete().eq("id", id);
    closeEditor();
    fetchScripts();
  };

  const isMaster = selectedScript?.produto?.toLowerCase().includes("mestre") || selectedScript?.produto?.toLowerCase().includes("geral");
  const filteredScripts = scripts.filter(s => s.produto.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0 shadow-sm z-10">
        
        {viewMode === "editor" ? (
          <div className="flex items-center gap-4">
            <button 
              onClick={closeEditor} 
              className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-900"
              title="Voltar para o catálogo"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Editando Roteiro {isMaster && <Sparkles size={16} className="text-amber-500" />}
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">{selectedScript?.produto}</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-slate-900">Catálogo de Roteiros & Scripts</h1>
            <p className="text-slate-500 text-xs mt-0.5">Clique em um produto abaixo para personalizar seu roteiro de vendas.</p>
          </div>
        )}

        {viewMode === "grid" && (
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition"
          >
            <Plus size={15} />
            <span>Novo Roteiro de Produto</span>
          </button>
        )}
      </header>

      {/* ─── CONTEÚDO PRINCIPAL ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        
        {/* VISÃO GRID (CATÁLOGO) */}
        {viewMode === "grid" && (
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            
            {/* Barra de Busca Grande */}
            <div className="max-w-xl relative">
              <Search size={18} className="absolute left-4 top-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por produto... (Ex: Saque FGTS)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm font-medium border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white shadow-sm transition"
              />
            </div>

            {/* Grid de Cards Quadrados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {filteredScripts.map(s => {
                const isItemMaster = s.produto?.toLowerCase().includes("mestre");
                return (
                  <div 
                    key={s.id} 
                    onClick={() => openEditor(s)} 
                    className={`bg-white p-6 rounded-2xl border shadow-sm transition cursor-pointer flex flex-col items-center text-center group hover:-translate-y-1 hover:shadow-md ${
                      isItemMaster ? "border-amber-200 hover:border-amber-400" : "border-slate-200 hover:border-blue-400"
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                      isItemMaster ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-600"
                    }`}>
                      {isItemMaster ? <Sparkles size={26} /> : <FolderOpen size={26} />}
                    </div>
                    <h3 className="text-[13px] font-bold text-slate-800 line-clamp-2 leading-tight">
                      {s.produto}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para editar
                    </p>
                  </div>
                );
              })}
            </div>

            {filteredScripts.length === 0 && (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto">
                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Nenhum produto encontrado</h3>
                <p className="text-slate-500 text-sm mt-2">Tente buscar com outras palavras ou crie um novo roteiro.</p>
              </div>
            )}
          </div>
        )}

        {/* VISÃO EDITOR (TELA CHEIA) */}
        {viewMode === "editor" && selectedScript && (
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
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

                  <button 
                    onClick={() => handleDelete(selectedScript.id)}
                    className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 px-3 py-2 rounded-lg font-bold text-[13px] shadow-sm transition"
                  >
                    <Trash2 size={15} />
                  </button>

                  <div className="flex items-center gap-3">
                    {savedSuccess && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center space-x-1 animate-pulse">
                        <CheckCircle2 size={14} />
                        <span>Salvo!</span>
                      </span>
                    )}
                    <button 
                      onClick={handleSave}
                      className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold text-[13px] shadow-sm transition"
                    >
                      <Save size={15} />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Box de Informação */}
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
                  <textarea value={abertura} onChange={e => setAbertura(e.target.value)} placeholder="Ex: Oi, [NOME], tudo bem? Aqui é..." className="w-full p-4 text-[13px] h-20 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"/>
                </div>

                {/* 2. Motivo */}
                <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm transition focus-within:border-slate-400 focus-within:shadow-md">
                  <div className="bg-slate-50/70 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                    <Target size={15} className="text-slate-600" />
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Motivo da Ligação (Apresentação)</label>
                  </div>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Identificamos que você possui margem no [BANCO]..." className="w-full p-4 text-[13px] h-24 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"/>
                </div>

                {/* 3. Qualificação */}
                <div className="bg-white border-2 border-amber-100 rounded-xl overflow-hidden shadow-sm transition focus-within:border-amber-400 focus-within:shadow-md">
                  <div className="bg-amber-50/70 px-4 py-2.5 border-b border-amber-100 flex items-center gap-2">
                    <HelpCircle size={15} className="text-amber-600" />
                    <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">3. Qualificação & Sondagem</label>
                  </div>
                  <textarea value={qualificacao} onChange={e => setQualificacao(e.target.value)} placeholder="Ex: Você já utiliza a modalidade do saque-aniversário?" className="w-full p-4 text-[13px] h-20 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"/>
                </div>

                {/* 4. Fechamento */}
                <div className="bg-white border-2 border-emerald-100 rounded-xl overflow-hidden shadow-sm transition focus-within:border-emerald-400 focus-within:shadow-md">
                  <div className="bg-emerald-50/70 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2">
                    <Send size={15} className="text-emerald-600" />
                    <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">4. Fechamento & Simulação</label>
                  </div>
                  <textarea value={fechamento} onChange={e => setFechamento(e.target.value)} placeholder="Ex: Posso te enviar uma simulação no WhatsApp?" className="w-full p-4 text-[13px] h-24 outline-none text-slate-700 leading-relaxed resize-y bg-transparent placeholder-slate-400 font-medium"/>
                </div>
              </div>
            </div>
          </div>
        )}
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
              <input type="text" placeholder="Ex: Saque FGTS" value={newProduto} onChange={e => setNewProduto(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition" autoFocus/>
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
