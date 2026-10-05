"use client";

import React, { useState } from "react";
import { FileText, Save, Edit2, Plus } from "lucide-react";

export default function ScriptsPage() {
  const [activeScript, setActiveScript] = useState("saque-fgts");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Scripts de Vendas</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e edite roteiros para a equipe de operação.</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold transition">
          <Plus size={18} />
          <span>Novo Script</span>
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar of scripts */}
        <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roteiros Ativos</h3>
          </div>
          <div className="p-2 space-y-1">
            <button 
              onClick={() => setActiveScript("saque-fgts")}
              className={`w-full text-left px-4 py-3 rounded-md text-sm font-semibold flex items-center space-x-2 transition ${activeScript === "saque-fgts" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <FileText size={16} />
              <span>Saque FGTS</span>
            </button>
            <button 
              onClick={() => setActiveScript("portabilidade")}
              className={`w-full text-left px-4 py-3 rounded-md text-sm font-semibold flex items-center space-x-2 transition ${activeScript === "portabilidade" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <FileText size={16} />
              <span>Portabilidade INSS</span>
            </button>
            <button 
              onClick={() => setActiveScript("novo-contrato")}
              className={`w-full text-left px-4 py-3 rounded-md text-sm font-semibold flex items-center space-x-2 transition ${activeScript === "novo-contrato" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <FileText size={16} />
              <span>Novo Contrato (Margem Livre)</span>
            </button>
          </div>
        </div>

        {/* Script Editor */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Edit2 size={20} className="mr-2 text-slate-400" />
                Editando Script: {activeScript.replace("-", " ").toUpperCase()}
              </h2>
              <button className="flex items-center space-x-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-2 rounded-md font-semibold transition">
                <Save size={18} />
                <span>Salvar Alterações</span>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ABERTURA (Introdução)</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-4 text-slate-700 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  defaultValue={`"Oi, {nome}, tudo bem? Aqui é o Adriel da A&K Soluções Financeiras. Posso falar rapidinho sobre uma possibilidade relacionada ao seu benefício?"`}
                />
                <p className="text-xs text-slate-500 mt-1">Variáveis disponíveis: {'{nome}'}, {'{cpf}'}, {'{banco}'}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">MOTIVO DA LIGAÇÃO</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-4 text-slate-700 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  defaultValue={`"Quero verificar se existe uma opção de antecipação do saque-aniversário ou portabilidade disponível para você no {banco}, com juros mais baixos."`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">FECHAMENTO E SIMULAÇÃO</label>
                <textarea 
                  className="w-full border border-slate-200 rounded-lg p-4 text-slate-700 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  defaultValue={`"Posso verificar as condições e te mandar a simulação de {margem} via WhatsApp sem compromisso para você analisar?"`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
