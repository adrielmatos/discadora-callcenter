"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, PhoneCall, Kanban, FileText, 
  Settings, PhoneOff, Calendar,
  BarChart3, Target, Phone, MessageSquare
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menu = [
    { name: "Visão Geral", path: "/", icon: LayoutDashboard },
    { name: "Discador de Chamadas", path: "/dialer", icon: PhoneCall },
    { name: "CRM & Esteira", path: "/leads", icon: Kanban },
    { name: "Resultados & Métricas", path: "/resultados", icon: BarChart3 },
    { name: "Campanhas", path: "/campanhas", icon: Target },
    { name: "Agenda de Retornos", path: "/retornos", icon: Calendar },
    { name: "Telefonia", path: "/telefonia", icon: Phone },
    { name: "Omnichannel & IA 24h", path: "/omnichannel", icon: MessageSquare },
    { name: "Não Perturbe (DND)", path: "/dnd", icon: PhoneOff },
    { name: "Scripts de Atendimento", path: "/scripts", icon: FileText },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0e17] border-r border-slate-800/80 flex flex-col h-screen text-slate-400 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-sm">
            AK
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight leading-tight">A&K Soluções</h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Call Center Pro</p>
          </div>
        </div>
      </div>

      {/* User Status Card */}
      <div className="px-4 py-3 border-b border-slate-800/40 shrink-0">
        <div className="flex items-center space-x-3 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800/60">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-semibold text-xs">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-slate-200 font-semibold text-xs truncate">Adriel</p>
            <p className="text-[10px] text-emerald-400 flex items-center space-x-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Administrador • Online</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 custom-scrollbar">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1.5">
          Operação
        </div>
        {menu.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
              }`}
            >
              <item.icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/60 text-center shrink-0">
        <p className="text-[11px] font-semibold text-slate-400">Plataforma de Crédito v3.2</p>
        <p className="text-[10px] text-slate-500">A&K Soluções Financeiras</p>
      </div>
    </aside>
  );
}
