"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  User,
  Filter,
  Search,
  ChevronRight
} from "lucide-react";

interface TaskItem {
  id: string;
  empresa_id: string;
  lead_id?: number | null;
  operador_nome?: string;
  titulo: string;
  descricao?: string;
  prazo_vencimento: string;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "em_andamento" | "concluida" | "cancelada";
  created_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"todos" | "pendentes" | "hoje" | "concluidas">("pendentes");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form de criação
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"alta" | "media" | "baixa">("media");
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("prazo_vencimento", { ascending: true });

    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    const { data, error } = await supabase.from("tasks").insert({
      titulo: newTitle.trim(),
      descricao: newDesc.trim() || undefined,
      prioridade: newPriority,
      prazo_vencimento: new Date(newDueDate).toISOString(),
      status: "pendente",
      empresa_id: "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3"
    }).select().single();

    if (!error && data) {
      setTasks(prev => [data, ...prev]);
      logAuditEvent({
        action: "TASK_CREATE",
        resource: "tasks",
        resourceId: data.id,
        metadata: { titulo: newTitle }
      });
      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
    } else {
      alert("Erro ao criar tarefa: " + (error?.message || "Tente novamente"));
    }
    setCreating(false);
  };

  const handleToggleComplete = async (task: TaskItem) => {
    const nextStatus = task.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      if (nextStatus === "concluida") {
        logAuditEvent({
          action: "TASK_COMPLETE",
          resource: "tasks",
          resourceId: task.id,
          metadata: { titulo: task.titulo }
        });
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Deseja realmente remover esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  // Filtros em memória
  const todayIso = new Date().toISOString().slice(0, 10);
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = !searchTerm ||
      t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.descricao && t.descricao.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === "pendentes") return t.status !== "concluida";
    if (filterStatus === "concluidas") return t.status === "concluida";
    if (filterStatus === "hoje") return t.prazo_vencimento.startsWith(todayIso) && t.status !== "concluida";
    return true;
  });

  const countPendentes = tasks.filter(t => t.status !== "concluida").length;
  const countHoje = tasks.filter(t => t.prazo_vencimento.startsWith(todayIso) && t.status !== "concluida").length;
  const countConcluidas = tasks.filter(t => t.status === "concluida").length;

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#070b14] text-slate-100 font-sans overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Header Superior */}
          <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
            <div>
              <div className="flex items-center space-x-2">
                <CheckSquare className="text-blue-500" size={22} />
                <h1 className="text-xl font-extrabold text-white tracking-tight">Tarefas & Produtividade</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Fase 4 • Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Central de pendências, lembretes de contato e rotina operacional dos operadores.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Nova Tarefa</span>
              </button>
            </div>
          </header>

          <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
            {/* Cards de Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Pendentes</p>
                  <p className="text-2xl font-black text-amber-400 mt-0.5">{countPendentes}</p>
                </div>
                <Clock size={28} className="text-amber-500/30" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Vencem Hoje</p>
                  <p className="text-2xl font-black text-rose-400 mt-0.5">{countHoje}</p>
                </div>
                <AlertCircle size={28} className="text-rose-500/30" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Concluídas</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{countConcluidas}</p>
                </div>
                <CheckCircle2 size={28} className="text-emerald-500/30" />
              </div>
            </div>

            {/* Filtros e Busca */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilterStatus("pendentes")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterStatus === "pendentes"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Pendentes ({countPendentes})
                </button>
                <button
                  onClick={() => setFilterStatus("hoje")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterStatus === "hoje"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Hoje ({countHoje})
                </button>
                <button
                  onClick={() => setFilterStatus("concluidas")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterStatus === "concluidas"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Concluídas ({countConcluidas})
                </button>
                <button
                  onClick={() => setFilterStatus("todos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterStatus === "todos"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Todas ({tasks.length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lista de Tarefas */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Carregando tarefas...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <CheckSquare size={36} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-300">Nenhuma tarefa encontrada</p>
                <p className="text-xs text-slate-500 mt-1">Crie novas tarefas para organizar sua rotina de fechamento de crédito.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.map((t) => {
                  const isDone = t.status === "concluida";
                  const isLate = new Date(t.prazo_vencimento) < new Date() && !isDone;

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                        isDone
                          ? "bg-slate-950/40 border-slate-800/40 opacity-60"
                          : isLate
                          ? "bg-rose-950/10 border-rose-900/40 hover:border-rose-700/60"
                          : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <button
                          onClick={() => handleToggleComplete(t)}
                          className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-600 hover:border-blue-500"
                          }`}
                        >
                          {isDone && <CheckCircle2 size={13} />}
                        </button>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-bold ${
                                isDone ? "line-through text-slate-500" : "text-white"
                              }`}
                            >
                              {t.titulo}
                            </span>

                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                t.prioridade === "alta"
                                  ? "bg-rose-500/20 text-rose-400"
                                  : t.prioridade === "media"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {t.prioridade.toUpperCase()}
                            </span>

                            {isLate && (
                              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-500 text-white">
                                ATRASADA
                              </span>
                            )}
                          </div>

                          {t.descricao && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.descricao}</p>
                          )}

                          <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center space-x-1">
                              <Calendar size={12} className="text-slate-400" />
                              <span>Prazo: {new Date(t.prazo_vencimento).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                            </span>

                            {t.operador_nome && (
                              <span className="flex items-center space-x-1">
                                <User size={12} className="text-slate-400" />
                                <span>{t.operador_nome}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                          title="Remover Tarefa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Modal de Nova Tarefa */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Plus className="text-blue-500" size={18} />
                  <span>Cadastrar Tarefa</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Título da Tarefa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ligar para confirmar contrato na Caixa"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Descrição / Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes adicionais sobre o cliente ou documento pendente..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={(e: any) => setNewPriority(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Prazo de Conclusão</label>
                    <input
                      type="datetime-local"
                      required
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white outline-none focus:border-blue-500"
                    >
                    </input>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {creating ? "Salvando..." : "Salvar Tarefa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
