"use client";

import React, { useState, useEffect } from "react";
import { Settings, Building, Phone, Shield, Save, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [empresaNome, setEmpresaNome] = useState("A&K Soluções Financeiras");
  const [operadorNome, setOperadorNome] = useState("Adriel");
  const [dddPadrao, setDddPadrao] = useState("85");
  const [autoNext, setAutoNext] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("ak_settings");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.empresaNome) setEmpresaNome(parsed.empresaNome);
        if (parsed.operadorNome) setOperadorNome(parsed.operadorNome);
        if (parsed.dddPadrao) setDddPadrao(parsed.dddPadrao);
        if (parsed.autoNext !== undefined) setAutoNext(parsed.autoNext);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ak_settings", JSON.stringify({
      empresaNome,
      operadorNome,
      dddPadrao,
      autoNext
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
          <p className="text-slate-500 text-sm mt-1">Parâmetros operacionais, dados da empresa e preferências do discador.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition"
        >
          <Save size={16} />
          <span>Salvar Configurações</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2 text-sm font-semibold">
              <CheckCircle size={18} className="text-emerald-600" />
              <span>Configurações salvas e aplicadas com sucesso!</span>
            </div>
          )}

          {/* Dados da Empresa */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Building className="text-blue-600" size={18} />
              <span>Identificação da Operação / Empresa</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nome Fantasia da Empresa:</label>
                <input 
                  type="text" 
                  value={empresaNome}
                  onChange={e => setEmpresaNome(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nome do Operador Principal:</label>
                <input 
                  type="text" 
                  value={operadorNome}
                  onChange={e => setOperadorNome(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Preferências do Discador */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Phone className="text-emerald-600" size={18} />
              <span>Regras de Discagem e Telefonia</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">DDD Local Padrão:</label>
                <input 
                  type="text" 
                  value={dddPadrao}
                  onChange={e => setDddPadrao(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Usado caso o número importado não tenha DDD preenchido.</p>
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <input 
                  type="checkbox" 
                  id="autonext"
                  checked={autoNext}
                  onChange={e => setAutoNext(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="autonext" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Avançar para o próximo lead automaticamente após tabular
                </label>
              </div>
            </div>
          </div>

          {/* SaaS & Versão */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex justify-between items-center text-xs text-slate-500">
            <div>
              <p className="font-bold text-slate-700">AK Cloud Talk • Enterprise Dialer</p>
              <p className="mt-0.5">Versão 3.1.0 • Pronto para expansão Multi-Tenant</p>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono font-bold text-slate-600">
              Banco: Supabase (Conectado)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
