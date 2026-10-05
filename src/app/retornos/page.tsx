"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, Phone, CheckCircle, RefreshCw, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RetornosPage() {
  const [retornos, setRetornos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRetornos = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("retornos")
        .select("*, leads(nome, telefone, banco, margem_disponivel)")
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
  }, []);

  const handleConclude = async (id: string) => {
    await supabase.from("retornos").update({ concluido: true }).eq("id", id);
    fetchRetornos();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f7f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda de Retornos</h1>
          <p className="text-slate-500 text-sm mt-1">Clientes tabulados para retorno com data e horário marcados.</p>
        </div>
        <button 
          onClick={fetchRetornos}
          className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Atualizar</span>
        </button>
      </header>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          {retornos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
              <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700">Nenhum retorno agendado</h3>
              <p className="text-slate-500 text-sm mt-1">Ao tabular uma chamada como "Retorno" no discador, ela aparecerá aqui automaticamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {retornos.map((r) => {
                const lead = r.leads || {};
                const isConcluido = r.concluido;
                const formattedDate = new Date(r.data_hora).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short"
                });

                return (
                  <div 
                    key={r.id} 
                    className={`bg-white border rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 transition ${
                      isConcluido ? "border-slate-200 opacity-60 bg-slate-50" : "border-amber-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        isConcluido ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700"
                      }`}>
                        <Clock size={24} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-slate-800 text-base">{lead.nome || `Lead #${r.lead_id}`}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isConcluido ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-800"
                          }`}>
                            {isConcluido ? "Concluído" : "Agendado"}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">
                          Telefone: <strong className="font-mono text-slate-700">{lead.telefone || "-"}</strong> • Banco: {lead.banco || "-"} • Margem: {lead.margem_disponivel || "-"}
                        </p>
                        <p className="text-slate-700 text-sm mt-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                          "{r.observacao || "Sem observações"}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                      <span className="text-sm font-bold text-slate-700 font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        {formattedDate}
                      </span>

                      {!isConcluido && lead.telefone && (
                        <>
                          <a 
                            href={`tel:+55${String(lead.telefone).replace(/\D/g, "")}`}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg shadow-sm transition flex items-center justify-center"
                            title="Discar no celular"
                          >
                            <Phone size={18} />
                          </a>
                          <button 
                            onClick={() => handleConclude(r.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm transition flex items-center space-x-1"
                          >
                            <CheckCircle size={14} />
                            <span>Concluir</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
