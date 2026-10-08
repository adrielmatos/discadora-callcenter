"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // A tela de login nunca é bloqueada
    if (pathname === "/login") {
      setIsAuthenticated(true);
      return;
    }

    let isMounted = true;

    // Checa sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        router.push("/login");
      }
    });

    // Escuta mudanças de sessão em tempo real (ex: logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session) {
        setIsAuthenticated(true);
      } else {
        if (pathname !== "/login") {
          setIsAuthenticated(false);
          router.push("/login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Se estiver na tela de login, renderiza direto
  if (pathname === "/login") {
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

  // Se não estiver autenticado, não renderiza nada enquanto redireciona
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
