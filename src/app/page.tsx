"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Home, PhoneCall, Users, BarChart2, Settings, List, 
  Calendar, MessageCircle, Ban, LogOut, Plus, X, Phone, PhoneOff, Check, User, Upload, RefreshCw
} from "lucide-react";
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
  tentativas?: number;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"discador" | "importar" | "leads">("discador");
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "disposition">("idle");
  const [showNotification, setShowNotification] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega leads do Supabase
  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("status", "pendente")
        .order("id", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Erro ao carregar leads:", error);
      } else if (data && data.length > 0) {
        setLeadsList(data);
        setCurrentLeadIndex(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const activeLead: Lead = leadsList[currentLeadIndex] || {
    nome: "Nenhum lead pendente",
    telefone: "00000000000",
    cpf: "000.000.000-00",
    margem_disponivel: "R$ 0,00",
    banco: "Sem banco",
  };

  const handleCall = () => {
    if (!activeLead.telefone || activeLead.telefone === "00000000000") {
      alert("Nenhum lead selecionado para discar.");
      return;
    }
    window.location.href = `tel:+55${activeLead.telefone.replace(/\D/g, "")}`;
    setCallStatus("calling");
    setTimeout(() => setCallStatus("talking"), 2500);
  };

  const handleWhatsApp = () => {
    if (!activeLead.telefone || activeLead.telefone === "00000000000") return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const text = encodeURIComponent(`Olá ${activeLead.nome}, sou da A&K Soluções Financeiras, tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  const handleDisposition = async (status: string) => {
    if (activeLead.id) {
      // Salva a tabulação no Supabase
      await supabase.from("historico_ligacoes").insert({
        lead_id: activeLead.id,
        tabulacao: status,
      });

      // Atualiza o status do lead
      await supabase
        .from("leads")
        .update({ 
          status: status === "Agendar Retorno" ? "agendado" : "finalizado",
          ultima_tabulacao: status,
          tentativas: (activeLead.tentativas || 0) + 1
        })
        .eq("id", activeLead.id);
    }

    setCallStatus("idle");

    // Avança para o próximo lead
    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(currentLeadIndex + 1);
    } else {
      alert("Você finalizou todos os leads disponíveis!");
      loadLeads();
    }
  };

  // Importador de Planilha (XLSX, XLS, CSV)
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
          telefone: String(row["Telefone"] || row["TELEFONE"] || row["Celular"] || row["celular"] || row["fone"] || "").replace(/\D/g, ""),
          cpf: String(row["CPF"] || row["cpf"] || ""),
          margem_disponivel: String(row["Margem"] || row["margem"] || row["Valor"] || "R$ 0,00"),
          banco: String(row["Banco"] || row["banco"] || "Não informado"),
          status: "pendente",
        })).filter(l => l.telefone.length >= 8);

        if (formattedLeads.length === 0) {
          alert("Nenhum lead com telefone válido encontrado na planilha.");
          return;
        }

        setLoading(true);
        const { error } = await supabase.from("leads").insert(formattedLeads);

        if (error) {
          alert("Erro ao salvar no Supabase: " + error.message);
        } else {
          alert(`Sucesso! ${formattedLeads.length} leads importados para o banco!`);
          loadLeads();
          setActiveTab("discador");
        }
      } catch (err: any) {
        alert("Erro ao ler o arquivo: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const menuItems = [
    { name: "Visão geral", icon: Home, tab: "discador" as const },
    { name: "Discador", icon: PhoneCall, tab: "discador" as const },
    { name: "Leads", icon: List, tab: "leads" as const },
    { name: "Importar lista", icon: Upload, tab: "importar" as const },
    { name: "CRM", icon: Users, tab: "discador" as const },
    { name: "Resultados", icon: BarChart2, tab: "discador" as const },
    { name: "Campanhas", icon: List, tab: "discador" as const },
    { name: "Retornos", icon: Calendar, tab: "discador" as const },
    { name: "Telefonia", icon: Phone, tab: "discador" as const },
    { name: "Omnichannel", icon: MessageCircle, tab: "discador" as const },
    { name: "Não Perturbe", icon: Ban, tab: "discador" as const },
    { name: "Configurações", icon: Settings, tab: "discador" as const },
  ];

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a101f] text-slate-300 flex flex-col h-full shadow-xl z-10 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center">
            <span className="text-blue-500 mr-1">A&K</span> CALL CENTER
          </h1>
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center space-x-3 bg-[#131d38] p-3 rounded-lg border border-slate-700/50">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-inner">
              A
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Adriel</p>
              <p className="text-xs text-slate-400">proprietário</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.tab)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                activeTab === item.tab 
                  ? "bg-[#1d2b4f] text-white border border-slate-700/50" 
                  : "text-slate-400 hover:bg-[#131d38] hover:text-slate-200"
              }`}
            >
              <item.icon size={18} className={activeTab === item.tab ? "text-blue-400" : "text-slate-500"} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-slate-800 space-y-3">
          <button 
            onClick={() => setActiveTab("importar")}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-semibold transition"
          >
            <Plus size={18} />
            <span>Importar lista</span>
          </button>
          <button className="w-full flex items-center justify-center space-x-2 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 py-2.5 rounded-md text-sm font-semibold transition">
            <span>Sair</span>
          </button>
          <p className="text-[10px] text-slate-600 leading-tight mt-4 text-center">
            A&K Soluções Financeiras<br/>Soluções que fazem sentido para você.
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          
          {/* HEADER */}
          <header className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-2">
                <span>CENTRAL OPERACIONAL</span>
                <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                <span>ONLINE</span>
              </p>
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {activeTab === "discador" && "Discador Automático"}
                {activeTab === "importar" && "Importação de Planilha"}
                {activeTab === "leads" && "Lista de Leads"}
              </h2>
              <p className="text-slate-500 text-sm mt-1">Operação de consignado, CRM e telefonia integrada ao Supabase.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={loadLeads}
                className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-600 shadow-sm hover:bg-slate-50"
              >
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                <span>Atualizar banco</span>
              </button>
              <button 
                onClick={() => setActiveTab("importar")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md font-semibold text-sm shadow-sm transition flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Nova importação</span>
              </button>
            </div>
          </header>

          {/* NOTIFICATION BANNER */}
          {showNotification && (
            <div className="bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32] px-4 py-3 rounded-md flex justify-between items-center mb-6 text-sm shadow-sm">
              <span>Banco conectado com sucesso ao projeto <strong>arcaaeehnxluginzncfs</strong></span>
              <button onClick={() => setShowNotification(false)} className="text-[#2e7d32] hover:text-green-900">
                <X size={16} />
              </button>
            </div>
          )}

          {/* TELA DE IMPORTAÇÃO */}
          {activeTab === "importar" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Importar Leads por Planilha</h3>
              <p className="text-sm text-slate-500 mb-6">Suporta arquivos Excel (.xlsx, .xls) ou CSV. As colunas reconhecidas são: Nome, Telefone/Celular, CPF, Margem e Banco.</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-500 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer bg-blue-50/30 transition group"
              >
                <Upload size={48} className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-lg font-semibold text-slate-700">Clique para selecionar sua planilha</p>
                <p className="text-xs text-slate-400 mt-2">Arquivos .xlsx, .xls ou .csv</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
              </div>
            </div>
          )}

          {/* TELA DA LISTA DE LEADS */}
          {activeTab === "leads" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Fila Ativa de Contatos ({leadsList.length})</h3>
                <span className="text-xs text-slate-500">Puxados diretamente do Supabase</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[11px] font-bold">
                    <tr>
                      <th className="px-6 py-3">Nome</th>
                      <th className="px-6 py-3">Telefone</th>
                      <th className="px-6 py-3">CPF</th>
                      <th className="px-6 py-3">Margem</th>
                      <th className="px-6 py-3">Banco</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leadsList.map((lead, idx) => (
                      <tr key={lead.id || idx} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 font-semibold text-slate-800">{lead.nome}</td>
                        <td className="px-6 py-4 font-mono">{lead.telefone}</td>
                        <td className="px-6 py-4">{lead.cpf || "-"}</td>
                        <td className="px-6 py-4 text-green-600 font-bold">{lead.margem_disponivel || "-"}</td>
                        <td className="px-6 py-4">{lead.banco || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-medium">
                            {lead.status || "pendente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {leadsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          Nenhum lead pendente no banco. Importe uma planilha para começar!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TELA DO DISCADOR */}
          {activeTab === "discador" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 flex p-4 justify-between items-center bg-slate-50/50">
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm font-semibold shadow-sm">
                    Chamada Ativa
                  </button>
                  <button onClick={() => setActiveTab("leads")} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md text-sm font-medium shadow-sm transition">
                    Fila de Espera ({leadsList.length})
                  </button>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Lead {leadsList.length > 0 ? currentLeadIndex + 1 : 0} de {leadsList.length}
                </div>
              </div>

              <div className="p-6 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6">
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <User size={32} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">{activeLead.nome}</h3>
                      <p className="text-slate-500 font-mono mt-1">{activeLead.cpf || "CPF não informado"}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-right min-w-[200px]">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Margem Disponível</p>
                    <p className="text-2xl font-bold text-green-600">{activeLead.margem_disponivel || "R$ 0,00"}</p>
                    <p className="text-sm text-slate-600 mt-1">{activeLead.banco || "Não informado"}</p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-8 py-8">
                  <p className="text-5xl font-mono tracking-wider text-slate-700 font-bold">{activeLead.telefone}</p>
                  
                  <div className="flex space-x-4">
                    {callStatus === "idle" && (
                      <>
                        <button 
                          onClick={handleCall}
                          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-semibold text-lg transition shadow-sm"
                        >
                          <Phone size={20} />
                          <span>Discar via Smartphone</span>
                        </button>
                        
                        <button 
                          onClick={handleWhatsApp}
                          className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-8 py-3 rounded-md font-semibold text-lg transition shadow-sm"
                        >
                          <MessageCircle size={20} className="text-[#25D366]" />
                          <span>Abrir WhatsApp</span>
                        </button>
                      </>
                    )}

                    {callStatus === "calling" && (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="flex items-center space-x-3 text-blue-600">
                          <Phone size={24} className="animate-bounce" />
                          <span className="font-bold text-xl">Discando no smartphone...</span>
                        </div>
                        <button 
                          onClick={() => setCallStatus("talking")}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-md font-semibold shadow-sm"
                        >
                          Atendeu (Iniciar Conversa)
                        </button>
                      </div>
                    )}

                    {callStatus === "talking" && (
                      <button 
                        onClick={() => setCallStatus("disposition")}
                        className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-md font-bold text-lg shadow-sm transition"
                      >
                        <PhoneOff size={24} />
                        <span>Desligar e Tabular Chamada</span>
                      </button>
                    )}
                  </div>

                  {callStatus === "disposition" && (
                    <div className="w-full mt-4 pt-6 border-t border-slate-200">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Classifique o Resultado no Banco</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => handleDisposition("Venda Concluída")} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-lg transition group shadow-sm">
                          <Check className="mb-2 text-slate-400 group-hover:text-green-600" size={24} />
                          <span className="font-semibold text-slate-700 group-hover:text-green-700 text-sm">Venda Fechada</span>
                        </button>
                        <button onClick={() => handleDisposition("Agendar Retorno")} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group shadow-sm">
                          <Calendar className="mb-2 text-slate-400 group-hover:text-blue-600" size={24} />
                          <span className="font-semibold text-slate-700 group-hover:text-blue-700 text-sm">Agendar Retorno</span>
                        </button>
                        <button onClick={() => handleDisposition("Caixa Postal")} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-lg transition group shadow-sm">
                          <PhoneOff className="mb-2 text-slate-400 group-hover:text-orange-500" size={24} />
                          <span className="font-semibold text-slate-700 group-hover:text-orange-600 text-sm">Caixa Postal</span>
                        </button>
                        <button onClick={() => handleDisposition("Não Tem Interesse")} className="flex flex-col items-center justify-center p-4 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-lg transition group shadow-sm">
                          <Ban className="mb-2 text-slate-400 group-hover:text-red-500" size={24} />
                          <span className="font-semibold text-slate-700 group-hover:text-red-600 text-sm">Sem Interesse</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
