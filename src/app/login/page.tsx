"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "first_access">("login");
  
  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // First access form
  const [nome, setNome] = useState("Adriel");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Se já estiver logado, redireciona para a operação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dialer");
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("E-mail ou senha incorretos. Verifique os dados digitados.");
        } else {
          setErrorMsg(error.message || "Erro ao realizar login.");
        }
        return;
      }

      if (data.user) {
        setSuccessMsg("Autenticado com sucesso! Entrando...");
        setTimeout(() => {
          router.push("/dialer");
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro inesperado ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (registerPassword.length < 6) {
      setErrorMsg("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (registerPassword !== confirmPassword) {
      setErrorMsg("A confirmação de senha não confere com a senha digitada.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = registerEmail.trim();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: registerPassword,
        options: {
          data: {
            nome: nome.trim(),
            role: "DONO"
          }
        }
      });

      if (error) {
        setErrorMsg(error.message || "Erro ao criar conta de Administrador.");
        return;
      }

      // Conecta a sessão imediatamente
      const loginRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: registerPassword
      });

      if (loginRes.error) {
        setSuccessMsg("Conta de Dono criada com sucesso! Você já pode fazer login na aba 'Entrar'.");
        setActiveTab("login");
        setEmail(cleanEmail);
      } else {
        setSuccessMsg("Conta de Dono ativada com sucesso! Inicializando a plataforma...");
        setTimeout(() => {
          router.push("/dialer");
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao configurar primeiro acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg mb-3 shadow-lg shadow-blue-500/20">
            AK
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">A&K Soluções Financeiras</h1>
          <p className="text-xs text-slate-400 mt-1">Plataforma Segura de Call Center & CRM</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 mb-6 text-xs">
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              activeTab === "login"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Entrar na Conta
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("first_access"); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all flex items-center justify-center space-x-1 ${
              activeTab === "first_access"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={12} className="text-amber-400" />
            <span>Primeiro Acesso (Dono)</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 bg-rose-950/40 border border-rose-800/80 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 px-3.5 py-2.5 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: Login Form */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="email"
                  required
                  placeholder="exemplo@aksolucoes.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/20 disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "Autenticando..." : "Entrar no Sistema"}</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        {/* TAB 2: First Access / Owner Registration */}
        {activeTab === "first_access" && (
          <form onSubmit={handleFirstAccess} className="space-y-3.5">
            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 text-[11px] text-blue-300 leading-snug mb-3">
              <strong className="text-white block mb-0.5">Ativação do Administrador Principal</strong>
              Este cadastro cria o usuário <strong>Dono / Superadmin</strong> com acesso irrestrito a todos os módulos, esteira e configurações.
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="text"
                  required
                  placeholder="Adriel Matos"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Seu E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="email"
                  required
                  placeholder="seuemail@empresa.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="Mín. 6 dígitos"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirmar
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20 disabled:opacity-60 cursor-pointer mt-2"
            >
              <span>{loading ? "Configurando Dono..." : "Ativar Dono do Sistema"}</span>
              <ShieldCheck size={15} />
            </button>
          </form>
        )}

        {/* Security Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Criptografia Ponta a Ponta • Proteção LGPD</span>
        </div>
      </div>
    </div>
  );
}
