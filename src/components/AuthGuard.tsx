"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PUBLIC_ROUTES = ["/", "/login", "/download-extensao", "/privacidade", "/termos"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(isPublicRoute ? true : null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");

  useEffect(() => {
    // Rotas públicas nunca são bloqueadas
    if (isPublicRoute) {
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;

    // 1. Verifica sessão ativa inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session) {
        // Obter empresa do usuário
        const empresaId = session.user.app_metadata?.empresa_id || session.user.user_metadata?.empresa_id;

        if (empresaId) {
          const { data: empresa, error } = await supabase
            .from("empresas")
            .select("status, data_fim_teste, created_at, interna")
            .eq("id", empresaId)
            .maybeSingle();

          if (error) {
            console.error("Erro ao validar empresa no AuthGuard:", error);
          } else if (empresa && !empresa.interna) {
            // Verificar suspensão
            if (empresa.status === "suspensa") {
              setIsBlocked(true);
              setBlockMessage("Esta conta foi suspensa temporariamente pela administração do sistema. Entre em contato com o suporte para reativar.");
              setIsAuthenticated(false);
              return;
            }

            // Verificar se o teste expirou
            if (empresa.status === "teste") {
              const fimTeste = empresa.data_fim_teste 
                ? new Date(empresa.data_fim_teste).getTime()
                : (new Date(empresa.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);

              if (Date.now() > fimTeste) {
                setIsBlocked(true);
                setBlockMessage("Seu período de testes gratuitos expirou. Escolha um plano para continuar utilizando todas as funcionalidades.");
                setIsAuthenticated(false);
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

    // 2. Ouve alterações de autenticação em tempo real
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

  // Se estiver em rota pública, renderiza direto sem travas
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Enquanto valida a sessão ou se estiver bloqueado
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">Acesso Interrompido</h2>
          <p className="text-xs text-rose-200/80 leading-relaxed mb-6">{blockMessage}</p>
          <div className="space-y-3">
            <a 
              href="https://wa.me/5571999191691?text=Olá,%20preciso%20de%20ajuda%20com%20meu%20plano%20na%20Discadora." 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/20"
            >
              Falar com Suporte Comercial
            </a>
            <button 
              onClick={() => {
                supabase.auth.signOut().then(() => router.push("/login"));
              }}
              className="block w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition border border-slate-800"
            >
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
