"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, CheckCircle, Plus } from "lucide-react";
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

  const fetchScripts = async () => {
    setLoading(true);
    const { data } = await supabase.from("scripts_ligacao").select("*").order("id", { ascending: true });
    if (data && data.length > 0) {
      setScripts(data);
      selectScript(data[0]);
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
    setTimeout(() => setSavedSuccess(false), 3000);
    fetchScripts();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Roteiros & Scripts de Ligação</h1>
          <p className="text-slate-500 text-sm mt-1">Edite os textos que os operadores usam na tela do discador em tempo real.</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar de produtos */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-2 shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Produtos Cadastrados</h3>
          {scripts.map(s => {
            const isSelected = selectedScript?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => selectScript(s)}
                className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                  isSelected 
                    ? "bg-blue-600 text-white shadow-sm" 
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText size={16} />
                  <span>{s.produto}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor do Script Selecionado */}
        <div className="flex-1 p-8 overflow-y-auto">
          {selectedScript ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-4xl space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase">Script Ativo</span>
                  <h2 className="text-xl font-bold text-slate-800">{selectedScript.produto}</h2>
                </div>

                <div className="flex items-center space-x-3">
                  {savedSuccess && (
                    <span className="text-emerald-600 font-semibold text-xs flex items-center space-x-1">
                      <CheckCircle size={14} />
                      <span>Salvo com sucesso!</span>
                    </span>
                  )}
                  <button 
                    onClick={handleSave}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition"
                  >
                    <Save size={16} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                <strong>Dica:</strong> Você pode usar as variáveis dinâmicas: <code>[NOME]</code>, <code>[BANCO]</code> e <code>[VALOR]</code> no meio do texto para serem preenchidas automaticamente com os dados do cliente!
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">1. ABERTURA:</label>
                  <textarea 
                    value={abertura}
                    onChange={e => setAbertura(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-lg text-sm h-24 outline-none focus:border-blue-500 font-sans text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">2. MOTIVO:</label>
                  <textarea 
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-lg text-sm h-24 outline-none focus:border-blue-500 font-sans text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">3. QUALIFICAÇÃO (Opcional):</label>
                  <textarea 
                    value={qualificacao}
                    onChange={e => setQualificacao(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-lg text-sm h-20 outline-none focus:border-blue-500 font-sans text-slate-800 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">4. FECHAMENTO & SIMULAÇÃO:</label>
                  <textarea 
                    value={fechamento}
                    onChange={e => setFechamento(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-lg text-sm h-24 outline-none focus:border-blue-500 font-sans text-slate-800 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">Carregando scripts...</div>
          )}
        </div>
      </div>
    </div>
  );
}
