"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  const isPublicRoute = pathname === "/login" || pathname === "/";

  useEffect(() => {
    // Rotas públicas (login e landing page /) nunca são bloqueadas
    if (isPublicRoute) {
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;

    // Checa sessão ativa e status da empresa
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        // Valida se a empresa do usuário não está suspensa ou bloqueada
        const user = session.user;
        const empresaId = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
        
        if (empresaId) {
          const { data: emp } = await supabase
            .from("empresas")
            .select("status, interna, trial_expira_em, razao_social")
            .eq("id", empresaId)
            .maybeSingle();

          if (emp && !emp.interna) {
            if (emp.status === "bloqueada" || emp.status === "pausada") {
              setIsBlocked(true);
              setBlockMessage(`O acesso da empresa "${emp.razao_social}" está temporariamente suspenso pela administração.`);
              setIsAuthenticated(true);
              return;
            }

            if (emp.status === "trial" && emp.trial_expira_em) {
              const expira = new Date(emp.trial_expira_em);
              if (expira.getTime() < Date.now()) {
                setIsBlocked(true);
                setBlockMessage(`O período de testes da sua empresa expirou em ${expira.toLocaleDateString("pt-BR")}. Contrate um plano para continuar.`);
                setIsAuthenticated(true);
                return;
              }
            }
          }
        }

        setIsAuthenticated(true);
      } else {
        if (!isPublicRoute) {
          setIsAuthenticated(false);
          router.push("/login");
        }
      }
    });

    // Escuta mudanças de sessão em tempo real (ex: logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session) {
        setIsAuthenticated(true);
      } else {
        if (!isPublicRoute) {
          setIsAuthenticated(false);
          router.push("/login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute]);

  // Se estiver em rota pública (login ou landing page /), renderiza direto
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Enquanto valida a sessão, exibe tela de carregamento profissional
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen w-full bg-[#070b14] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-base shadow-lg shadow-blue-500/20 mb-3 animate-pulse">
          AK
        </div>
        <p className="text-xs text-slate-400 font-semibold tracking-wide">
          A&K Soluções • Carregando ambiente seguro...
        </p>
      </div>
    );
  }

  // Tela de Bloqueio para Empresas Suspensas / Trial Expirado
  if (isBlocked) {
    return (
      <div className="min-h-screen w-full bg-[#070b14] flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-white mb-2">Acesso Temporariamente Suspenso</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {blockMessage || "O acesso desta conta está suspenso. Entre em contato com a administração da A&K Soluções para regularização."}
          </p>
          <div className="space-y-3">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderiza nada enquanto redireciona
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
