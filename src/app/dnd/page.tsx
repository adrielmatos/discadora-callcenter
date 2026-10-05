"use client";

import React, { useEffect, useState } from "react";
import { PhoneOff, Plus, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DndPage() {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [motivo, setMotivo] = useState("Solicitação do cliente (Não ligar)");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDnd = async () => {
    setLoading(true);
    const { data } = await supabase.from("lista_nao_perturbe").select("*").eq("ativo", true).order("created_at", { ascending: false });
    if (data) setBlocked(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDnd();
  }, []);

  const handleAdd = async () => {
    if (!telefone.trim() && !cpf.trim()) {
      alert("Informe ao menos o Telefone ou o CPF para bloquear.");
      return;
    }

    await supabase.from("lista_nao_perturbe").insert({
      nome: nome.trim() || "Bloqueio Manual",
      telefone: telefone.replace(/\D/g, "") || null,
      cpf: cpf.replace(/\D/g, "") || null,
      motivo,
      ativo: true,
      origem: "manual"
    });

    setNome("");
    setTelefone("");
    setCpf("");
    setShowModal(false);
    fetchDnd();
  };

  const handleRemove = async (id: string) => {
    await supabase.from("lista_nao_perturbe").update({ ativo: false }).eq("id", id);
    fetchDnd();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lista Não Perturbe (DND)</h1>
          <p className="text-slate-500 text-sm mt-1">Bloqueio preventivo de contatos e conformidade com a LGPD e Procon.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition"
        >
          <Plus size={18} />
          <span>Bloquear Número / CPF</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-base">Contatos Bloqueados ({blocked.length})</h3>
              <span className="text-xs text-slate-500">O discador ignora estes números automaticamente</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Nome / Identificação</th>
                    <th className="px-6 py-3.5">Telefone</th>
                    <th className="px-6 py-3.5">CPF</th>
                    <th className="px-6 py-3.5">Motivo</th>
                    <th className="px-6 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blocked.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-semibold text-slate-800">{b.nome || "Manual"}</td>
                      <td className="px-6 py-4 font-mono">{b.telefone || "-"}</td>
                      <td className="px-6 py-4 font-mono">{b.cpf || "-"}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{b.motivo || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRemove(b.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 transition"
                          title="Desbloquear"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {blocked.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        Nenhum contato bloqueado na lista.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Bloqueio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <PhoneOff className="text-rose-600" size={20} />
              <span>Adicionar ao Não Perturbe</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nome do Cliente (opcional):</label>
              <input 
                type="text" 
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Telefone:</label>
                <input 
                  type="text" 
                  placeholder="85999998888"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">CPF (opcional):</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Motivo do Bloqueio:</label>
              <select 
                value={motivo} 
                onChange={e => setMotivo(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none font-medium text-slate-700"
              >
                <option value="Solicitação do cliente (Não ligar)">Solicitação do cliente (Não ligar)</option>
                <option value="Procon / Não Me Perturbe">Procon / Não Me Perturbe</option>
                <option value="Número Errado / Terceiro">Número Errado / Terceiro</option>
                <option value="Ameaça Jurídica / LGPD">Ameaça Jurídica / LGPD</option>
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
                onClick={handleAdd}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm"
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
