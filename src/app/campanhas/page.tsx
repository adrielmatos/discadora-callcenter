"use client";

import React, { useEffect, useState } from "react";
import { Target, Plus, Play, Pause, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState("");
  const [produto, setProduto] = useState("Saque FGTS");
  const [inicioAt, setInicioAt] = useState(new Date().toISOString().slice(0, 10));
  const [fimAt, setFimAt] = useState("");

  const fetchCampanhas = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("campanhas").select("*").order("created_at", { ascending: false });
    if (data) setCampanhas(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCampanhas();
  }, []);

  const handleCreate = async () => {
    if (!nome.trim()) {
      alert("Informe o nome da campanha.");
      return;
    }

    const { error } = await supabase.from("campanhas").insert({
      nome: nome.trim(),
      produto,
      status: "ativa",
      inicio_at: inicioAt ? new Date(inicioAt).toISOString() : null,
      fim_at: fimAt ? new Date(fimAt).toISOString() : null
    });

    if (error) {
      alert("Erro ao criar campanha: " + error.message);
      return;
    }

    setNome("");
    setFimAt("");
    setShowModal(false);
    fetchCampanhas();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ativa" ? "pausada" : "ativa";
    await supabase.from("campanhas").update({ status: nextStatus }).eq("id", id);
    fetchCampanhas();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    await supabase.from("campanhas").delete().eq("id", id);
    fetchCampanhas();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Campanhas de Discagem</h1>
          <p className="text-slate-500 text-xs mt-0.5">Segmentação por produto, convênio e período de atuação • A&K Soluções Financeiras.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition"
        >
          <Plus size={14} />
          <span>Criar Campanha</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          {campanhas.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
              <Target size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Nenhuma campanha cadastrada</h3>
              <p className="text-slate-500 text-xs mt-1">Crie sua primeira campanha para organizar suas listas de crédito.</p>
              <button 
                onClick={() => setShowModal(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                Criar Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campanhas.map(c => {
                const inicio = c.inicio_at ? new Date(c.inicio_at).toLocaleDateString("pt-BR") : "Imediato";
                const fim = c.fim_at ? new Date(c.fim_at).toLocaleDateString("pt-BR") : "Indeterminado";

                return (
                  <div key={c.id} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          c.status === "ativa" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                        }`}>
                          {c.status || "ativa"}
                        </span>
                        <button 
                          onClick={() => handleDelete(c.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Excluir campanha"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{c.nome}</h3>
                      <p className="text-xs text-blue-600 font-semibold mt-0.5">{c.produto}</p>

                      <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <p className="flex justify-between">
                          <span>Início:</span>
                          <strong className="text-slate-700">{inicio}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Término:</span>
                          <strong className="text-slate-700">{fim}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
                      <button 
                        onClick={() => toggleStatus(c.id, c.status)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                          c.status === "ativa" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {c.status === "ativa" ? <Pause size={12} /> : <Play size={12} />}
                        <span>{c.status === "ativa" ? "Pausar" : "Ativar"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Campanha */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Nova Campanha de Discagem</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Campanha:</label>
                <input 
                  type="text" 
                  placeholder="Ex: FGTS Banco Pan - Outubro"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Produto:</label>
                <select 
                  value={produto}
                  onChange={e => setProduto(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none font-semibold text-slate-700"
                >
                  <option value="Saque FGTS">Saque FGTS</option>
                  <option value="INSS / Portabilidade">INSS / Portabilidade</option>
                  <option value="Consignado Público / SIAPE">Consignado Público / SIAPE</option>
                  <option value="Cartão Benefício">Cartão Benefício</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Data Início:</label>
                  <input 
                    type="date" 
                    value={inicioAt}
                    onChange={e => setInicioAt(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Data Término:</label>
                  <input 
                    type="date" 
                    value={fimAt}
                    onChange={e => setFimAt(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs">Salvar Campanha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
