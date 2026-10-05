"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Users, Search, Download, Trash2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Lead {
  id?: string | number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  status?: string;
  ultima_tabulacao?: string;
  created_at?: string;
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
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

        const formattedLeads = data.map((row) => ({
          nome: row["Nome"] || row["NOME"] || row["cliente"] || row["Cliente"] || "Sem Nome",
          telefone: String(row["Telefone"] || row["TELEFONE"] || row["Celular"] || row["celular"] || "").replace(/\D/g, ""),
          cpf: String(row["CPF"] || row["cpf"] || ""),
          margem_disponivel: String(row["Margem"] || row["margem"] || row["Valor"] || "R$ 0,00"),
          banco: String(row["Banco"] || row["banco"] || "Não informado"),
          status: "pendente",
        })).filter(l => l.telefone.length >= 8);

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
    const filteredToExport = leads.filter(l => {
      if (statusFilter === "contratos") return l.ultima_tabulacao === "Contrato";
      if (statusFilter === "pendente") return l.status === "pendente";
      if (statusFilter === "finalizado") return l.status === "finalizado";
      return true;
    });

    if (filteredToExport.length === 0) {
      alert("Nenhum lead para exportar com o filtro atual.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(filteredToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || l.telefone.includes(searchTerm) || (l.cpf && l.cpf.includes(searchTerm));
    if (statusFilter === "contratos") return matchesSearch && l.ultima_tabulacao === "Contrato";
    if (statusFilter === "pendente") return matchesSearch && l.status === "pendente";
    if (statusFilter === "finalizado") return matchesSearch && l.status === "finalizado";
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM & Gestão de Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Importe novas bases, pesquise contatos e exporte os fechamentos.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchLeads} 
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition" 
            title="Recarregar"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button 
            onClick={handleExport}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition"
          >
            <Download size={16} />
            <span>Exportar Excel</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition"
          >
            <Upload size={16} />
            <span>Importar Planilha</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
        </div>
      </header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nome, telefone ou CPF..." 
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-3 py-2 outline-none"
              >
                <option value="todos">Todos os Leads</option>
                <option value="pendente">Apenas Pendentes (Na Fila)</option>
                <option value="contratos">Apenas Contratos Fechados</option>
                <option value="finalizado">Todos os Finalizados</option>
              </select>

              <span className="text-xs text-slate-500 font-bold bg-slate-200/60 px-2.5 py-1 rounded-md">
                {filteredLeads.length} leads
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold shadow-sm">
                <tr>
                  <th className="px-6 py-3.5">Nome do Lead</th>
                  <th className="px-6 py-3.5">Telefone</th>
                  <th className="px-6 py-3.5">CPF</th>
                  <th className="px-6 py-3.5">Margem / Limite</th>
                  <th className="px-6 py-3.5">Banco</th>
                  <th className="px-6 py-3.5">Status Fila</th>
                  <th className="px-6 py-3.5">Última Tabulação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-800">{lead.nome}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-700">{lead.telefone}</td>
                    <td className="px-6 py-3.5 font-mono text-xs">{lead.cpf || "-"}</td>
                    <td className="px-6 py-3.5 text-emerald-600 font-extrabold">{lead.margem_disponivel || "-"}</td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-semibold">{lead.banco || "-"}</td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        lead.status === "pendente" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {lead.status || "pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-bold text-slate-800">
                      {lead.ultima_tabulacao ? (
                        <span className={`px-2.5 py-0.5 rounded-full ${
                          lead.ultima_tabulacao === "Contrato" ? "bg-emerald-100 text-emerald-800" :
                          lead.ultima_tabulacao === "Retorno" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {lead.ultima_tabulacao}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
