"use client";

import React, { useState, useEffect } from "react";
import { 
  Phone, Shield, CheckCircle2, Save, Wifi, WifiOff, 
  Headphones, Play, Radio, AlertCircle, Volume2, Mic, RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { phoneAudio, loadJsSIP } from "@/lib/softphone";

export default function TelefoniaPage() {
  const [sipHost, setSipHost] = useState("");
  const [sipPort, setSipPort] = useState("5060");
  const [sipUser, setSipUser] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [protocol, setProtocol] = useState("WSS");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Estados de Diagnóstico & Teste
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [audioTestActive, setAudioTestActive] = useState(false);
  const [micStatus, setMicStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) {
        const { data: op } = await supabase
          .from("operadores_app")
          .select("perfil")
          .eq("email", user.email)
          .maybeSingle();

        if (op && (op.perfil === "proprietario" || op.perfil === "admin" || op.perfil === "gestor")) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
    });
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_configuracoes")
      .select("sip_host, sip_port, sip_user, sip_password, sip_protocol")
      .eq("id", 1)
      .single();

    if (data && !error) {
      setSipHost(data.sip_host || "");
      setSipPort(data.sip_port || "5060");
      setSipUser(data.sip_user || "");
      setSipPassword(data.sip_password || "");
      setProtocol(data.sip_protocol || "WSS");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("app_configuracoes")
      .update({
        sip_host: sipHost.trim(),
        sip_port: sipPort.trim(),
        sip_user: sipUser.trim(),
        sip_password: sipPassword.trim(),
        sip_protocol: protocol,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert("Erro ao salvar configurações de telefonia: " + error.message);
    }
  };

  // Teste de conexão com o PABX SIP
  const handleTestSipConnection = async () => {
    if (!sipHost.trim() || !sipUser.trim()) {
      setTestStatus("error");
      setTestMessage("Preencha ao menos o Servidor SIP e o Ramal para testar.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Conectando ao gateway WebRTC do PABX...");

    try {
      const cleanHost = sipHost.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/.*$/, "");
      const port = sipPort.trim() ? `:${sipPort.trim()}` : ":8089";
      const wssUrl = `wss://${cleanHost}${port}/ws`;

      setTestMessage(`Testando handshake WebSocket seguro em ${wssUrl}...`);

      const ws = new WebSocket(wssUrl, ["sip"]);
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          ws.close();
          setTestStatus("error");
          setTestMessage(`Tempo limite excedido ao conectar em ${wssUrl}. Verifique se o PABX possui certificado SSL/TLS (WSS) ativo.`);
        }
      }, 5000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          setTestStatus("success");
          setTestMessage(`Sucesso! PABX SIP respondeu perfeitamente via WSS em ${cleanHost}${port}.`);
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          setTestStatus("error");
          setTestMessage(`Porta ${sipPort} recusou conexão em ${cleanHost}. Dica: Para navegadores web, o Asterisk/FreePBX utiliza porta WSS 8089 ou 443 com certificado HTTPS válido.`);
        }
      };
    } catch (e: any) {
      setTestStatus("error");
      setTestMessage(`Falha no teste: ${e?.message || "Servidor inacessível"}`);
    }
  };

  // Teste de áudio do fone de ouvido (Bipe DTMF e Tom de Linha)
  const handleTestAudio = () => {
    setAudioTestActive(true);
    phoneAudio.playDtmf("1");
    setTimeout(() => phoneAudio.playDtmf("5"), 200);
    setTimeout(() => phoneAudio.playDtmf("9"), 400);
    setTimeout(() => {
      phoneAudio.startRinging();
      setTimeout(() => {
        phoneAudio.stopRinging();
        phoneAudio.playHangupTone();
        setAudioTestActive(false);
      }, 1500);
    }, 700);
  };

  // Teste de permissão de microfone
  const handleRequestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus("granted");
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      setMicStatus("denied");
    }
  };

  if (isAuthorized === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-800 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Shield size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Configuração Restrita</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            As credenciais de tronco SIP, senhas e portas de PABX são restritas a Gestores e Administradores.
            Como operador, suas chamadas são disparadas automaticamente pelo Discador.
          </p>
          <a
            href="/dialer"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <Phone size={14} />
            <span>Ir para o Discador de Chamadas</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Telefonia & PABX SIP WebRTC</h1>
          <p className="text-slate-500 text-xs mt-0.5">Configuração de troncos SIP, ramais virtuais no navegador e telefonia em nuvem.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
        >
          <Save size={14} />
          <span>{loading ? "Carregando..." : "Salvar Credenciais"}</span>
        </button>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {saved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Configurações SIP salvas com sucesso no banco de dados da empresa!</span>
            </div>
          )}

          {/* Banner Modo de Operação */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/80 shrink-0">
                <Headphones size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Motor Softphone Integrado (Fase 2)</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permite aos operadores atender e discar com fone de ouvido direto no navegador via WebRTC (WSS), sem precisar do Zoiper.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                sipHost && sipUser 
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                  : "text-blue-700 bg-blue-50 border-blue-200"
              }`}>
                {sipHost && sipUser ? "🟢 Ramal Configurado" : "📱 Modo Smartphone Ativo"}
              </span>
            </div>
          </div>

          {/* Painel de Configuração SIP */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dados de Acesso ao PABX IP / Asterisk / FreePBX</h3>
                <p className="text-xs text-slate-500 mt-0.5">Preencha os dados do seu provedor VoIP para habilitar o Softphone nativo.</p>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm font-semibold animate-pulse">
                Carregando configurações do servidor...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Servidor SIP / Host (IP ou Domínio):
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: sip.meupabx.com.br ou 192.168.1.100"
                      value={sipHost}
                      onChange={e => setSipHost(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Porta WebRTC / WSS:
                    </label>
                    <input 
                      type="text" 
                      placeholder="8089 (Asterisk WSS) ou 443"
                      value={sipPort}
                      onChange={e => setSipPort(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono transition"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Padrão para navegador: 8089 (WSS) ou 8088 (WS)</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Ramal / Usuário SIP:
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: 1001"
                      value={sipUser}
                      onChange={e => setSipUser(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 font-mono transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Senha / Secret do Ramal:
                    </label>
                    <input 
                      type="password" 
                      placeholder="••••••••••••"
                      value={sipPassword}
                      onChange={e => setSipPassword(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Protocolo de Conexão:
                    </label>
                    <select 
                      value={protocol}
                      onChange={e => setProtocol(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none font-semibold text-slate-700 transition"
                    >
                      <option value="WSS">WSS (WebRTC Seguro - Navegador Google Chrome/Edge) [Recomendado]</option>
                      <option value="UDP">UDP (Padrão PABX Legado / Dispositivos Físicos)</option>
                      <option value="TCP">TCP (Tronco Dedicado)</option>
                    </select>
                  </div>
                </div>

                {/* Botão Testar Conexão SIP */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestSipConnection}
                    disabled={testStatus === "testing"}
                    className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Radio size={14} className={testStatus === "testing" ? "animate-spin text-blue-400" : "text-emerald-400"} />
                    <span>{testStatus === "testing" ? "Testando Handshake..." : "Testar Conexão com PABX"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestAudio}
                    disabled={audioTestActive}
                    className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 size={14} className={audioTestActive ? "text-blue-600 animate-pulse" : "text-slate-500"} />
                    <span>{audioTestActive ? "Tocando tons DTMF..." : "Testar Áudio do Headset"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestMic}
                    className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Mic size={14} className={micStatus === "granted" ? "text-emerald-600" : "text-slate-500"} />
                    <span>
                      {micStatus === "granted" ? "Microfone Autorizado ✅" : micStatus === "denied" ? "Microfone Bloqueado ❌" : "Testar Microfone"}
                    </span>
                  </button>
                </div>

                {/* Resultado do Teste de Diagnóstico */}
                {testMessage && (
                  <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start space-x-2 animate-in fade-in ${
                    testStatus === "success" 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                      : testStatus === "error" 
                      ? "bg-rose-50 border-rose-200 text-rose-800" 
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}>
                    {testStatus === "success" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />}
                    {testStatus === "error" && <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />}
                    {testStatus === "testing" && <RefreshCw size={16} className="text-blue-600 animate-spin shrink-0 mt-0.5" />}
                    <span className="leading-relaxed">{testMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dica para o Gestor de Call Center */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-blue-950">
              <Shield size={15} className="text-blue-600" />
              Como funciona o Softphone WebRTC na Discadora?
            </h4>
            <p className="leading-relaxed text-blue-800">
              Quando você preenche o servidor SIP e ramal, os operadores da sua equipe ganham automaticamente um discador com áudio bidirecional direto na tela da Discadora. Se a sua empresa ainda não tiver um PABX em nuvem, o sistema opera de forma transparente no <strong>Modo Smartphone</strong>, disparando a chamada pelo aplicativo móvel ou discador do Windows sem custo extra de telefonia.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
