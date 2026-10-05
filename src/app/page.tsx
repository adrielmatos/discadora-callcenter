"use client";

import React, { useState } from "react";
import { 
  Home, PhoneCall, Users, BarChart2, Settings, List, 
  Calendar, MessageCircle, Ban, LogOut, Plus, X, Phone, PhoneOff, Check, User
} from "lucide-react";

export default function Dashboard() {
  const [activeLead, setActiveLead] = useState({
    name: "João da Silva",
    phone: "11999999999",
    document: "123.456.789-00",
    value: "R$ 15.000,00",
    bank: "Banco do Brasil",
  });

  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "disposition">("idle");
  const [showNotification, setShowNotification] = useState(true);

  const handleCall = () => {
    window.location.href = `tel:+55${activeLead.phone}`;
    setCallStatus("calling");
    setTimeout(() => setCallStatus("talking"), 3000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá ${activeLead.name}, sou da A&K Soluções, tudo bem?`);
    window.open(`https://wa.me/55${activeLead.phone}?text=${text}`, "_blank");
  };

  const handleDisposition = (status: string) => {
    setCallStatus("idle");
    alert(`Tabulado como: ${status}. Próximo lead carregado!`);
  };

  const menuItems = [
    { name: "Visão geral", icon: Home, active: false },
    { name: "Discador", icon: PhoneCall, active: true },
    { name: "CRM", icon: Users, active: false },
    { name: "Resultados", icon: BarChart2, active: false },
    { name: "Leads", icon: List, active: false },
    { name: "Campanhas", icon: List, active: false },
    { name: "Retornos", icon: Calendar, active: false },
    { name: "Telefonia", icon: Phone, active: false },
    { name: "Omnichannel", icon: MessageCircle, active: false },
    { name: "Relatórios", icon: BarChart2, active: false },
    { name: "Não Perturbe", icon: Ban, active: false },
    { name: "Configurações", icon: Settings, active: false },
  ];

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden font-sans">
      
      {/* SIDEBAR (Estilo A&K Call Center) */}
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
            <a
              key={item.name}
              href="#"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                item.active 
                  ? "bg-[#1d2b4f] text-white border border-slate-700/50" 
                  : "text-slate-400 hover:bg-[#131d38] hover:text-slate-200"
              }`}
            >
              <item.icon size={18} className={item.active ? "text-blue-400" : "text-slate-500"} />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        <div className="p-5 border-t border-slate-800 space-y-3">
          <button className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-semibold transition">
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
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Discador</h2>
              <p className="text-slate-500 text-sm mt-1">Operação de consignado, CRM e telefonia em um único painel.</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-600 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Sistema online • v2.1.0</span>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md font-semibold text-sm shadow-sm transition flex items-center space-x-2">
                <Plus size={16} />
                <span>Nova importação</span>
              </button>
            </div>
          </header>

          {/* NOTIFICATION BANNER */}
          {showNotification && (
            <div className="bg-[#e8f5e9] border border-[#c8e6c9] text-[#2e7d32] px-4 py-3 rounded-md flex justify-between items-center mb-6 text-sm shadow-sm">
              <span>Retorno no horário: <strong>Thiago Mendes Costa</strong></span>
              <button onClick={() => setShowNotification(false)} className="text-[#2e7d32] hover:text-green-900">
                <X size={16} />
              </button>
            </div>
          )}

          {/* CONTEÚDO DO DISCADOR (Adaptado ao Design System) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Abas Superiores (Estilo Omnichannel) */}
            <div className="border-b border-slate-100 flex p-4 space-x-2 bg-slate-50/50">
              <button className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm font-semibold shadow-sm">
                Chamada Ativa
              </button>
              <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md text-sm font-medium shadow-sm transition">
                Fila de Espera
              </button>
              <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-md text-sm font-medium shadow-sm transition">
                Histórico
              </button>
            </div>

            <div className="p-6 md:p-10">
              {/* Header do Lead */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <User size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{activeLead.name}</h3>
                    <p className="text-slate-500 font-mono mt-1">{activeLead.document}</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-right min-w-[200px]">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Margem Disponível</p>
                  <p className="text-2xl font-bold text-green-600">{activeLead.value}</p>
                  <p className="text-sm text-slate-600 mt-1">{activeLead.bank}</p>
                </div>
              </div>

              {/* Área de Ação */}
              <div className="flex flex-col items-center justify-center space-y-8 py-8">
                <p className="text-5xl font-mono tracking-wider text-slate-700 font-bold">{activeLead.phone}</p>
                
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
                        Forçar Atendimento (Teste)
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

                {/* Área de Tabulação (Disposição) */}
                {callStatus === "disposition" && (
                  <div className="w-full mt-4 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Classifique o Resultado da Chamada</h4>
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

        </div>
      </main>
    </div>
  );
}
