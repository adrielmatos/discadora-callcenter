"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, Search, Download, RefreshCw, Kanban, Table, 
  ArrowRight, CheckCircle2, PhoneOff, XCircle, AlertCircle, User, MessageSquare
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Lead {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  produto?: string;
  status?: string;
  etapa_crm?: string;
  ultima_tabulacao?: string;
}

export default function LeadsCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("id", { ascending: false }).limit(300);
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Helper para buscar valor em objeto com chaves flexíveis
  const findFieldValue = (row: Record<string, any>, candidateKeys: string[]): string => {
    const normalizedCandidates = candidateKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ""));
    for (const [key, val] of Object.entries(row)) {
      if (val === undefined || val === null || val === "") continue;
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalizedCandidates.includes(cleanKey)) {
        return String(val).trim();
      }
    }
    return "";
  };

  const KNOWN_BANKS = [
    { name: "Banco Pan", aliases: ["pan", "bancopan"] },
    { name: "Banco Safra", aliases: ["safra", "bancosafra"] },
    { name: "Banco BMG", aliases: ["bmg", "bancobmg"] },
    { name: "C6 Bank", aliases: ["c6", "c6bank"] },
    { name: "Itaú Consignado", aliases: ["itau", "itaú", "itauconsignado", "ole", "olé"] },
    { name: "Bradesco Promotora", aliases: ["bradesco"] },
    { name: "Santander", aliases: ["santander", "olens"] },
    { name: "Caixa Econômica", aliases: ["caixa", "cef"] },
    { name: "Banco Daycoval", aliases: ["daycoval"] },
    { name: "Facta Financeira", aliases: ["facta"] },
    { name: "Banco Inbursa", aliases: ["inbursa"] },
    { name: "Paraná Banco", aliases: ["parana", "paraná"] },
    { name: "Banco Mercantil", aliases: ["mercantil"] },
    { name: "Crefisa", aliases: ["crefisa"] },
    { name: "Banco do Brasil", aliases: ["bancodobrasil", "bb"] }
  ];

  const inferBank = (extractedVal: string, fileName: string): string => {
    if (extractedVal && extractedVal.toLowerCase() !== "não informado" && extractedVal.toLowerCase() !== "nao informado") {
      const lower = extractedVal.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = KNOWN_BANKS.find(b => b.aliases.some(a => lower.includes(a)));
      if (match) return match.name;
      return extractedVal;
    }
    const cleanFileName = fileName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchFile = KNOWN_BANKS.find(b => b.aliases.some(a => cleanFileName.includes(a)));
    if (matchFile) return matchFile.name;

    return "Banco Parceiro";
  };

  const inferProduct = (extractedVal: string, fileName: string): string => {
    const combined = `${extractedVal} ${fileName}`.toLowerCase();
    if (combined.includes("fgts") || combined.includes("aniversario") || combined.includes("aniversário")) {
      return "Saque FGTS";
    }
    if (combined.includes("bpc") || combined.includes("loas")) {
      return "INSS BPC / LOAS";
    }
    if (combined.includes("inss") || combined.includes("aposentad") || combined.includes("beneficiari") || combined.includes("beneficiário")) {
      return "Consignado INSS";
    }
    if (combined.includes("siape") || combined.includes("servidor") || combined.includes("federal")) {
      return "Consignado SIAPE";
    }
    if (combined.includes("porta") || combined.includes("portabilidade")) {
      return "Portabilidade";
    }
    if (combined.includes("refin") || combined.includes("refinanciamento")) {
      return "Refinanciamento";
    }
    if (combined.includes("rmc") || combined.includes("rcc") || combined.includes("cartao") || combined.includes("cartão")) {
      return "Cartão Benefício";
    }
    if (extractedVal && extractedVal.trim()) return extractedVal.trim();
    return "Crédito Consignado";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    let totalImported = 0;
    let allLeads: any[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: "array" });

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

          for (const row of rows) {
            const nome = findFieldValue(row, ["nome", "cliente", "titular", "name", "nomecliente", "nomedocliente", "razaosocial", "beneficiario"]) || "Sem Nome";
            const rawPhone = findFieldValue(row, ["telefone", "tel", "celular", "cel", "fone", "contato", "whatsapp", "numero", "telefone1", "tel1", "celular1", "telefoneprincipal"]);
            const cleanPhone = String(rawPhone || "").replace(/\D/g, "");
            if (cleanPhone.length < 8) continue;

            const rawCpf = findFieldValue(row, ["cpf", "documento", "doc", "cpfcnpj", "identificacao"]);
            const rawMargem = findFieldValue(row, ["margem", "margemdisponivel", "valor", "limite", "saldo", "valoremprestimo", "proposta", "credito"]);
            const rawBanco = findFieldValue(row, ["banco", "instituicao", "instituicaofinanceira", "bco", "convenio", "orgao", "entidade", "fonte", "bancocredor"]);
            const rawProduto = findFieldValue(row, ["produto", "operacao", "tipo", "modalidade", "segmento", "tabela"]);

            const finalBanco = inferBank(rawBanco, file.name);
            const finalProduto = inferProduct(rawProduto, file.name);

            allLeads.push({
              nome,
              telefone: cleanPhone,
              cpf: rawCpf || null,
              margem_disponivel: rawMargem ? (rawMargem.includes("R$") ? rawMargem : `R$ ${rawMargem}`) : "R$ 0,00",
              banco: finalBanco,
              produto: finalProduto,
              status: "pendente",
              etapa_crm: "fila"
            });
          }
        }
      } catch (err: any) {
        console.error(`Erro ao ler arquivo ${file.name}:`, err);
      }
    }

    if (allLeads.length === 0) {
      alert("Nenhum lead com telefone válido encontrado nas planilhas selecionadas.");
      setLoading(false);
      return;
    }

    // Inserção em lotes de 100
    const chunkSize = 100;
    for (let i = 0; i < allLeads.length; i += chunkSize) {
      const chunk = allLeads.slice(i, i + chunkSize);
      const { error } = await supabase.from("leads").insert(chunk);
      if (error) {
        console.error("Erro no lote:", error);
      } else {
        totalImported += chunk.length;
      }
    }

    alert(`Sucesso! ${totalImported} leads importados de ${fileArray.length} planilha(s)!`);
    fetchLeads();
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(leads);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CRM Leads");
    XLSX.writeFile(wb, `leads_crm_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const changeEtapa = async (leadId: number, nextEtapa: string) => {
    await supabase.from("leads").update({ etapa_crm: nextEtapa }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, etapa_crm: nextEtapa } : l));
  };

  const filteredLeads = leads.filter(l => 
    l.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.telefone.includes(searchTerm) || 
    (l.cpf && l.cpf.includes(searchTerm))
  );

  // Estágios do Pipeline correspondentes à Tabulação (sem Retorno que tem tela própria)
  const stages = [
    { id: "fila", label: "Fila de Espera", color: "border-slate-300" },
    { id: "Interessado", label: "Interessado", color: "border-blue-400" },
    { id: "Simulação", label: "Simulação", color: "border-cyan-400" },
    { id: "Proposta", label: "Proposta", color: "border-teal-400" },
    { id: "Contrato", label: "Contrato Fechado", color: "border-emerald-500" },
    { id: "Não atendeu", label: "Não Atendeu", color: "border-orange-400" },
    { id: "Não interessado", label: "Não Interessado", color: "border-rose-400" },
    { id: "Sem perfil", label: "Sem Perfil / Inválido", color: "border-slate-400" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">CRM & Funil de Tabulações</h1>
          <p className="text-slate-500 text-xs mt-0.5">Pipeline de negociação com todos os status de tabulação do discador.</p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${viewMode === "kanban" ? "bg-white shadow-xs text-blue-600" : "text-slate-500"}`}
            >
              <Kanban size={13} />
              <span>Funil de Tabulações</span>
            </button>
            <button 
              onClick={() => setViewMode("esteira")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${viewMode === "esteira" ? "bg-white shadow-xs text-emerald-600 font-bold" : "text-slate-500"}`}
            >
              <CheckCircle2 size={13} className={viewMode === "esteira" ? "text-emerald-600" : "text-slate-400"} />
              <span>Esteira de Contratos (Promosys)</span>
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition cursor-pointer ${viewMode === "table" ? "bg-white shadow-xs text-blue-600" : "text-slate-500"}`}
            >
              <Table size={13} />
              <span>Lista Geral</span>
            </button>
          </div>

          <button 
            onClick={fetchLeads}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            title="Recarregar"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg font-semibold text-xs transition"
          >
            <Download size={13} />
            <span>Exportar Excel</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition"
          >
            <Upload size={13} />
            <span>Importar Planilha</span>
          </button>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv, .txt, .ods" className="hidden" />
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-8 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, telefone ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredLeads.length} leads no sistema
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        {viewMode === "esteira" ? (
          /* Esteira Operacional de Contratos & Comissões (Promosys Style) */
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Cards de Resumo Financeiro da Esteira */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 shrink-0">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contratos na Esteira</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {filteredLeads.filter(l => (l.etapa_crm || "").includes("esteira_") || l.etapa_crm === "Contrato" || l.etapa_crm === "Proposta").length}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Kanban size={18} />
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Bruto em Esteira</span>
                  <span className="text-xl font-bold text-blue-600 mt-0.5 block">
                    R$ {(filteredLeads.filter(l => (l.etapa_crm || "").includes("esteira_") || l.etapa_crm === "Contrato").length * 4500).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  R$
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contratos Pagos / Averbados</span>
                  <span className="text-xl font-bold text-emerald-600 mt-0.5 block">
                    {filteredLeads.filter(l => l.etapa_crm === "esteira_pago" || l.etapa_crm === "esteira_comissao").length}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comissão Estimada A&K (11%)</span>
                  <span className="text-xl font-bold text-teal-600 mt-0.5 block">
                    R$ {(filteredLeads.filter(l => (l.etapa_crm || "").includes("esteira_") || l.etapa_crm === "Contrato").length * 4500 * 0.11).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  %
                </div>
              </div>
            </div>

            {/* Kanban da Esteira com Etapas Reais de Promotora */}
            <div className="flex-1 flex space-x-3.5 overflow-x-auto pb-4 custom-scrollbar">
              {[
                { id: "esteira_docs", label: "1. Coleta de Documentos", desc: "RG/CNH e dados bancários", color: "border-amber-400" },
                { id: "esteira_digitado", label: "2. Digitado no Banco", desc: "Cadastrado na esteira bancária", color: "border-blue-500" },
                { id: "esteira_biometria", label: "3. Aguardando CCB & Biometria", desc: "Link formalização no celular", color: "border-purple-500" },
                { id: "esteira_pago", label: "4. Averbado & Pago", desc: "Liberado na conta do cliente", color: "border-emerald-500" },
                { id: "esteira_comissao", label: "5. Comissão Faturada", desc: "Comissão recebida pela A&K", color: "border-teal-500" },
                { id: "esteira_pendencia", label: "6. Pendência Bancária", desc: "Exigência ou divergência", color: "border-rose-400" },
              ].map(st => {
                const stageLeads = filteredLeads.filter(l => {
                  if (st.id === "esteira_docs") {
                    return l.etapa_crm === "esteira_docs" || l.etapa_crm === "Contrato" || l.etapa_crm === "Proposta";
                  }
                  return l.etapa_crm === st.id;
                });

                return (
                  <div key={st.id} className="w-72 flex flex-col rounded-xl bg-slate-100/70 border border-slate-200 shrink-0 overflow-hidden">
                    <div className={`p-3 border-b border-slate-200/80 bg-white flex justify-between items-center ${st.color} border-t-2`}>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{st.label}</span>
                        <span className="text-[10px] text-slate-400">{st.desc}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="flex-1 p-2.5 overflow-y-auto space-y-2 custom-scrollbar">
                      {stageLeads.map(lead => (
                        <div key={lead.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition">
                          <div className="flex justify-between items-start">
                            <p className="font-bold text-xs text-slate-900 leading-snug truncate">{lead.nome}</p>
                            <span className="text-[10px] font-mono text-slate-400">#{lead.id}</span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-mono">{lead.telefone}</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {lead.banco || "Banco Parceiro"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 text-[10px]">{lead.produto || "Consignado"}</span>
                            <span className="text-emerald-700 font-extrabold">{lead.margem_disponivel || "R$ 0,00"}</span>
                          </div>

                          {/* Ações Rápidas de Esteira */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            {/* Botão de WhatsApp de Cobrança / Formalização */}
                            <a
                              href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                st.id === "esteira_docs" 
                                  ? `Olá, ${lead.nome}! Sou o Adriel da A&K Soluções. Para liberarmos sua proposta do ${lead.banco || "banco parceiro"}, falta apenas o envio do seu documento (RG ou CNH). Pode me mandar por aqui?`
                                  : st.id === "esteira_biometria"
                                  ? `Olá, ${lead.nome}! Seu contrato no ${lead.banco || "banco"} foi aprovado! Acabamos de te enviar o link de assinatura digital por SMS. Conseguiria confirmar a biometria para liberarmos o pagamento?`
                                  : `Olá, ${lead.nome}! Sou o Adriel da A&K Soluções. Estou acompanhando sua proposta no ${lead.banco || "banco"}. Podemos falar rapidinho?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
                            >
                              <MessageSquare size={11} />
                              <span>WhatsApp</span>
                            </a>

                            {/* Mover Etapa na Esteira */}
                            <div className="flex items-center space-x-1">
                              {st.id !== "esteira_pendencia" && (
                                <button
                                  type="button"
                                  onClick={() => changeEtapa(lead.id, "esteira_pendencia")}
                                  className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded text-[10px] font-semibold"
                                  title="Marcar pendência"
                                >
                                  Pendente
                                </button>
                              )}
                              {st.id !== "esteira_comissao" && (
                                <button 
                                  onClick={() => {
                                    const nextStages: Record<string, string> = {
                                      esteira_docs: "esteira_digitado",
                                      esteira_digitado: "esteira_biometria",
                                      esteira_biometria: "esteira_pago",
                                      esteira_pago: "esteira_comissao",
                                      esteira_pendencia: "esteira_docs"
                                    };
                                    changeEtapa(lead.id, nextStages[st.id] || "esteira_docs");
                                  }}
                                  className="text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded flex items-center space-x-0.5"
                                  title="Avançar etapa"
                                >
                                  <span>Avançar</span>
                                  <ArrowRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="py-8 text-center text-slate-400 text-xs">Nenhum contrato</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "kanban" ? (
          /* Visual Pipeline Kanban com todas as tabulações */
          <div className="flex-1 flex space-x-3.5 overflow-x-auto pb-4 custom-scrollbar">
            {stages.map(st => {
              const stageLeads = filteredLeads.filter(l => {
                const currentStage = l.etapa_crm || (l.status === "pendente" ? "fila" : l.ultima_tabulacao || "fila");
                return currentStage.toLowerCase() === st.id.toLowerCase() || 
                       (st.id === "Sem perfil" && (currentStage === "Sem perfil" || currentStage === "Número inválido"));
              });

              return (
                <div key={st.id} className="w-68 flex flex-col rounded-xl bg-slate-100/70 border border-slate-200 shrink-0 overflow-hidden">
                  <div className={`p-3 border-b border-slate-200/80 bg-white flex justify-between items-center ${st.color} border-t-2`}>
                    <span className="text-xs font-bold text-slate-800">{st.label}</span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="flex-1 p-2.5 overflow-y-auto space-y-2 custom-scrollbar">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-1.5 hover:border-slate-300 transition">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-slate-900 leading-snug truncate">{lead.nome}</p>
                          <span className="text-[10px] font-mono text-slate-400">#{lead.id}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono">{lead.telefone}</span>
                          <span className="text-emerald-700 font-extrabold">{lead.margem_disponivel || "-"}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[120px]">{lead.banco || "Banco N/I"}</span>
                          
                          {/* Mover Etapa */}
                          <div className="flex space-x-1">
                            {st.id !== "Contrato" && (
                              <button 
                                onClick={() => {
                                  const nextIdx = stages.findIndex(s => s.id === st.id) + 1;
                                  if (nextIdx < stages.length) changeEtapa(lead.id, stages[nextIdx].id);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-semibold p-1 hover:bg-blue-50 rounded"
                                title="Avançar etapa"
                              >
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="py-8 text-center text-slate-400 text-xs">Vazio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Nome</th>
                    <th className="px-6 py-3">Telefone</th>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3">Margem</th>
                    <th className="px-6 py-3">Banco</th>
                    <th className="px-6 py-3">Status / Tabulação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold text-slate-800">{l.nome}</td>
                      <td className="px-6 py-3 font-mono">{l.telefone}</td>
                      <td className="px-6 py-3">{l.produto || "Consignado"}</td>
                      <td className="px-6 py-3 text-emerald-600 font-bold">{l.margem_disponivel || "-"}</td>
                      <td className="px-6 py-3">{l.banco || "-"}</td>
                      <td className="px-6 py-3 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700">
                          {l.etapa_crm || (l.status === "pendente" ? "Fila" : l.ultima_tabulacao || "Finalizado")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
