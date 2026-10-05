"use client";

import React, { useEffect, useState } from "react";
import { Clock, Phone, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RetornosPage() {
  const [retornos, setRetornos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRetornos = async () => {
    try {
      const { data } = await supabase
        .from("retornos")
        .select("*, leads(nome, telefone, banco, margem_disponivel, produto)")
        .order("data_hora", { ascending: true });

      if (data) setRetornos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetornos();
    // Auto-refresh a cada 5 segundos para sincronização automática em tempo real
    const interval = setInterval(fetchRetornos, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConclude = async (id: string) => {
    await supabase.from("retornos").update({ concluido: true }).eq("id", id);
    fetchRetornos();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda de Retornos</h1>
          <p className="text-slate-500 text-xs mt-0.5">Sincronização em tempo real das chamadas agendadas pelo discador.</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sincronizando em tempo real</span>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-3">
          {retornos.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center shadow-xs">
              <Clock size={40} className="mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Nenhum retorno agendado no momento</h3>
              <p className="text-slate-500 text-xs mt-1">Ao tabular como "Retorno" no discador, a chamada aparecerá aqui automaticamente.</p>
            </div>
          ) : (
            retornos.map(r => {
              const lead = r.leads || {};
              const isConcluido = r.concluido;
              const formattedDate = new Date(r.data_hora).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
              });

              return (
                <div 
                  key={r.id} 
                  className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition ${
                    isConcluido ? "border-slate-200 bg-slate-50/60 opacity-60" : "border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                      isConcluido ? "bg-slate-200 text-slate-500" : "bg-amber-50 text-amber-600 border border-amber-200/60"
                    }`}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-900 text-sm">{lead.nome || `Lead #${r.lead_id}`}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isConcluido ? "bg-slate-200 text-slate-600" : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                          {isConcluido ? "Concluído" : "Pendente"}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Tel: <strong className="font-mono text-slate-700">{lead.telefone || "-"}</strong> • Banco: {lead.banco || "-"} • Margem: {lead.margem_disponivel || "-"}
                      </p>
                      {r.observacao && (
                        <p className="text-slate-600 text-xs mt-1.5 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                          "{r.observacao}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {formattedDate}
                    </span>

                    {!isConcluido && lead.telefone && (
                      <>
                        <a 
                          href={`tel:+55${String(lead.telefone).replace(/\D/g, "")}`}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-xs transition flex items-center justify-center"
                          title="Ligar pelo smartphone"
                        >
                          <Phone size={15} />
                        </a>
                        <button 
                          onClick={() => handleConclude(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                        >
                          <CheckCircle2 size={13} />
                          <span>Concluir</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
