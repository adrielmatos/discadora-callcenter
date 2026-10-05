"use client";

import React from "react";
import { 
  Users, PhoneCall, CheckCircle, Clock, 
  BarChart2, TrendingUp, Calendar, AlertCircle, FileText
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6] overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">Acompanhamento da operação de consignado em tempo real.</p>
      </header>

      {/* Main Content */}
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <PhoneCall size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Ligações Hoje</p>
              <h3 className="text-3xl font-bold text-slate-800">0</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Contratos (Mês)</p>
              <h3 className="text-3xl font-bold text-slate-800">0</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Retornos</p>
              <h3 className="text-3xl font-bold text-slate-800">0</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Leads na Fila</p>
              <h3 className="text-3xl font-bold text-slate-800">-</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          
          {/* Quick Actions */}
          <div className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-blue-500" size={20}/> Ações Rápidas
            </h3>
            <div className="space-y-3 flex-1">
              <Link href="/dialer" className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-md text-blue-600"><PhoneCall size={20}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-blue-700">Ir para o Discador</span>
                </div>
              </Link>
              <Link href="/leads" className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-green-500 hover:bg-green-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-md text-green-600"><Users size={20}/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-green-700">Importar Planilha</span>
                </div>
              </Link>
              <Link href="/scripts" className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition group">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 p-2 rounded-md text-purple-600"><FileText size={20} className="lucide-file-text"/></div>
                  <span className="font-semibold text-slate-700 group-hover:text-purple-700">Editar Scripts</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <BarChart2 className="mr-2 text-slate-500" size={20}/> Bem-vindo à Nova Arquitetura
            </h3>
            
            <div className="text-slate-600 space-y-4">
              <p>O sistema foi completamente reescrito para utilizar rotas independentes (App Router do Next.js), exatamente como os sistemas CloudTalk e Five9 funcionam.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Discador Remodelado:</strong> Acesse no menu esquerdo para ter a tela focada apenas no atendimento.</li>
                <li><strong>Módulo de CRM (Leads):</strong> Importação e pesquisa agora rodam em uma tela própria, sem pesar a tela de discagem.</li>
                <li><strong>Scripts Dedicados:</strong> Crie as abordagens separadamente.</li>
              </ul>
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mt-4 border border-blue-200">
                <strong>Importante:</strong> Se ocorrer erro 401 ou de permissões ao usar a plataforma, você precisa ajustar as regras de RLS (Row Level Security) no Supabase.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
