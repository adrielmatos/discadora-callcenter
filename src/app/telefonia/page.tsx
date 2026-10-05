"use client";

import React, { useState, useEffect } from "react";
import { Phone, Shield, CheckCircle2, Save, Wifi, WifiOff } from "lucide-react";

export default function TelefoniaPage() {
  const [sipHost, setSipHost] = useState("");
  const [sipPort, setSipPort] = useState("5060");
  const [sipUser, setSipUser] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [protocol, setProtocol] = useState("WSS");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem("ak_sip_config");
    if (savedConfig) {
      try {
        const c = JSON.parse(savedConfig);
        if (c.sipHost) setSipHost(c.sipHost);
        if (c.sipPort) setSipPort(c.sipPort);
        if (c.sipUser) setSipUser(c.sipUser);
        if (c.sipPassword) setSipPassword(c.sipPassword);
        if (c.protocol) setProtocol(c.protocol);
      } catch (e) {}
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("ak_sip_config", JSON.stringify({
      sipHost,
      sipPort,
      sipUser,
      sipPassword,
      protocol
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Telefonia & PABX SIP</h1>
          <p className="text-slate-500 text-xs mt-0.5">Configuração de troncos SIP, ramais virtuais e telefonia em nuvem.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-xs transition"
        >
          <Save size={14} />
          <span>Salvar Credenciais</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-5">
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center space-x-2 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Configurações SIP salvas com sucesso!</span>
            </div>
          )}

          {/* Status do Ramal */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Modo Atual de Discagem</p>
                <p className="text-[11px] text-slate-500">Ponte Smartphone / Conectar do Windows (Plano de Minutos)</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Smartphone Ativo
            </span>
          </div>

          {/* Painel de Conexão SIP */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Configuração de Ramal SIP / WebRTC</h3>
              <p className="text-xs text-slate-500 mt-0.5">Preencha caso queira utilizar provedores como ViciDial, Asterisk, Zoiper ou PABX IP.</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Servidor SIP / Host (IP ou Domínio):</label>
                <input 
                  type="text" 
                  placeholder="sip.provedor.com.br"
                  value={sipHost}
                  onChange={e => setSipHost(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Porta SIP:</label>
                <input 
                  type="text" 
                  placeholder="5060 ou 8089"
                  value={sipPort}
                  onChange={e => setSipPort(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Ramal / Usuário:</label>
                <input 
                  type="text" 
                  placeholder="1001"
                  value={sipUser}
                  onChange={e => setSipUser(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Senha do Ramal:</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={sipPassword}
                  onChange={e => setSipPassword(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Protocolo:</label>
                <select 
                  value={protocol}
                  onChange={e => setProtocol(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none font-semibold text-slate-700"
                >
                  <option value="WSS">WSS (WebRTC Seguro - Navegador)</option>
                  <option value="UDP">UDP (Padrão PABX)</option>
                  <option value="TCP">TCP</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
