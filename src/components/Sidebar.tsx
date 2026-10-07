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

  const navGroups = [
    {
      title: "Operação Ativa",
      items: [
        { name: "Discador de Chamadas", path: "/dialer", icon: PhoneCall, highlight: true },
        { name: "CRM & Esteira", path: "/leads", icon: Kanban },
        { name: "Agenda de Retornos", path: "/retornos", icon: Calendar },
      ]
    },
    {
      title: "Gestão & Métricas",
      items: [
        { name: "Visão Geral", path: "/", icon: LayoutDashboard },
        { name: "Resultados & Relatórios", path: "/resultados", icon: BarChart3 },
        { name: "Campanhas de Mailing", path: "/campanhas", icon: Target },
      ]
    },
    {
      title: "Canais & Inteligência",
      items: [
        { name: "Atendente IA 24h", path: "/omnichannel", icon: MessageSquare },
        { name: "Scripts de Atendimento", path: "/scripts", icon: FileText },
        { name: "Bloqueio Não Perturbe", path: "/dnd", icon: PhoneOff },
        { name: "Telefonia SIP", path: "/telefonia", icon: Phone },
        { name: "Configurações & Metas", path: "/settings", icon: Settings },
      ]
    }
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
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-semibold text-xs">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 font-semibold text-xs truncate">Adriel</p>
            <p className="text-[10px] text-emerald-400 flex items-center space-x-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="truncate">Operador • Online</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 custom-scrollbar">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-0.5">
              {group.title}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-xs font-bold" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <item.icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/60 text-center shrink-0">
        <p className="text-[11px] font-semibold text-slate-400">Plataforma de Crédito v3.2</p>
        <p className="text-[10px] text-slate-500">A&K Soluções Financeiras</p>
      </div>
    </aside>
  );
}
