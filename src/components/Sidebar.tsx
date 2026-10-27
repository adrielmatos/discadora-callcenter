"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, PhoneCall, Kanban, FileText, 
  Settings, PhoneOff, Calendar,
  BarChart3, Target, Phone, MessageSquare, MessagesSquare, LogOut, Building2,
  ShieldCheck, Download, ChevronLeft, ChevronRight, CheckSquare, Shield
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email?: string; nome?: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaster, setIsMaster] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          email: user.email,
          nome: user.user_metadata?.nome || user.email?.split("@")[0] || "Adriel"
        });

        // Verificação de isolamento: Se pertencer a empresa cliente (não-matriz), restringe acesso
        try {
          const userEmpresaId = user.app_metadata?.empresa_id || user.user_metadata?.empresa_id;
          if (userEmpresaId) {
            const { data: emp } = await supabase
              .from("empresas")
              .select("interna, modulos_liberados")
              .eq("id", userEmpresaId)
              .maybeSingle();

            if (emp && emp.interna === false) {
              setIsMaster(false);
              setAllowedModules(
                emp.modulos_liberados && emp.modulos_liberados.length > 0
                  ? emp.modulos_liberados
                  : ["dialer", "conversas", "crm", "tasks", "retornos"]
              );
              return;
            }
          }
          setIsMaster(true);
        } catch {
          setIsMaster(true);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          email: session.user.email,
          nome: session.user.user_metadata?.nome || session.user.email?.split("@")[0] || "Adriel"
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Se estiver na tela de login, não renderiza a sidebar
  if (pathname === "/login") {
    return null;
  }

  const navGroups = [
    {
      title: "Operação Ativa",
      items: [
        { name: "Discador de Chamadas", path: "/dialer", icon: PhoneCall, highlight: true },
        { name: "Caixa WhatsApp (Chat)", path: "/conversas", icon: MessagesSquare },
        { name: "CRM & Esteira", path: "/leads", icon: Kanban },
        { name: "Tarefas & Follow-up", path: "/tasks", icon: CheckSquare },
        { name: "Agenda de Retornos", path: "/retornos", icon: Calendar },
      ]
    },
    {
      title: "Gestão & Métricas",
      items: [
        { name: "Painel da Dona / Master", path: "/", icon: LayoutDashboard },
        { name: "Painel Master (Multi-Tenant)", path: "/admin", icon: Shield },
        { name: "Empresas Assinantes (SaaS)", path: "/settings?tab=empresas", icon: Building2 },
        { name: "Resultados & Relatórios", path: "/resultados", icon: BarChart3 },
        { name: "Campanhas de Mailing", path: "/campanhas", icon: Target },
      ]
    },
    {
      title: "Canais & Inteligência",
      items: [
        { name: "Atendente IA 24h", path: "/omnichannel", icon: MessageSquare },
        { name: "Extensão WhatsApp (ZIP)", path: "/download-extensao", icon: ShieldCheck },
        { name: "Scripts de Atendimento", path: "/scripts", icon: FileText },
        { name: "Bloqueio Não Perturbe", path: "/dnd", icon: PhoneOff },
        { name: "Telefonia SIP", path: "/telefonia", icon: Phone },
        { name: "Configurações & Metas", path: "/settings", icon: Settings },
      ]
    }
  ];

  // Mapeamento de rotas para controle de módulos por empresa
  const routeModuleMap: Record<string, string> = {
    "/dialer": "dialer",
    "/conversas": "conversas",
    "/leads": "crm",
    "/tasks": "tasks",
    "/retornos": "retornos",
    "/campanhas": "campanhas",
    "/omnichannel": "omnichannel",
    "/download-extensao": "omnichannel",
    "/scripts": "scripts",
    "/dnd": "dnd",
    "/telefonia": "telefonia",
    "/resultados": "resultados"
  };

  // Rotas restritas exclusivas da Dona / Master (Bloqueadas para qualquer empresa cliente)
  const masterOnlyPaths = ["/", "/admin", "/settings?tab=empresas", "/settings"];

  const filteredNavGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Dono / Matriz tem acesso a 100% dos módulos e configurações
      if (isMaster) return true;

      // Empresas Clientes / Teste: NUNCA acessam as configurações de dono
      if (masterOnlyPaths.includes(item.path)) {
        return false;
      }

      // Se for um módulo gerenciável, verifica se foi liberado no teste
      const modId = routeModuleMap[item.path];
      if (modId) {
        return allowedModules.length === 0 || allowedModules.includes(modId);
      }

      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className={`${isCollapsed ? "w-16" : "w-64"} bg-[#0a0e17] border-r border-slate-800/80 flex flex-col h-screen text-slate-400 select-none transition-all duration-200 shrink-0`}>
      {/* Brand Header */}
      <div className={`h-16 flex items-center ${isCollapsed ? "justify-center px-2" : "justify-between px-6"} border-b border-slate-800/60 shrink-0`}>
        <Link href="/" title="Ir para o Painel Geral" className="flex items-center space-x-3 overflow-hidden group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-blue-600 group-hover:bg-blue-500 transition flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm shrink-0">
            AK
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-white group-hover:text-blue-400 transition font-bold text-sm tracking-tight leading-tight truncate">A&K Soluções</h1>
              <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase truncate">Call Center Pro</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
          title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User Status Card */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-slate-800/40 shrink-0">
          <div className="flex items-center space-x-3 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800/60">
            <div className="w-7 h-7 rounded-full bg-blue-600 border border-blue-500/40 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {(currentUser?.nome || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 font-semibold text-xs truncate">
                {currentUser?.nome || "Adriel (Dono)"}
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center space-x-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span className="truncate">Administrador • Online</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 custom-scrollbar">
        {filteredNavGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-0.5 truncate">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  title={item.name}
                  className={`flex items-center ${isCollapsed ? "justify-center px-0 py-2.5" : "space-x-3 px-3 py-2"} rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-xs font-bold" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <item.icon size={16} className={isActive ? "text-white shrink-0" : "text-slate-400 shrink-0"} />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Card de Download Rápido da Extensão */}
      <div className="px-2 py-2 border-t border-slate-800/60 shrink-0">
        <Link
          href="/download-extensao"
          title="Extensão WhatsApp Anti-Ban"
          className={`w-full bg-gradient-to-r from-emerald-950/80 to-slate-900 hover:from-emerald-900/90 hover:to-slate-800 text-white p-2 rounded-xl border border-emerald-500/40 flex items-center ${isCollapsed ? "justify-center" : "justify-between"} shadow-md transition group cursor-pointer`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
            {!isCollapsed && (
              <div className="text-left min-w-0">
                <span className="text-[11px] font-bold block leading-tight text-white truncate">Extensão WhatsApp</span>
                <span className="text-[9px] text-emerald-400 font-semibold block">Anti-Ban • Baixar ZIP</span>
              </div>
            )}
          </div>
          {!isCollapsed && <Download size={14} className="text-emerald-400 shrink-0 group-hover:translate-y-0.5 transition" />}
        </Link>
      </div>

      {/* Footer & Logout */}
      <div className="p-2 border-t border-slate-800/60 shrink-0 space-y-2">
        <button
          onClick={handleLogout}
          title="Sair da Conta"
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center space-x-2"} py-2 px-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/40 border border-slate-800/60 hover:border-rose-900/50 transition cursor-pointer`}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Sair da Conta</span>}
        </button>
        {!isCollapsed && (
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-medium">A&K Soluções Financeiras • v3.2</p>
          </div>
        )}
      </div>
    </aside>
  );
}
