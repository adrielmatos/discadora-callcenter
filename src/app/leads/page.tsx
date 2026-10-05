"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, Search, Download, RefreshCw, Kanban, Table, 
  ArrowRight, CheckCircle2, PhoneOff, XCircle, AlertCircle, User, MessageSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Lead {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  produto?: string;
  status?: string;
  etapa_crm?: string;
  ultima_tabulacao?: string;
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("id", { ascending: false }).limit(300);
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedLeads = data.map((row) => {
          const rawProduto = String(row["Produto"] || row["PRODUTO"] || row["produto"] || row["Operação"] || row["Convênio"] || "Consignado");
          return {
            nome: row["Nome"] || row["NOME"] || row["cliente"] || row["Cliente"] || "Sem Nome",
            telefone: String(row["Telefone"] || row["TELEFONE"] || row["Celular"] || row["celular"] || "").replace(/\D/g, ""),
            cpf: String(row["CPF"] || row["cpf"] || ""),
            margem_disponivel: String(row["Margem"] || row["margem"] || row["Valor"] || "R$ 0,00"),
            banco: String(row["Banco"] || row["banco"] || "Não informado"),
            produto: rawProduto,
            status: "pendente",
            etapa_crm: "fila"
          };
        }).filter(l => l.telefone.length >= 8);

        if (formattedLeads.length === 0) {
          alert("Nenhum lead com telefone válido encontrado.");
          return;
        }

        setLoading(true);
        const { error } = await supabase.from("leads").insert(formattedLeads);
        if (error) {
          alert("Erro ao importar: " + error.message);
        } else {
          alert(`Sucesso! ${formattedLeads.length} leads importados para o banco de dados!`);
          fetchLeads();
        }
      } catch (err: any) {
        alert("Erro na leitura da planilha: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CRM Leads");
    XLSX.writeFile(wb, `leads_crm_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const changeEtapa = async (leadId: number, nextEtapa: string) => {
    await supabase.from("leads").update({ etapa_crm: nextEtapa }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa_crm: nextEtapa } : l));
  };

  const filteredLeads = leads.filter(l => 
    l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.telefone.includes(searchTerm) || 
    (l.cpf && l.cpf.includes(searchTerm))
  );

  // Estágios do Pipeline correspondentes à Tabulação (sem Retorno que tem tela própria)
  const stages = [
    { id: "fila", label: "Fila de Espera", color: "border-slate-300" },
    { id: "Interessado", label: "Interessado", color: "border-blue-400" },
    { id: "Simulação", label: "Simulação", color: "border-cyan-400" },
    { id: "Proposta", label: "Proposta", color: "border-teal-400" },
    { id: "Contrato", label: "Contrato Fechado", color: "border-emerald-500" },
    { id: "Não atendeu", label: "Não Atendeu", color: "border-orange-400" },
    { id: "Não interessado", label: "Não Interessado", color: "border-rose-400" },
    { id: "Sem perfil", label: "Sem Perfil / Inválido", color: "border-slate-400" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">CRM & Funil de Tabulações</h1>
          <p className="text-slate-500 text-xs mt-0.5">Pipeline de negociação com todos os status de tabulação do discador.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition ${viewMode === "kanban" ? "bg-white shadow-xs text-blue-600" : "text-slate-500"}`}
            >
              <Kanban size={13} />
              <span>Funil (Pipeline)</span>
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition ${viewMode === "table" ? "bg-white shadow-xs text-blue-600" : "text-slate-500"}`}
            >
              <Table size={13} />
              <span>Lista Geral</span>
            </button>
          </div>

          <button 
            onClick={fetchLeads}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            title="Recarregar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition"
          >
            <Download size={13} />
            <span>Exportar Excel</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition"
          >
            <Upload size={13} />
            <span>Importar Planilha</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, telefone ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredLeads.length} leads no sistema
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {viewMode === "kanban" ? (
          /* Visual Pipeline Kanban com todas as tabulações */
          <div className="flex-1 flex space-x-3.5 overflow-x-auto pb-4 custom-scrollbar">
            {stages.map(st => {
              const stageLeads = filteredLeads.filter(l => {
                const currentStage = l.etapa_crm || (l.status === "pendente" ? "fila" : l.ultima_tabulacao || "fila");
                return currentStage.toLowerCase() === st.id.toLowerCase() || 
                       (st.id === "Sem perfil" && (currentStage === "Sem perfil" || currentStage === "Número inválido"));
              });

              return (
                <div key={st.id} className="w-68 flex flex-col rounded-xl bg-slate-100/70 border border-slate-200 shrink-0 overflow-hidden">
                  <div className={`p-3 border-b border-slate-200/80 bg-white flex justify-between items-center ${st.color} border-t-2`}>
                    <span className="text-xs font-bold text-slate-800">{st.label}</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="flex-1 p-2.5 overflow-y-auto space-y-2 custom-scrollbar">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-1.5 hover:border-slate-300 transition">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-slate-900 leading-snug truncate">{lead.nome}</p>
                          <span className="text-[10px] font-mono text-slate-400">#{lead.id}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono">{lead.telefone}</span>
                          <span className="text-emerald-700 font-extrabold">{lead.margem_disponivel || "-"}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[120px]">{lead.banco || "Banco N/I"}</span>
                          
                          {/* Mover Etapa */}
                          <div className="flex space-x-1">
                            {st.id !== "Contrato" && (
                              <button 
                                onClick={() => {
                                  const nextIdx = stages.findIndex(s => s.id === st.id) + 1;
                                  if (nextIdx < stages.length) changeEtapa(lead.id, stages[nextIdx].id);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                                title="Avançar etapa"
                              >
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">Vazio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3">Margem</th>
                    <th className="px-6 py-3">Banco</th>
                    <th className="px-6 py-3">Status / Tabulação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-800">{l.nome}</td>
                      <td className="px-6 py-3 font-mono">{l.telefone}</td>
                      <td className="px-6 py-3">{l.produto || "Consignado"}</td>
                      <td className="px-6 py-3 text-emerald-600 font-bold">{l.margem_disponivel || "-"}</td>
                      <td className="px-6 py-3">{l.banco || "-"}</td>
                      <td className="px-6 py-3 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                          {l.etapa_crm || (l.status === "pendente" ? "Fila" : l.ultima_tabulacao || "Finalizado")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
