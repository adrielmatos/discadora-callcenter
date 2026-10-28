"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PhoneCall,
  LayoutDashboard,
  Shield,
  FileSpreadsheet,
  Headphones,
  CheckCircle2,
  Calendar,
  Layers,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  MessageSquare,
  BarChart3,
  Building2,
  Flame,
  ArrowRight,
  TrendingUp,
  Workflow
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NavItem {
  name: string;
  path: string;
  icon: any;
  badge?: string;
  isNew?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isClientCompany, setIsClientCompany] = useState(false);
  const [companyAccess, setCompanyAccess] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser(user);
        const userEmpresaId = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
        if (userEmpresaId) {
          const { data: emp } = await supabase.from("empresas").select("interna, modulos_liberados").eq("id", userEmpresaId).maybeSingle();
          if (emp && emp.interna === false) {
            setIsClientCompany(true);
            if (emp.modulos_liberados && Array.isArray(emp.modulos_liberados)) {
              setCompanyAccess(emp.modulos_liberados);
            }
          }
        }
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Se for rota pública, não renderiza a sidebar
  const publicRoutes = ["/", "/login", "/download-extensao"];
  if (publicRoutes.includes(pathname)) {
    return null;
  }

  const navGroups: NavGroup[] = [
    {
      title: "Operação Ativa",
      items: [
        { name: "Painel da Dona / Master", path: "/dashboard", icon: LayoutDashboard },
        { name: "Discador Preditivo", path: "/dialer", icon: PhoneCall },
        { name: "Atendimento Omnichannel", path: "/omnichannel", icon: MessageSquare, badge: "WhatsApp" },
        { name: "Esteira de Contratos CRM", path: "/esteira", icon: Layers },
      ]
    },
    {
      title: "Gestão & Métricas",
      items: [
        { name: "Painel Master (Multi-Tenant)", path: "/admin", icon: Shield },
        { name: "Empresas Assinantes (SaaS)", path: "/settings?tab=empresas", icon: Building2 },
        { name: "Resultados & Relatórios", path: "/resultados", icon: BarChart3 },
        { name: "Base de Leads", path: "/leads", icon: FileSpreadsheet },
        { name: "Agenda de Retornos", path: "/retornos", icon: Calendar },
      ]
    },
    {
      title: "Inteligência & IA",
      items: [
        { name: "Automação URA Zap", path: "/automacoes", icon: Workflow, isNew: true },
        { name: "Atendente IA Sofia", path: "/sofia", icon: Bot, isNew: true },
      ]
    },
    {
      title: "Sistema & Suporte",
      items: [
        { name: "Configurações Gerais", path: "/settings", icon: Settings },
        { name: "Central de Ajuda", path: "/ajuda", icon: HelpCircle },
      ]
    }
  ];

  // Helper para mapear path para chave de módulo
  const getModuleKey = (path: string): string => {
    if (path.startsWith("/dialer")) return "dialer";
    if (path.startsWith("/leads")) return "leads";
    if (path.startsWith("/esteira")) return "esteira";
    if (path.startsWith("/omnichannel")) return "omnichannel";
    if (path.startsWith("/sofia")) return "sofia";
    if (path.startsWith("/automacoes")) return "automacoes";
    if (path.startsWith("/retornos")) return "retornos";
    if (path.startsWith("/resultados")) return "resultados";
    return "";
  };

  // Rotas restritas exclusivas da Dona / Master (Bloqueadas para qualquer empresa cliente)
  const masterOnlyPaths = ["/dashboard", "/admin", "/settings?tab=empresas", "/settings"];

  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // 1. Se for empresa cliente externa, nunca pode ver telas da Dona/Master
      if (isClientCompany && masterOnlyPaths.some(p => item.path.startsWith(p))) {
        return false;
      }

      // 2. Se for empresa cliente e tiver permissões específicas cadastradas pelo dono
      if (isClientCompany && companyAccess.length > 0) {
        const modKey = getModuleKey(item.path);
        // Se a rota tem uma chave de módulo mapeada, precisa estar na lista liberada
        if (modKey && !companyAccess.includes(modKey)) {
          return false;
        }
      }

      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`${isCollapsed ? "w-16" : "w-64"} bg-[#0a0e17] border-r border-slate-800/80 flex flex-col h-screen text-slate-400 select-none transition-all duration-200 shrink-0`}>
      {/* Brand Header */}
      <div className={`h-16 flex items-center ${isCollapsed ? "justify-center px-2" : "justify-between px-6"} border-b border-slate-800/60 shrink-0`}>
        <Link href="/dashboard" title="Ir para o Painel Geral" className="flex items-center space-x-3 overflow-hidden group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-blue-600 group-hover:bg-blue-500 transition flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm shrink-0">
            AK
          </div>
          {!isCollapsed && (
            <div className="flex flex-col leading-none">
              <span className="text-white font-extrabold text-sm tracking-tight group-hover:text-blue-400 transition">
                {isClientCompany ? "CallCenter Pro" : "A&K Soluções"}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-medium">
                {isClientCompany ? "Espaço do Cliente" : "Crédito Consignado"}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition md:flex hidden"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredNavGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center ${isCollapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"} rounded-xl text-xs font-semibold transition-colors group relative ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon size={17} className={`shrink-0 ${isActive ? "text-blue-500" : "text-slate-400 group-hover:text-slate-300"}`} />
                  
                  {!isCollapsed && (
                    <span className="ml-3 truncate">{item.name}</span>
                  )}

                  {!isCollapsed && item.badge && (
                    <span className="ml-auto text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}

                  {!isCollapsed && item.isNew && (
                    <span className="ml-auto text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                      <Sparkles size={8} />
                      <span>NOVO</span>
                    </span>
                  )}

                  {/* Active Indicator dot in collapsed mode */}
                  {isCollapsed && isActive && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} p-2 rounded-xl`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-bold text-white truncate">
                  {currentUser?.user_metadata?.nome || currentUser?.email?.split("@")[0] || "Administrador"}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {isClientCompany ? "Cliente Assinante" : "Dono da Plataforma"}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Sair do Sistema"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
