import Link from "next/link";
import { ArrowLeft, PhoneCall, LayoutDashboard, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-full flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-2xl shadow-xs">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Página Não Encontrada</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            O endereço acessado não existe ou foi movido para outra rota do sistema A&K Soluções.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/dialer"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs transition"
          >
            <PhoneCall size={14} />
            <span>Voltar ao Discador de Chamadas</span>
          </Link>

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-2 transition"
          >
            <LayoutDashboard size={14} />
            <span>Acessar Painel Principal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
