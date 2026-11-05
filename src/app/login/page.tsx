"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, Key } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "forgot" | "force_change_password">("login");
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Se já estiver logado, redireciona caso não precise alterar senha
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const needsChange = Boolean(
          session.user.user_metadata?.needs_password_change ||
          session.user.app_metadata?.needs_password_change
        );
        if (needsChange) {
          setMode("force_change_password");
          setSuccessMsg("Primeiro acesso: Por segurança, defina uma nova senha pessoal.");
        } else {
          router.push("/dialer");
        }
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setErrorMsg("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e pasta de spam.");
        } else {
          // Mensagem genérica estrita para evitar enumeração de contas existentes
          setErrorMsg("E-mail ou senha incorretos.");
        }
        return;
      }

      if (data.user) {
        // Validação de Conta Suspensa, Inativa ou Período de Testes Expirado
        try {
          const { data: opData } = await supabase
            .from("operadores")
            .select("ativo, empresa_id")
            .eq("auth_user_id", data.user.id)
            .maybeSingle();

          if (opData && !opData.ativo) {
            await supabase.auth.signOut();
            setErrorMsg("Sua conta de operador está suspensa. Entre em contato com o administrador da sua empresa.");
            return;
          }

          if (opData?.empresa_id) {
            const { data: empData } = await supabase
              .from("empresas")
              .select("status, trial_expira_em")
              .eq("id", opData.empresa_id)
              .maybeSingle();

            if (empData) {
              if (empData.status === "bloqueada" || empData.status === "suspensa") {
                await supabase.auth.signOut();
                setErrorMsg("Sua empresa está com o acesso suspenso. Entre em contato com o suporte comercial.");
                return;
              }

              if (empData.status === "trial" && empData.trial_expira_em) {
                const agora = new Date();
                const expira = new Date(empData.trial_expira_em);
                if (agora > expira) {
                  await supabase.auth.signOut();
                  setErrorMsg("Seu período de teste grátis expirou. Fale com um consultor para assinar um plano e continuar operando.");
                  return;
                }
              }
            }
          }
        } catch (checkErr) {
          console.warn("Aviso na verificação de status:", checkErr);
        }

        // Força troca de senha no primeiro acesso se a flag estiver ativa
        const needsChange = Boolean(
          data.user.user_metadata?.needs_password_change ||
          data.user.app_metadata?.needs_password_change
        );

        if (needsChange) {
          setMode("force_change_password");
          setSuccessMsg("Primeiro acesso: Por segurança, defina uma nova senha pessoal antes de continuar.");
          return;
        }

        setSuccessMsg("Autenticado com sucesso! Entrando no sistema...");
        setTimeout(() => {
          router.push("/dialer");
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setErrorMsg("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("A confirmação de senha não confere.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: { needs_password_change: false }
      });

      if (updateErr) {
        setErrorMsg("Erro ao atualizar senha: " + updateErr.message);
        return;
      }

      setSuccessMsg("Senha atualizada com sucesso! Acessando a plataforma...");
      setTimeout(() => {
        router.push("/dialer");
      }, 700);
    } catch (err: any) {
      setErrorMsg("Erro ao trocar senha: " + (err.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg("Informe seu e-mail para receber o link de redefinição.");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const origin = typeof window !== "undefined" ? window.location.origin : "https://discadora-callcenter.vercel.app";
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/login?reset=true`
      });

      if (error) {
        // Mensagem uniforme para não confirmar existência
        setResetEmailSent(true);
        setSuccessMsg("Se o e-mail estiver cadastrado, as instruções de redefinição foram enviadas.");
      } else {
        setResetEmailSent(true);
        setSuccessMsg("E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.");
      }
    } catch (err: any) {
      setErrorMsg("Falha ao solicitar redefinição: " + (err.message || "Erro inesperado."));
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
        
        {/* Top Back Link */}
        <div className="mb-6 flex justify-between items-center text-xs">
          <Link
            href="/"
            className="text-slate-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors font-medium group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar ao site</span>
          </Link>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            {mode === "login" 
              ? "Acesso Operacional" 
              : mode === "forgot" 
              ? "Recuperação de Acesso" 
              : "Troca de Senha"}
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 text-white font-bold text-xl mb-4 shadow-lg shadow-blue-500/20">
            AK
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">A&K Soluções Financeiras</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            {mode === "login" 
              ? "Plataforma Segura de Call Center & CRM" 
              : mode === "forgot" 
              ? "Redefinição Segura de Senha" 
              : "Defina sua Nova Senha Pessoal"}
          </p>
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

        {mode === "login" && (
          /* Login Form */
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
                  placeholder="exemplo@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setMode("forgot");
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
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
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/20 disabled:opacity-60 cursor-pointer mt-2"
            >
              <span>{loading ? "Autenticando..." : "Entrar no Sistema"}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {mode === "force_change_password" && (
          /* Force Password Change Form */
          <form onSubmit={handleForceChangePassword} className="space-y-4">
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2 mb-2">
              <Key size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Para sua segurança, defina uma nova senha pessoal antes de acessar os módulos operacionais.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Nova Senha (Mínimo 8 caracteres)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Confirme a Nova Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 active:scale-98 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-600/20 disabled:opacity-60 cursor-pointer mt-2"
            >
              <span>{loading ? "Salvando..." : "Salvar Nova Senha e Entrar"}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {mode === "forgot" && (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed mb-2">
              Digite seu e-mail cadastrado. Enviaremos um link seguro para você definir uma nova senha.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                <input
                  type="email"
                  required
                  placeholder="exemplo@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || resetEmailSent}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-600/20 disabled:opacity-60 cursor-pointer mt-2"
            >
              <KeyRound size={15} />
              <span>{loading ? "Enviando link..." : resetEmailSent ? "Link Enviado" : "Enviar Link de Redefinição"}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setMode("login");
                }}
                className="text-xs text-slate-400 hover:text-white font-medium transition cursor-pointer"
              >
                Voltar para o Login
              </button>
            </div>
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
