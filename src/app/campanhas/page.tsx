"use client";

import React, { useEffect, useState } from "react";
import { Target, Plus, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState("");
  const [produto, setProduto] = useState("Saque FGTS");

  const fetchCampanhas = async () => {
    setLoading(true);
    const { data } = await supabase.from("campanhas").select("*").order("created_at", { ascending: false });
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

    await supabase.from("campanhas").insert({
      nome: nome.trim(),
      produto,
      status: "ativa"
    });

    setNome("");
    setShowModal(false);
    fetchCampanhas();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ativa" ? "pausada" : "ativa";
    await supabase.from("campanhas").update({ status: nextStatus }).eq("id", id);
    fetchCampanhas();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campanhas de Discagem</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie campanhas por convênio para orientar a operação.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition"
        >
          <Plus size={18} />
          <span>Nova Campanha</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          {campanhas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <Target size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Nenhuma campanha cadastrada</h3>
              <p className="text-slate-500 text-sm mt-1">Crie sua primeira campanha (ex: "Consignado FGTS Outubro") para organizar as listas.</p>
              <button 
                onClick={() => setShowModal(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                Criar Campanha
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campanhas.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        c.status === "ativa" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
                      }`}>
                        {c.status || "ativa"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800">{c.nome}</h3>
                    <p className="text-slate-500 text-sm mt-1">Produto: <strong className="text-slate-700">{c.produto}</strong></p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={() => toggleStatus(c.id, c.status)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        c.status === "ativa" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {c.status === "ativa" ? <Pause size={14} /> : <Play size={14} />}
                      <span>{c.status === "ativa" ? "Pausar" : "Ativar"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Campanha */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <Target className="text-blue-600" size={20} />
              <span>Nova Campanha de Discagem</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nome da Campanha:</label>
              <input 
                type="text" 
                placeholder="Ex: Disparo FGTS Banco Pan"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Produto Principal:</label>
              <select 
                value={produto} 
                onChange={e => setProduto(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none font-semibold text-slate-700"
              >
                <option value="Saque FGTS">Saque FGTS</option>
                <option value="INSS / Portabilidade">INSS / Portabilidade</option>
                <option value="Consignado Público / SIAPE">Consignado Público / SIAPE</option>
                <option value="Cartão Consignado / Benefício">Cartão Consignado / Benefício</option>
                <option value="Crédito Pessoal">Crédito Pessoal</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 text-slate-600 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreate}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm"
              >
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
