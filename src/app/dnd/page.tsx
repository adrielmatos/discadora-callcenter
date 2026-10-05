"use client";

import React, { useEffect, useState } from "react";
import { PhoneOff, Plus, Trash2, ShieldCheck, Search, AlertOctagon, CheckCircle2, Unlock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DndPage() {
  const [blocked, setBlocked] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [motivo, setMotivo] = useState("Solicitação do cliente (Não ligar)");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Campo de desbloqueio rápido
  const [quickUnblockPhone, setQuickUnblockPhone] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchDnd = async () => {
    setLoading(true);
    const { data } = await supabase.from("lista_nao_perturbe").select("*").order("created_at", { ascending: false });
    if (data) setBlocked(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDnd();
  }, []);

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleAdd = async () => {
    const cleanPhone = telefone.replace(/\D/g, "");
    const cleanCpf = cpf.replace(/\D/g, "");

    if (!cleanPhone && !cleanCpf) {
      alert("Informe ao menos o Telefone ou o CPF.");
      return;
    }

    const { error } = await supabase.from("lista_nao_perturbe").insert({
      nome: nome.trim() || "Bloqueio Manual",
      telefone: cleanPhone || null,
      cpf: cleanCpf || null,
      motivo,
      ativo: true,
      origem: "manual"
    });

    if (error) {
      showFeedback(`Erro ao bloquear: ${error.message}`, "error");
    } else {
      showFeedback("Contato adicionado à lista de bloqueio com sucesso!", "success");
      setNome("");
      setTelefone("");
      setCpf("");
      setShowModal(false);
      fetchDnd();
    }
  };

  const handleRemove = async (id: string, contactName?: string) => {
    if (!confirm(`Deseja desbloquear e remover ${contactName || "este número"} da Blacklist?`)) return;
    const { error } = await supabase.from("lista_nao_perturbe").delete().eq("id", id);
    if (!error) {
      showFeedback("Número removido da lista de bloqueio.", "success");
      fetchDnd();
    }
  };

  const handleQuickUnblock = async () => {
    const digits = quickUnblockPhone.replace(/\D/g, "");
    if (!digits) {
      alert("Digite o telefone ou CPF que deseja desbloquear.");
      return;
    }

    const { data } = await supabase
      .from("lista_nao_perturbe")
      .select("id")
      .or(`telefone.eq.${digits},cpf.eq.${digits}`);

    if (!data || data.length === 0) {
      showFeedback(`O número/CPF ${digits} não foi encontrado na Blacklist.`, "error");
      return;
    }

    for (const item of data) {
      await supabase.from("lista_nao_perturbe").delete().eq("id", item.id);
    }

    showFeedback(`Sucesso! ${data.length} registro(s) desbloqueado(s).`, "success");
    setQuickUnblockPhone("");
    fetchDnd();
  };

  const handleClearAll = async () => {
    if (blocked.length === 0) return;
    if (!confirm(`Atenção: deseja realmente remover TODOS os ${blocked.length} números da Blacklist?`)) return;
    
    for (const item of blocked) {
      await supabase.from("lista_nao_perturbe").delete().eq("id", item.id);
    }
    showFeedback("Todos os números foram removidos da Blacklist.", "success");
    fetchDnd();
  };

  const filtered = blocked.filter(b => {
    const term = searchTerm.toLowerCase();
    return (
      (b.nome || "").toLowerCase().includes(term) ||
      (b.telefone || "").includes(term) ||
      (b.cpf || "").includes(term) ||
      (b.motivo || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Não Perturbe (DND & Blacklist)</h1>
          <p className="text-slate-500 text-xs mt-0.5">Bloqueio preventivo de clientes, órgãos de proteção e Procon.</p>
        </div>
        <div className="flex items-center space-x-2">
          {blocked.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition"
            >
              Limpar Lista ({blocked.length})
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-xs transition"
          >
            <Plus size={14} />
            <span>+ Bloquear Contato</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-4">

          {/* Feedback Banner */}
          {feedbackMsg && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 border transition ${
              feedbackMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}>
              {feedbackMsg.type === "success" ? <CheckCircle2 size={15} /> : <AlertOctagon size={15} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Barra de Desbloqueio Rápido & Busca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Desbloqueio Direto */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2">
              <Unlock size={16} className="text-rose-600 shrink-0" />
              <input 
                type="text" 
                placeholder="Digitar Telefone ou CPF para Desbloquear..." 
                value={quickUnblockPhone}
                onChange={e => setQuickUnblockPhone(e.target.value)}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-rose-500"
              />
              <button 
                onClick={handleQuickUnblock}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0"
              >
                Desbloquear
              </button>
            </div>

            {/* Busca na Blacklist */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center space-x-2">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Filtrar contatos bloqueados por nome, número..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tabela de Bloqueados */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-800">Contatos Bloqueados ({filtered.length})</span>
              <span className="text-[11px] text-slate-500">O discador pula automaticamente estes números</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Nome / Identificação</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">CPF</th>
                    <th className="px-6 py-3">Motivo do Bloqueio</th>
                    <th className="px-6 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{b.nome}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-700 font-semibold">{b.telefone || "-"}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">{b.cpf || "-"}</td>
                      <td className="px-6 py-3.5">
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          {b.motivo}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button 
                          onClick={() => handleRemove(b.id, b.nome)}
                          className="bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ml-auto shadow-2xs"
                          title="Remover e desbloquear número"
                        >
                          <Trash2 size={13} />
                          <span>Remover</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="max-w-xs mx-auto text-center space-y-3">
                          <ShieldCheck size={36} className="mx-auto text-emerald-500 opacity-80" />
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {searchTerm ? "Nenhum resultado para a busca" : "Nenhum contato bloqueado na Blacklist"}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {searchTerm ? "Tente buscar com outro termo." : "Números bloqueados nunca serão chamados pelo discador."}
                            </p>
                          </div>
                          {!searchTerm && (
                            <button 
                              onClick={() => setShowModal(true)}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
                            >
                              + Bloquear Primeiro Número
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Bloquear Contato */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <PhoneOff size={16} className="text-rose-600" />
              <span>Adicionar Contato à Blacklist</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome do Cliente (opcional):</label>
                <input 
                  type="text" 
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Telefone (com DDD):</label>
                <input 
                  type="text" 
                  placeholder="Ex: 11999998888"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">CPF (apenas números):</label>
                <input 
                  type="text" 
                  placeholder="Ex: 12345678900"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Motivo do Bloqueio:</label>
                <select 
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-500 bg-white"
                >
                  <option value="Solicitação do cliente (Não ligar)">Solicitação do cliente (Não ligar)</option>
                  <option value="Cadastro no Procon / Não Me Perturbe">Cadastro no Procon / Não Me Perturbe</option>
                  <option value="Ameaça jurídica ou processo">Ameaça jurídica ou processo</option>
                  <option value="Óbito">Óbito</option>
                  <option value="Número Errado / Terceiro">Número Errado / Terceiro</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdd}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs"
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
