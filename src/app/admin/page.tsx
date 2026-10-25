"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import {
  ShieldCheck,
  Building2,
  Users,
  Database,
  Plus,
  Activity,
  Lock,
  PauseCircle,
  PlayCircle,
  FileSpreadsheet,
  AlertTriangle,
  History,
  CheckCircle2,
  TrendingUp
} from "lucide-react";

interface TenantItem {
  id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  email_gestor?: string;
  status: "ativa" | "pausada" | "cancelada";
  limite_operadores?: number;
  created_at: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  resource: string;
  resource_id?: string;
  actor_user_id?: string;
  created_at: string;
  metadata?: any;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tenants" | "audit">("tenants");
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalLeads: 0,
    totalOperators: 0,
    totalAuditLogs: 0
  });

  // Modal nova empresa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRazao, setNewRazao] = useState("");
  const [newFantasia, setNewFantasia] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newLimit, setNewLimit] = useState(10);
  const [creating, setCreating] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Busca empresas
      const { data: empData } = await supabase
        .from("empresas")
        .select("*")
        .order("created_at", { ascending: false });

      if (empData) setTenants(empData as TenantItem[]);

      // 2. Busca contagem de leads
      const { count: leadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      // 3. Busca contagem de operadores
      const { count: opCount } = await supabase
        .from("operadores")
        .select("*", { count: "exact", head: true });

      // 4. Busca logs de auditoria
      const { data: logsData, count: logsCount } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(40);

      if (logsData) setAuditLogs(logsData as AuditLogItem[]);

      setStats({
        totalTenants: empData?.length || 0,
        totalLeads: leadsCount || 0,
        totalOperators: opCount || 0,
        totalAuditLogs: logsCount || 0
      });
    } catch (err) {
      console.warn("Erro ao carregar dados administrativos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleTenantStatus = async (tenant: TenantItem) => {
    const nextStatus = tenant.status === "ativa" ? "pausada" : "ativa";
    const { error } = await supabase
      .from("empresas")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", tenant.id);

    if (!error) {
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: nextStatus } : t));
      logAuditEvent({
        action: "TENANT_UPDATE",
        resource: "empresas",
        resourceId: tenant.id,
        metadata: { novoStatus: nextStatus, empresa: tenant.razao_social }
      });
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRazao.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("empresas")
      .insert({
        razao_social: newRazao.trim(),
        nome_fantasia: newFantasia.trim() || newRazao.trim(),
        cnpj: newCnpj.trim() || null,
        email_gestor: newEmail.trim() || null,
        status: "ativa",
        limite_operadores: newLimit,
        interna: false
      })
      .select()
      .single();

    if (!error && data) {
      setTenants(prev => [data as TenantItem, ...prev]);
      logAuditEvent({
        action: "TENANT_CREATE",
        resource: "empresas",
        resourceId: data.id,
        metadata: { empresa: data.razao_social }
      });
      setIsModalOpen(false);
      setNewRazao("");
      setNewFantasia("");
      setNewCnpj("");
      setNewEmail("");
    } else {
      alert("Erro ao cadastrar empresa: " + (error?.message || "Tente novamente"));
    }
    setCreating(false);
  };

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#070b14] text-slate-100 font-sans overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* Header Superior Master */}
          <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="text-emerald-400" size={24} />
                <h1 className="text-xl font-extrabold text-white tracking-tight">Painel Master • Super-Admin</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Fase 3 • Enterprise SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Governança multi-tenant, gestão de empresas contratantes, limites operacionais e auditoria forense.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>Nova Empresa (Tenant)</span>
              </button>
            </div>
          </header>

          <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
            {/* Cards de Métricas do Super-Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Empresas Ativas</p>
                  <p className="text-2xl font-black text-white mt-0.5">{stats.totalTenants}</p>
                </div>
                <Building2 size={26} className="text-blue-500/40" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Total de Leads na Rede</p>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">{stats.totalLeads}</p>
                </div>
                <Database size={26} className="text-emerald-500/40" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Operadores Ativos</p>
                  <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.totalOperators}</p>
                </div>
                <Users size={26} className="text-amber-500/40" />
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Trilha de Auditoria</p>
                  <p className="text-2xl font-black text-purple-400 mt-0.5">{stats.totalAuditLogs}</p>
                </div>
                <Activity size={26} className="text-purple-500/40" />
              </div>
            </div>

            {/* Alternador de Abas */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab("tenants")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 ${
                  activeTab === "tenants"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 size={15} />
                <span>Empresas & Contratantes ({tenants.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 ${
                  activeTab === "audit"
                    ? "bg-slate-800 text-purple-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <History size={15} />
                <span>Trilha de Auditoria Forense ({auditLogs.length})</span>
              </button>
            </div>

            {/* Conteúdo Aba 1: Empresas */}
            {activeTab === "tenants" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Tenants e Empresas Conectadas
                  </h3>
                  <span className="text-[11px] text-slate-400">Isolamento de Banco Ativo (RLS)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Empresa / Razão Social</th>
                        <th className="py-3 px-4">CNPJ</th>
                        <th className="py-3 px-4">Gestor Responsável</th>
                        <th className="py-3 px-4">Limite Operadores</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                            <span className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-[11px]">
                              {t.razao_social.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p>{t.razao_social}</p>
                              {t.nome_fantasia && (
                                <p className="text-[10px] text-slate-500 font-normal">{t.nome_fantasia}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {t.cnpj || "Não informado"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {t.email_gestor || "a-definir@ak.local"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {t.limite_operadores ? `${t.limite_operadores} ramais` : "Ilimitado"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                t.status === "ativa"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleTenantStatus(t)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                                t.status === "ativa"
                                  ? "bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50"
                                  : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/50"
                              }`}
                            >
                              {t.status === "ativa" ? "Suspender Acesso" : "Reativar Empresa"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Conteúdo Aba 2: Trilha de Auditoria */}
            {activeTab === "audit" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Trilha de Eventos e Auditoria Forense
                  </h3>
                  <span className="text-[11px] text-slate-400">Conformidade LGPD & Segurança</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Ação Registrada</th>
                        <th className="py-3 px-4">Recurso</th>
                        <th className="py-3 px-4">ID Recurso</th>
                        <th className="py-3 px-4">Metadados / Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Nenhum evento registrado ainda. Ações como exportação de leads ou criação de tarefas serão gravadas aqui.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 font-semibold">{log.resource}</td>
                            <td className="py-3 px-4 text-slate-500 font-mono text-[10px]">
                              {log.resource_id ? log.resource_id.slice(0, 18) + "..." : "Global"}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                              {log.metadata ? JSON.stringify(log.metadata) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Modal de Criação de Tenant */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Building2 className="text-emerald-400" size={18} />
                  <span>Nova Empresa Contratante</span>
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alfa Promotora de Crédito Ltda"
                    value={newRazao}
                    onChange={(e) => setNewRazao(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    placeholder="Ex: Alfa Crédito"
                    value={newFantasia}
                    onChange={(e) => setNewFantasia(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">CNPJ</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={newCnpj}
                      onChange={(e) => setNewCnpj(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Limite Operadores</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={newLimit}
                      onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">E-mail do Gestor</label>
                  <input
                    type="email"
                    placeholder="gestor@alfacredito.com.br"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                  />
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {creating ? "Cadastrando..." : "Cadastrar Empresa"}
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
