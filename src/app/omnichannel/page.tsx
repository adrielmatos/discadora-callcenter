"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Save, CheckCircle2, Send, Smartphone, ShieldCheck } from "lucide-react";

export default function OmnichannelPage() {
  const [waMode, setWaMode] = useState<"web" | "api">("web");
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [instanceName, setInstanceName] = useState("");
  const [defaultMessage, setDefaultMessage] = useState(
    "Olá, [NOME]! Sou o Adriel da A&K Soluções, correspondente autorizado BRS Promotora. Conforme conversamos, segue a sua simulação de crédito aprovada com margem de [VALOR] pelo banco [BANCO]. Ficou com alguma dúvida nas condições?"
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("ak_omnichannel_config");
    if (savedConfig) {
      try {
        const c = JSON.parse(savedConfig);
        if (c.waMode) setWaMode(c.waMode);
        if (c.apiUrl) setApiUrl(c.apiUrl);
        if (c.apiToken) setApiToken(c.apiToken);
        if (c.instanceName) setInstanceName(c.instanceName);
        if (c.defaultMessage) setDefaultMessage(c.defaultMessage);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ak_omnichannel_config", JSON.stringify({
      waMode,
      apiUrl,
      apiToken,
      instanceName,
      defaultMessage
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Omnichannel & WhatsApp</h1>
          <p className="text-slate-500 text-xs mt-0.5">Disparo de propostas, mensagens de simulação e canais de atendimento BRS.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition"
        >
          <Save size={14} />
          <span>Salvar Configuração</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-5">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Configurações do WhatsApp salvas com sucesso!</span>
            </div>
          )}

          {/* Seletor de Modo */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Modo de Envio do WhatsApp</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setWaMode("web")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  waMode === "web" ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Smartphone className={waMode === "web" ? "text-emerald-600" : "text-slate-400"} size={18} />
                  <span className="text-xs font-bold text-slate-800">WhatsApp Web / App (Nativo)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Abre a conversa direto no WhatsApp do seu PC ou celular com o texto pronto. <strong>Zero custo e zero risco de bloqueio.</strong>
                </p>
              </div>

              <div 
                onClick={() => setWaMode("api")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  waMode === "api" ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Send className={waMode === "api" ? "text-blue-600" : "text-slate-400"} size={18} />
                  <span className="text-xs font-bold text-slate-800">Gateway API Automático</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Disparo em segundo plano via servidor próprio (Evolution API, Z-API ou Baileys).
                </p>
              </div>
            </div>
          </div>

          {/* Configuração de Gateway caso escolha API */}
          {waMode === "api" && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3.5">
              <h3 className="text-sm font-bold text-slate-900">Credenciais da API de WhatsApp</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">URL da API (Endpoint):</label>
                  <input 
                    type="text" 
                    placeholder="https://api.seudominio.com.br"
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome da Instância:</label>
                    <input 
                      type="text" 
                      placeholder="adriel-atendimento"
                      value={instanceName}
                      onChange={e => setInstanceName(e.target.value)}
                      className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">API Key / Token:</label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mensagem Padrão */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Mensagem Padrão de Simulação</h3>
            <p className="text-xs text-slate-500">Este é o texto que o botão do WhatsApp do discador carrega automaticamente.</p>
            
            <textarea 
              value={defaultMessage}
              onChange={e => setDefaultMessage(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-lg text-xs h-24 outline-none focus:border-blue-500 text-slate-800 leading-relaxed"
            />
            <p className="text-[11px] text-slate-400">Variáveis: <code>[NOME]</code>, <code>[BANCO]</code> e <code>[VALOR]</code>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
