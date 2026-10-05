"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Users, Search, Download, Trash2, RefreshCw } from "lucide-react";
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
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("id", { ascending: false }).limit(200);
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
          alert("Nenhum lead válido encontrado.");
          return;
        }

        setLoading(true);
        const { error } = await supabase.from("leads").insert(formattedLeads);
        if (error) {
          alert("Erro ao importar: " + error.message + ". Verifique se o schema da tabela 'leads' possui as colunas.");
        } else {
          alert(`${formattedLeads.length} leads importados!`);
          fetchLeads();
        }
      } catch (err: any) {
        alert("Erro na leitura: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredLeads = leads.filter(l => 
    l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.telefone.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM & Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie seus contatos e importe novas bases.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchLeads} className="p-2 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition"
          >
            <Upload size={18} />
            <span>Importar Planilha</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
        </div>
      </header>

      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou telefone..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm text-slate-500 font-medium">
              {filteredLeads.length} leads listados
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold shadow-sm">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4">CPF</th>
                  <th className="px-6 py-4">Margem</th>
                  <th className="px-6 py-4">Banco</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Tabulação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead, idx) => (
                  <tr key={lead.id || idx} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-semibold text-slate-800">{lead.nome}</td>
                    <td className="px-6 py-4 font-mono">{lead.telefone}</td>
                    <td className="px-6 py-4">{lead.cpf || "-"}</td>
                    <td className="px-6 py-4 text-green-600 font-bold">{lead.margem_disponivel || "-"}</td>
                    <td className="px-6 py-4">{lead.banco || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === "pendente" ? "bg-blue-50 text-blue-600" :
                        lead.status === "finalizado" ? "bg-slate-100 text-slate-600" :
                        "bg-green-50 text-green-600"
                      }`}>
                        {lead.status || "pendente"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {lead.ultima_tabulacao || "-"}
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Nenhum lead encontrado.
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
