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
    const { data } = await supabase.from("lista_nao_perturbe").select("*").order("created_at", { ascending: false });
    if (data) setBlocked(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDnd();
  }, []);

  const handleAdd = async () => {
    if (!telefone.trim() && !cpf.trim()) {
      alert("Informe ao menos o Telefone ou o CPF.");
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
    if (!confirm("Deseja remover este número da lista de bloqueio?")) return;
    await supabase.from("lista_nao_perturbe").delete().eq("id", id);
    fetchDnd();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Não Perturbe (DND & Blacklist)</h1>
          <p className="text-slate-500 text-xs mt-0.5">Bloqueio preventivo de clientes, órgãos de proteção e Procon.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition"
        >
          <Plus size={14} />
          <span>Bloquear Contato</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">Contatos Bloqueados ({blocked.length})</span>
              <span className="text-[11px] text-slate-500">O discador ignora estes números na fila</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">CPF</th>
                    <th className="px-6 py-3">Motivo</th>
                    <th className="px-6 py-3 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {blocked.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{b.nome}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{b.telefone || "-"}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{b.cpf || "-"}</td>
                      <td className="px-6 py-3.5 text-slate-500">{b.motivo}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button 
                          onClick={() => handleRemove(b.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="Remover da lista de bloqueio"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {blocked.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-xs">
                        Nenhum contato bloqueado.
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Bloquear Contato (DND)</h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome:</label>
                <input 
                  type="text" 
                  placeholder="Nome do cliente"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Telefone:</label>
                <input 
                  type="text" 
                  placeholder="DDD + Número"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF:</label>
                <input 
                  type="text" 
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Motivo:</label>
                <select 
                  value={motivo} 
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none font-medium text-slate-700"
                >
                  <option value="Solicitação do cliente (Não ligar)">Solicitação do cliente (Não ligar)</option>
                  <option value="Procon / Não Me Perturbe">Procon / Não Me Perturbe</option>
                  <option value="Número de Terceiro / Errado">Número de Terceiro / Errado</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={handleAdd} className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs">Bloquear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
