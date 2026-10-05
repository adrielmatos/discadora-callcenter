"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, PhoneCall, Users, FileText, 
  Settings, PhoneOff, HeadphonesIcon, Calendar,
  BarChart2, Target, Phone, MessageCircle
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menu = [
    { name: "Visão Geral", path: "/", icon: LayoutDashboard },
    { name: "Discador Automático", path: "/dialer", icon: HeadphonesIcon },
    { name: "CRM & Leads", path: "/leads", icon: Users },
    { name: "Resultados (Relatórios)", path: "/resultados", icon: BarChart2 },
    { name: "Campanhas Ativas", path: "/campanhas", icon: Target },
    { name: "Agenda de Retornos", path: "/retornos", icon: Calendar },
    { name: "Telefonia (VoIP/PABX)", path: "/telefonia", icon: Phone },
    { name: "Omnichannel (WhatsApp)", path: "/omnichannel", icon: MessageCircle },
    { name: "Não Perturbe (DND)", path: "/dnd", icon: PhoneOff },
    { name: "Scripts de Ligação", path: "/scripts", icon: FileText },
    { name: "Configurações", path: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0a0f1c] border-r border-slate-800 flex flex-col h-screen text-slate-300">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <HeadphonesIcon size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-wide">AK<span className="text-blue-500">Cloud</span></span>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold shadow-lg">
            A
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-white font-semibold text-sm truncate">Adriel</p>
            <p className="text-xs text-green-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              <span>Online (Proprietário)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Menu Principal</div>
        {menu.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              }`}
            >
              <item.icon size={18} className={isActive ? "text-white" : "text-slate-500"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-center shrink-0">
        <p className="text-xs text-slate-500">A&K Soluções Financeiras</p>
        <p className="text-[10px] text-slate-600 mt-1">Enterprise Dialer v3.0</p>
      </div>
    </aside>
  );
}
