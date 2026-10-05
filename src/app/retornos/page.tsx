"use client";

import React, { useEffect, useState } from "react";
import { Clock, Phone, CheckCircle2, RefreshCw, MessageSquare, Calendar, Trash2, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RetornosPage() {
  const [retornos, setRetornos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"todos" | "pendentes" | "hoje" | "concluidos">("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Reagendamento modal
  const [rescheduleItem, setRescheduleItem] = useState<any | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const fetchRetornos = async () => {
    try {
      const { data } = await supabase
        .from("retornos")
        .select("*, leads(id, nome, telefone, banco, margem_disponivel, produto, cpf)")
        .order("data_hora", { ascending: true });

      if (data) setRetornos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetornos();
    const interval = setInterval(fetchRetornos, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConclude = async (id: string) => {
    await supabase.from("retornos").update({ concluido: true }).eq("id", id);
    fetchRetornos();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento de retorno?")) return;
    await supabase.from("retornos").delete().eq("id", id);
    fetchRetornos();
  };

  const handleOpenReschedule = (item: any) => {
    setRescheduleItem(item);
    if (item.data_hora) {
      const d = new Date(item.data_hora);
      setNewDate(d.toISOString().split("T")[0]);
      setNewTime(d.toTimeString().slice(0, 5));
    }
    setNewNotes(item.observacao || "");
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !newDate || !newTime) {
      alert("Preencha data e horário para reagendar.");
      return;
    }
    const combinedDate = new Date(`${newDate}T${newTime}:00`).toISOString();
    await supabase.from("retornos").update({
      data_hora: combinedDate,
      observacao: newNotes,
      concluido: false
    }).eq("id", rescheduleItem.id);

    setRescheduleItem(null);
    fetchRetornos();
  };

  const handleWhatsApp = (lead: any) => {
    if (!lead?.telefone) return;
    const cleanPhone = lead.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá, ${lead.nome}! Sou o Adriel da A&K Soluções Financeiras. Estou entrando em contato conforme nosso retorno agendado referente às condições aprovadas no banco ${lead.banco || "parceiro"}. Podemos conversar agora?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  // Cálculos de métricas
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const totalCount = retornos.length;
  const concluidosCount = retornos.filter(r => r.concluido).length;
  const pendentes = retornos.filter(r => !r.concluido);
  
  const hojeEAtrasadosCount = pendentes.filter(r => {
    if (!r.data_hora) return false;
    const itemDate = new Date(r.data_hora);
    return itemDate <= new Date(`${todayStr}T23:59:59`);
  }).length;

  // Filtragem
  const filtered = retornos.filter(r => {
    const lead = r.leads || {};
    const matchesSearch = 
      (lead.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.telefone || "").includes(searchTerm) ||
      (lead.cpf || "").includes(searchTerm) ||
      (r.observacao || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === "concluidos") return r.concluido;
    if (filterTab === "pendentes") return !r.concluido;
    if (filterTab === "hoje") {
      if (r.concluido || !r.data_hora) return false;
      const itemDate = new Date(r.data_hora);
      return itemDate <= new Date(`${todayStr}T23:59:59`);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda de Retornos</h1>
          <p className="text-slate-500 text-xs mt-0.5">Sincronização em tempo real das chamadas agendadas pelo discador.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sincronizando em tempo real</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Métricas Topo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Agendados</span>
              <span className="text-xl font-bold text-slate-800">{totalCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Hoje & Atrasados</span>
              <span className="text-xl font-bold text-amber-800">{hojeEAtrasadosCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Pendentes</span>
              <span className="text-xl font-bold text-blue-800">{pendentes.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Concluídos</span>
              <span className="text-xl font-bold text-emerald-800">{concluidosCount}</span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button 
                onClick={() => setFilterTab("todos")}
                className={`px-3 py-1 rounded-md transition ${filterTab === "todos" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Todos ({totalCount})
              </button>
              <button 
                onClick={() => setFilterTab("hoje")}
                className={`px-3 py-1 rounded-md transition ${filterTab === "hoje" ? "bg-white text-amber-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Hoje / Atrasados ({hojeEAtrasadosCount})
              </button>
              <button 
                onClick={() => setFilterTab("pendentes")}
                className={`px-3 py-1 rounded-md transition ${filterTab === "pendentes" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Pendentes ({pendentes.length})
              </button>
              <button 
                onClick={() => setFilterTab("concluidos")}
                className={`px-3 py-1 rounded-md transition ${filterTab === "concluidos" ? "bg-white text-emerald-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Concluídos ({concluidosCount})
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por cliente, telefone..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Lista de Retornos */}
          <div className="space-y-2.5">
            {filtered.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
                <Clock size={40} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Nenhum retorno encontrado</h3>
                <p className="text-slate-500 text-xs mt-1">Ao tabular como "Retorno" no discador, a chamada aparecerá aqui automaticamente.</p>
              </div>
            ) : (
              filtered.map(r => {
                const lead = r.leads || {};
                const isConcluido = r.concluido;
                const dateObj = new Date(r.data_hora);
                const isLate = !isConcluido && dateObj < now;
                const formattedDate = dateObj.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short"
                });

                return (
                  <div 
                    key={r.id} 
                    className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition ${
                      isConcluido 
                        ? "border-slate-200 bg-slate-50/50 opacity-60" 
                        : isLate 
                        ? "border-amber-300 bg-amber-50/20" 
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                        isConcluido 
                          ? "bg-slate-200 text-slate-500" 
                          : isLate
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}>
                        <Clock size={18} />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-900 text-sm">{lead.nome || `Lead #${r.lead_id}`}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isConcluido 
                              ? "bg-slate-200 text-slate-600" 
                              : isLate
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-50 text-blue-800 border border-blue-200"
                          }`}>
                            {isConcluido ? "Concluído" : isLate ? "Atrasado" : "Pendente"}
                          </span>
                          {lead.produto && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {lead.produto}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-500 text-xs mt-0.5">
                          Tel: <strong className="font-mono text-slate-700">{lead.telefone || "-"}</strong> • Banco: {lead.banco || "Não informado"} • Margem: {lead.margem_disponivel || "R$ 0,00"}
                        </p>

                        {r.observacao && (
                          <p className="text-slate-600 text-xs mt-1.5 italic bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 inline-block">
                            "{r.observacao}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações Diretas */}
                    <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-y-1">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">
                        {formattedDate}
                      </span>

                      {lead.telefone && (
                        <>
                          <a 
                            href={`tel:+55${String(lead.telefone).replace(/\D/g, "")}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                            title="Ligar agora pelo smartphone"
                          >
                            <Phone size={13} />
                            <span>Ligar</span>
                          </a>

                          <button 
                            onClick={() => handleWhatsApp(lead)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                            title="Chamar no WhatsApp com mensagem pronta"
                          >
                            <MessageSquare size={13} />
                            <span>WhatsApp</span>
                          </button>
                        </>
                      )}

                      {!isConcluido && (
                        <>
                          <button 
                            onClick={() => handleOpenReschedule(r)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 shadow-2xs"
                            title="Reagendar data e horário"
                          >
                            <Calendar size={13} />
                            <span>Reagendar</span>
                          </button>

                          <button 
                            onClick={() => handleConclude(r.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                            title="Marcar como Concluído"
                          >
                            <CheckCircle2 size={13} />
                            <span>Concluir</span>
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => handleDelete(r.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        title="Excluir este retorno"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Reagendamento */}
      {rescheduleItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Reagendar Retorno</h3>
            <p className="text-xs text-slate-500">Cliente: <strong>{rescheduleItem.leads?.nome}</strong></p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nova Data:</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Novo Horário:</label>
                <input 
                  type="time" 
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Observações do Retorno:</label>
                <textarea 
                  rows={2}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="Ex: Pediu para ligar após o almoço..."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setRescheduleItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveReschedule}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Salvar Reagendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
