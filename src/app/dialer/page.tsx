"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  PhoneCall, PhoneOff, Check, X, Calendar, MessageSquare, 
  Play, FastForward, User, AlertCircle, Calculator,
  Clock, ShieldAlert, Sparkles, Building2, Tag, ChevronDown, CheckCircle2, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const OBJECTION_LIST = [
  {
    id: "golpe",
    label: "🛡️ É Golpe?",
    resposta: "Compreendo perfeitamente o receio, [NOME], e o senhor está certíssimo em ter cuidado. Nós nunca pedimos senha nem adiantamento em dinheiro. A autorização é feita diretamente no aplicativo oficial do banco ou Meu INSS com biometria facial no seu celular. O valor entra direto na sua conta do [BANCO]. Posso te mandar o passo a passo seguro pelo WhatsApp?"
  },
  {
    id: "sem_margem",
    label: "💰 Sem Margem / Já Fiz",
    resposta: "Excelente que já possui contrato ativo, [NOME]! É justamente por isso que liguei. Conseguimos fazer a Portabilidade com Troco: reduzimos a taxa do seu banco antigo e liberamos um troco de até R$ 2.500,00 na sua conta sem aumentar a parcela que o senhor já paga todo mês. Gostaria de ver quanto sobra de troco?"
  },
  {
    id: "juros",
    label: "📉 Juros Altos",
    resposta: "Entendo sua preocupação com juros, [NOME]. Mas veja: o consignado e FGTS têm a menor taxa do país (cerca de 1,6% a 1,8% ao mês), enquanto cartão de crédito e cheque especial passam de 14% ao mês. Usar esse limite para quitar dívidas caras ou economizar é a melhor decisão financeira. Vamos fazer uma simulação sem compromisso?"
  },
  {
    id: "familia",
    label: "🤔 Falar com Família",
    resposta: "Com certeza, [NOME], conversar com a família é muito importante. O que posso fazer para te ajudar é gerar a pré-análise formal agora e te mandar no WhatsApp. Assim você senta com eles, confere os números exatos e valores liberados no [BANCO]. Pode ser?"
  },
  {
    id: "sem_interesse",
    label: "❌ Sem Interesse",
    resposta: "Entendo perfeitamente, [NOME]! Mas me tira uma dúvida rápida: se hoje liberasse uma margem de [VALOR] com uma parcela que cabe no seu bolso para você guardar ou realizar algum projeto, você deixaria passar essa condição ou gostaria ao menos de saber os números exatos sem compromisso nenhum?"
  },
  {
    id: "agencia",
    label: "🏦 Prefiro na Agência",
    resposta: "Compreendo, [NOME]. Mas a agência física costuma ter filas e taxas de balcão mais altas. Pelo nosso canal de correspondente bancário digital, a taxa é de esteira nacional reduzida e o dinheiro entra na sua conta hoje mesmo sem você precisar sair de casa. Vamos dar uma olhada na simulação?"
  }
];

const DDD_REGIONS: Record<string, { uf: string, regiao: string }> = {
  "11": { uf: "SP", regiao: "São Paulo / Capital" },
  "12": { uf: "SP", regiao: "Vale do Paraíba" },
  "13": { uf: "SP", regiao: "Baixada Santista" },
  "14": { uf: "SP", regiao: "Bauru / Marília" },
  "15": { uf: "SP", regiao: "Sorocaba" },
  "16": { uf: "SP", regiao: "Ribeirão Preto" },
  "17": { uf: "SP", regiao: "São José do Rio Preto" },
  "18": { uf: "SP", regiao: "Presidente Prudente" },
  "19": { uf: "SP", regiao: "Campinas" },
  "21": { uf: "RJ", regiao: "Rio de Janeiro / Capital" },
  "22": { uf: "RJ", regiao: "Região dos Lagos / Norte Fluminense" },
  "24": { uf: "RJ", regiao: "Petrópolis / Volta Redonda" },
  "27": { uf: "ES", regiao: "Vitória / Vila Velha" },
  "28": { uf: "ES", regiao: "Cachoeiro de Itapemirim" },
  "31": { uf: "MG", regiao: "Belo Horizonte e Região" },
  "32": { uf: "MG", regiao: "Juiz de Fora" },
  "33": { uf: "MG", regiao: "Governador Valadares" },
  "34": { uf: "MG", regiao: "Uberlândia / Triângulo Mineiro" },
  "35": { uf: "MG", regiao: "Poços de Caldas / Sul de Minas" },
  "37": { uf: "MG", regiao: "Divinópolis" },
  "38": { uf: "MG", regiao: "Montes Claros" },
  "41": { uf: "PR", regiao: "Curitiba e Região Metropolitana" },
  "42": { uf: "PR", regiao: "Ponta Grossa" },
  "43": { uf: "PR", regiao: "Londrina" },
  "44": { uf: "PR", regiao: "Maringá" },
  "45": { uf: "PR", regiao: "Foz do Iguaçu / Cascavel" },
  "46": { uf: "PR", regiao: "Francisco Beltrão" },
  "47": { uf: "SC", regiao: "Joinville / Blumenau / Itajaí" },
  "48": { uf: "SC", regiao: "Florianópolis" },
  "49": { uf: "SC", regiao: "Chapecó / Oeste Catarinense" },
  "51": { uf: "RS", regiao: "Porto Alegre" },
  "53": { uf: "RS", regiao: "Pelotas / Rio Grande" },
  "54": { uf: "RS", regiao: "Caxias do Sul / Serra Gaúcha" },
  "55": { uf: "RS", regiao: "Santa Maria" },
  "61": { uf: "DF", regiao: "Brasília / Distrito Federal" },
  "62": { uf: "GO", regiao: "Goiânia" },
  "63": { uf: "TO", regiao: "Palmas / Tocantins" },
  "64": { uf: "GO", regiao: "Rio Verde" },
  "65": { uf: "MT", regiao: "Cuiabá" },
  "66": { uf: "MT", regiao: "Rondonópolis" },
  "67": { uf: "MS", regiao: "Campo Grande" },
  "68": { uf: "AC", regiao: "Rio Branco / Acre" },
  "69": { uf: "RO", regiao: "Porto Velho / Rondônia" },
  "71": { uf: "BA", regiao: "Salvador e Região" },
  "73": { uf: "BA", regiao: "Ilhéus / Itabuna" },
  "74": { uf: "BA", regiao: "Juazeiro" },
  "75": { uf: "BA", regiao: "Feira de Santana" },
  "77": { uf: "BA", regiao: "Vitória da Conquista" },
  "79": { uf: "SE", regiao: "Aracaju / Sergipe" },
  "81": { uf: "PE", regiao: "Recife e Região Metropolitana" },
  "82": { uf: "AL", regiao: "Maceió / Alagoas" },
  "83": { uf: "PB", regiao: "João Pessoa / Paraíba" },
  "84": { uf: "RN", regiao: "Natal / Rio Grande do Norte" },
  "85": { uf: "CE", regiao: "Fortaleza e Região" },
  "86": { uf: "PI", regiao: "Teresina / Piauí" },
  "87": { uf: "PE", regiao: "Petrolina" },
  "88": { uf: "CE", regiao: "Juazeiro do Norte" },
  "89": { uf: "PI", regiao: "Picos" },
  "91": { uf: "PA", regiao: "Belém / Pará" },
  "92": { uf: "AM", regiao: "Manaus / Amazonas" },
  "93": { uf: "PA", regiao: "Santarém" },
  "94": { uf: "PA", regiao: "Marabá" },
  "95": { uf: "RR", regiao: "Boa Vista / Roraima" },
  "96": { uf: "AP", regiao: "Macapá / Amapá" },
  "97": { uf: "AM", regiao: "Interior do Amazonas" },
  "98": { uf: "MA", regiao: "São Luís / Maranhão" },
  "99": { uf: "MA", regiao: "Imperatriz / Maranhão" }
};

const formatPhone = (phone?: string) => {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
};

const getRegionInfo = (phone?: string) => {
  if (!phone) return { ddd: "XX", uf: "BR", regiao: "Nacional" };
  const clean = phone.replace(/\D/g, "");
  const ddd = clean.length >= 10 ? clean.slice(0, 2) : "";
  return {
    ddd: ddd || "XX",
    uf: DDD_REGIONS[ddd]?.uf || "BR",
    regiao: DDD_REGIONS[ddd]?.regiao || "Região Nacional"
  };
};

interface Lead {
  id: number;
  nome: string;
  telefone: string;
  cpf?: string;
  margem_disponivel?: string;
  banco?: string;
  produto?: string;
  cidade?: string;
  uf?: string;
  status?: string;
}

export default function DialerWorkspace() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "wrapup">("idle");
  const [duration, setDuration] = useState(0);
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [selectedScriptProduct, setSelectedScriptProduct] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  
  // Power Dialing Auto-Next countdown
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);

  // Modal Agendamento Retorno
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  // DND Bloqueados (Não Perturbe)
  const [dndBlockedSet, setDndBlockedSet] = useState<Set<string>>(new Set());

  // Calculadora Multi-Produto (Vanguard)
  const [showCalc, setShowCalc] = useState(false);
  const [calcTab, setCalcTab] = useState<"fgts" | "portabilidade" | "margem">("fgts");
  const [calcSaldo, setCalcSaldo] = useState(2500);
  const [calcParcela, setCalcParcela] = useState(380);
  const [calcMargem, setCalcMargem] = useState(150);

  // Quebra de Objeções Ativa
  const [activeObjection, setActiveObjection] = useState<string | null>(null);

  const activeLead = leadsList[currentLeadIndex];

  // Checagem DND em tempo real
  const cleanActivePhone = activeLead?.telefone?.replace(/\D/g, "") || "";
  const cleanActiveCpf = activeLead?.cpf?.replace(/\D/g, "") || "";
  const isDndBlocked = Boolean((cleanActivePhone && dndBlockedSet.has(cleanActivePhone)) || (cleanActiveCpf && dndBlockedSet.has(cleanActiveCpf)));

  // Diagnóstico Inteligente com IA (Viver de IA)
  const getLeadDiagnosis = (lead?: Lead) => {
    if (!lead) return "";
    const prod = (lead.produto || "").toLowerCase();
    const bco = lead.banco && lead.banco !== "Não informado" ? lead.banco : "Banco Parceiro";
    
    if (prod.includes("fgts")) {
      return `Saldo pré-aprovado para antecipação do Saque-Aniversário no ${bco}. Liberação via PIX em até 2 horas.`;
    }
    if (prod.includes("porta") || prod.includes("refin")) {
      return `Oportunidade de Portabilidade com Troco no ${bco}. Redução de taxa liberando troco em dinheiro sem alterar a parcela.`;
    }
    if (prod.includes("inss") || prod.includes("bpc") || prod.includes("loas")) {
      return `Beneficiário elegível a Crédito Consignado pelo ${bco} com taxas reduzidas oficiais e desconto direto em folha.`;
    }
    if (prod.includes("siape") || prod.includes("servidor")) {
      return `Servidor público com margem consignável estendida no ${bco}. Menor taxa de juros do mercado nacional.`;
    }
    return `Lead qualificado com oportunidade de crédito consignado facilitado no ${bco}. Sem consulta ao SPC/Serasa.`;
  };

  // Carrega fila de leads com filtro de produto
  const fetchQueue = async (filter = productFilter) => {
    let query = supabase
      .from("leads")
      .select("*")
      .eq("status", "pendente")
      .order("id", { ascending: true });

    if (filter === "fgts") {
      query = query.ilike("produto", "%fgts%");
    } else if (filter === "inss") {
      query = query.or("produto.ilike.%inss%,produto.ilike.%bpc%,produto.ilike.%loas%");
    } else if (filter === "consignado") {
      query = query.ilike("produto", "%consignado%");
    }

    const { data } = await query.limit(150);
    if (data) {
      setLeadsList(data);
      setCurrentLeadIndex(0);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setProductFilter(newFilter);
    fetchQueue(newFilter);
  };

  // Carrega scripts
  const fetchScripts = async () => {
    const { data } = await supabase.from("scripts_ligacao").select("*").order("id", { ascending: true });
    if (data) setScriptsList(data);
  };

  // Carrega contatos do Não Perturbe (DND)
  const fetchDnd = async () => {
    try {
      const { data } = await supabase.from("lista_nao_perturbe").select("telefone, cpf").eq("ativo", true);
      if (data) {
        const blocked = new Set<string>();
        data.forEach((item: any) => {
          if (item.telefone) blocked.add(item.telefone.replace(/\D/g, ""));
          if (item.cpf) blocked.add(item.cpf.replace(/\D/g, ""));
        });
        setDndBlockedSet(blocked);
      }
    } catch (e) {
      console.error("Erro ao carregar DND:", e);
    }
  };

  useEffect(() => {
    fetchQueue("all");
    fetchScripts();
    fetchDnd();
  }, []);

  // Seleciona script automaticamente quando o lead muda com mapeamento inteligente
  useEffect(() => {
    if (!activeLead || scriptsList.length === 0) return;
    
    const leadProduct = (activeLead.produto || "").toLowerCase().trim();
    const leadBank = (activeLead.banco || "").toLowerCase().trim();

    let match = null;
    if (leadProduct.includes("bpc") || leadProduct.includes("loas")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("bpc") || s.produto.toLowerCase().includes("loas")) ||
              scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    } else if (leadProduct.includes("inss")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    } else if (leadProduct.includes("fgts")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("fgts"));
    } else if (leadProduct.includes("porta") || leadProduct.includes("portabilidade")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("portabilidade"));
    } else if (leadProduct.includes("refin")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("refinanciamento"));
    } else if (leadProduct.includes("siape") || leadProduct.includes("servidor")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("siape") || s.produto.toLowerCase().includes("servidor"));
    } else if (leadProduct.includes("rmc") || leadProduct.includes("rcc") || leadProduct.includes("cartão")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("rmc") || s.produto.toLowerCase().includes("cartão"));
    } else if (leadProduct.includes("consignado")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("consignado geral") || s.produto.toLowerCase().includes("consignado"));
    }

    if (!match && leadProduct) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes(leadProduct) || leadProduct.includes(s.produto.toLowerCase()));
    }

    if (!match && leadBank && leadBank !== "não informado") {
      match = scriptsList.find(s => s.produto.toLowerCase().includes(leadBank));
    }

    if (match) {
      setSelectedScriptProduct(match.produto);
    } else {
      const padrao = scriptsList.find(s => 
        s.produto.toLowerCase().includes("padrão") || 
        s.produto.toLowerCase().includes("geral") || 
        s.produto.toLowerCase().includes("mestre")
      );
      setSelectedScriptProduct(padrao ? padrao.produto : (scriptsList[0]?.produto || ""));
    }
  }, [activeLead, scriptsList]);

  // Timer de chamada
  useEffect(() => {
    let interval: any;
    if (callStatus === "talking") {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Contagem regressiva do Power Dialer
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown > 0) {
      const t = setTimeout(() => setAutoNextCountdown(c => (c !== null ? c - 1 : null)), 1000);
      return () => clearTimeout(t);
    } else {
      setAutoNextCountdown(null);
      triggerCall();
    }
  }, [autoNextCountdown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const triggerCall = () => {
    if (!activeLead) return;
    const cleanNumber = activeLead.telefone.replace(/\D/g, "");
    window.location.href = `tel:+55${cleanNumber}`;
    setCallStatus("calling");
    setTimeout(() => setCallStatus("talking"), 2000);
  };

  const handleStartCall = () => {
    if (isDndBlocked) {
      const confirmCall = window.confirm("⚠️ ATENÇÃO: Este contato está cadastrado no Não Perturbe (DND / Blacklist).\n\nDeseja realmente realizar esta ligação?");
      if (!confirmCall) return;
    }
    setAutoNextCountdown(null);
    triggerCall();
  };

  const handleEndCall = () => {
    setCallStatus("wrapup");
  };

  const handleDisposition = async (status: string) => {
    if (!activeLead?.id) return;

    if (status === "Retorno") {
      setShowScheduleModal(true);
      return;
    }

    await saveCallRecord(status);
  };

  const saveCallRecord = async (status: string, notes?: string) => {
    if (!activeLead?.id) return;

    await supabase.from("historico_ligacoes").insert({
      lead_id: activeLead.id,
      tabulacao: status,
      duracao_segundos: duration
    });

    // Mapeamento para o CRM Pipeline
    let etapaCrm = "finalizado";
    if (status === "Contrato") etapaCrm = "contrato";
    else if (status === "Proposta") etapaCrm = "proposta";
    else if (status === "Simulação") etapaCrm = "simulacao";
    else if (status === "Interessado") etapaCrm = "contato";

    await supabase.from("leads").update({ 
      status: "finalizado",
      etapa_crm: etapaCrm,
      ultima_tabulacao: status,
      tentativas: 1
    }).eq("id", activeLead.id);

    handleNextLead();
  };

  const handleNextLead = () => {
    setCallStatus("idle");
    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(curr => curr + 1);
      if (isPowerDialing) {
        setAutoNextCountdown(2);
      }
    } else {
      fetchQueue();
    }
  };

  const handleQualifySdr = async () => {
    if (!activeLead) return;

    await supabase.from("leads").update({ 
      etapa_crm: "esteira_docs", 
      status: "qualificado",
      ultima_tabulacao: "Qualificado SDR" 
    }).eq("id", activeLead.id);

    await supabase.from("historico_ligacoes").insert({
      lead_id: activeLead.id,
      tabulacao: "Qualificado SDR",
      duracao_segundos: duration
    });

    // Abre WhatsApp formal com proposta pré-formatada
    const cleanNumber = activeLead.telefone.replace(/\D/g, "");
    const rawMargem = (activeLead.margem_disponivel || "").trim();
    const isMargemZero = !rawMargem || rawMargem === "R$ 0,00" || rawMargem === "0";
    const valorMsg = isMargemZero ? "condição especial aprovada" : `margem liberada de ${rawMargem}`;
    const msg = `Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. Sua simulação de crédito pelo ${activeLead.banco || "banco parceiro"} com ${valorMsg} foi qualificada com sucesso! Para darmos andamento na liberação direta na sua conta, pode me enviar uma foto do seu documento (RG ou CNH)?`;
    window.open(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(msg)}`, "_blank");

    handleNextLead();
  };

  const confirmScheduleReturn = async () => {
    if (!activeLead?.id || !scheduleDate) {
      alert("Por favor selecione a data do retorno.");
      return;
    }

    const fullDate = `${scheduleDate}T${scheduleTime || "10:00"}:00`;

    await supabase.from("retornos").insert({
      lead_id: activeLead.id,
      data_hora: new Date(fullDate).toISOString(),
      observacao: scheduleNotes || "Retorno agendado pelo operador",
      concluido: false
    });

    await supabase.from("leads").update({ etapa_crm: "retorno" }).eq("id", activeLead.id);

    setShowScheduleModal(false);
    await saveCallRecord("Retorno", scheduleNotes);
    setScheduleNotes("");
  };

  const handleWhatsApp = () => {
    if (!activeLead) return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const rawMargem = (activeLead.margem_disponivel || "").trim();
    const isMargemZero = !rawMargem || rawMargem === "R$ 0,00" || rawMargem === "0";
    const valorMsg = isMargemZero ? "condição especial aprovada" : `limite liberado de ${rawMargem}`;
    const text = encodeURIComponent(
      `Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. Conforme conversamos, segue a simulação referente à sua ${valorMsg} pelo banco ${activeLead.banco || "parceiro"}. Ficou com alguma dúvida nas condições?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  // Encontra script ativo
  const currentScript = scriptsList.find(s => s.produto === selectedScriptProduct) || scriptsList[0] || {
    abertura: "Olá, [NOME], tudo bem? Aqui é o Adriel da A&K Soluções Financeiras.",
    motivo: "Estou em contato sobre as condições aprovadas no [BANCO].",
    qualificacao: "Gostaria de conhecer os valores?",
    fechamento: "Posso enviar a simulação do seu saldo liberado pelo WhatsApp?"
  };

  const renderScriptText = (text: string) => {
    if (!text) return "";
    const bancoRaw = activeLead?.banco;
    const bancoValido = bancoRaw && bancoRaw !== "Não informado" && bancoRaw.trim() !== "";
    const bancoNome = bancoValido ? bancoRaw : "bancos parceiros conveniados";
    const rawMargem = (activeLead?.margem_disponivel || "").trim();
    const isMargemZero = !rawMargem || rawMargem === "R$ 0,00" || rawMargem === "0" || rawMargem === "R$ 0";
    const valorTexto = isMargemZero ? "valores liberados" : rawMargem;

    return text
      .replaceAll("no Não informado", `no ${bancoNome}`)
      .replaceAll("no banco Não informado", `no ${bancoNome}`)
      .replaceAll("[BANCO]", bancoNome)
      .replaceAll("[NOME]", activeLead?.nome || "cliente")
      .replaceAll("seus [VALOR]", isMargemZero ? "do seu saldo liberado" : `dos seus ${rawMargem}`)
      .replaceAll("dos seus [VALOR]", isMargemZero ? "do seu saldo liberado" : `dos seus ${rawMargem}`)
      .replaceAll("[VALOR]", valorTexto);
  };

  if (!activeLead && leadsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-10 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Fila Finalizada!</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">Todos os leads pendentes foram tabulados.</p>
          <button onClick={() => fetchQueue("all")} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
            Recarregar Fila
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      {/* Sub-Header / Workspace Bar */}
      <header className="min-h-14 py-2.5 px-4 lg:px-6 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fila:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button 
                onClick={() => handleFilterChange("all")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "all" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Todos ({leadsList.length - currentLeadIndex})
              </button>
              <button 
                onClick={() => handleFilterChange("inss")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "inss" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                INSS & BPC
              </button>
              <button 
                onClick={() => handleFilterChange("fgts")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "fgts" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                FGTS
              </button>
              <button 
                onClick={() => handleFilterChange("consignado")} 
                className={`px-2.5 py-1 rounded-md transition ${productFilter === "consignado" ? "bg-white text-blue-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Consignado
              </button>
            </div>
          </div>

          {autoNextCountdown !== null && (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-0.5 rounded-md text-xs font-bold animate-pulse flex items-center space-x-1">
              <span>Discando próximo em {autoNextCountdown}s...</span>
            </span>
          )}
        </div>

        {/* Dialing Modes & Tools */}
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={() => setShowCalc(!showCalc)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              showCalc ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Calculator size={14} />
            <span>Simulador Rápido</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button 
              onClick={() => { setIsPowerDialing(false); setAutoNextCountdown(null); }}
              className={`px-3 py-1 rounded-md font-semibold transition ${!isPowerDialing ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              Manual
            </button>
            <button 
              onClick={() => setIsPowerDialing(true)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-semibold transition ${isPowerDialing ? "bg-white shadow-xs text-blue-600" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Play size={10} />
              <span>Auto-Pular (Power)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Responsivo Mobile e Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* Left / Center: Lead Profile + Dynamic Script */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto space-y-4 lg:space-y-5">
          
          {/* Ficha Minimalista do Cliente com Diagnóstico */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            {/* Oportunidade Identificada pelo Sistema */}
            <div className="mb-4 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Sparkles size={14} className="text-blue-600 shrink-0" />
                <span className="text-slate-700">
                  <strong className="text-slate-900 font-bold">Oportunidade Identificada:</strong> {getLeadDiagnosis(activeLead)}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 shrink-0">
                Alta Conversão
              </span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-base border border-slate-200/60">
                  {activeLead?.nome.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeLead?.nome}</h2>
                  <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-mono">{activeLead?.cpf || "CPF Indisponível"}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <Building2 size={12} className="text-blue-600" />
                      <span>{activeLead?.banco || "Banco Parceiro"}</span>
                    </span>
                    <span>•</span>
                    <button 
                      onClick={handleWhatsApp}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                    >
                      <MessageSquare size={11} />
                      <span>Enviar WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200/60 min-w-[160px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margem / Limite</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{activeLead?.margem_disponivel || "R$ 0,00"}</span>
              </div>
            </div>

            {/* Simulador Expansível Multi-Produto (Vanguard Style) */}
            {showCalc && (
              <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 p-4 rounded-xl text-xs space-y-3">
                {/* Abas da Calculadora */}
                <div className="flex space-x-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setCalcTab("fgts")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                      calcTab === "fgts" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Saque FGTS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcTab("portabilidade")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                      calcTab === "portabilidade" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Portabilidade c/ Troco
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcTab("margem")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                      calcTab === "margem" ? "bg-blue-600 text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Novo Consignado (Margem)
                  </button>
                </div>

                {/* Conteúdo Aba FGTS */}
                {calcTab === "fgts" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-700">
                      <span>Saldo FGTS do Cliente:</span>
                      <span className="font-mono text-blue-600 font-bold">R$ {calcSaldo.toLocaleString('pt-BR')}</span>
                    </div>
                    <input 
                      type="range" 
                      min="500" 
                      max="30000" 
                      step="500" 
                      value={calcSaldo} 
                      onChange={e => setCalcSaldo(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-slate-500 pt-1">
                      <span>Mínimo: R$ 500</span>
                      <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                        <span className="text-[11px] text-emerald-700 font-bold">Liberado na Conta: </span>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          R$ {(calcSaldo * 0.65).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <span>Máximo: R$ 30.000</span>
                    </div>
                  </div>
                )}

                {/* Conteúdo Aba Portabilidade (Vanguard) */}
                {calcTab === "portabilidade" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-700">
                      <span>Valor da Parcela Atual que o cliente paga:</span>
                      <span className="font-mono text-blue-600 font-bold">R$ {calcParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <input 
                      type="range" 
                      min="80" 
                      max="2000" 
                      step="20" 
                      value={calcParcela} 
                      onChange={e => setCalcParcela(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Opção 1: Redução da Parcela</span>
                        <span className="text-xs font-semibold text-slate-600">Cai de R$ {calcParcela.toFixed(2)} para</span>
                        <p className="text-sm font-bold text-blue-600">R$ {(calcParcela * 0.78).toFixed(2)}/mês</p>
                        <span className="text-[10px] text-emerald-600 font-medium">Economia de R$ {(calcParcela * 0.22).toFixed(2)} por mês</span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase block">Opção 2: Troco em Dinheiro</span>
                        <span className="text-xs font-semibold text-emerald-800">Mantém a mesma parcela e libera:</span>
                        <p className="text-sm font-extrabold text-emerald-700">R$ {(calcParcela * 8.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className="text-[10px] text-emerald-600 font-medium">Dinheiro direto na conta do cliente</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo Aba Margem Livre */}
                {calcTab === "margem" && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center font-bold text-slate-700">
                      <span>Margem Consignável Disponível (R$):</span>
                      <span className="font-mono text-blue-600 font-bold">R$ {calcMargem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <input 
                      type="range" 
                      min="30" 
                      max="1500" 
                      step="10" 
                      value={calcMargem} 
                      onChange={e => setCalcMargem(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between items-center text-slate-500 pt-1">
                      <span>Prazo Padrão: 84 parcelas (INSS)</span>
                      <div className="bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg">
                        <span className="text-[11px] text-blue-700 font-bold">Valor Total Liberado: </span>
                        <span className="font-extrabold text-blue-700 text-sm">
                          R$ {(calcMargem * 32.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Script de Atendimento Automático Inteligente (Sincronizado Direto com Produto e Banco) */}
          <div className="flex-1 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            {/* Barra de Pílulas de Contorno de Objeções (Clean Wrap sem Barra de Rolagem) */}
            <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200/70 flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center text-xs font-bold text-amber-900 shrink-0 mr-1">
                <Zap size={14} className="text-amber-600 mr-1.5 fill-amber-500" />
                <span>Socorro / Objeções:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {OBJECTION_LIST.map((obj) => {
                  const isActive = activeObjection === obj.id;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setActiveObjection(isActive ? null : obj.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition flex items-center shadow-2xs ${
                        isActive
                          ? "bg-amber-600 text-white font-bold ring-2 ring-amber-400"
                          : "bg-white text-amber-900 border border-amber-200/90 hover:bg-amber-100"
                      }`}
                    >
                      {obj.label}
                    </button>
                  );
                })}
                {activeObjection && (
                  <button
                    type="button"
                    onClick={() => setActiveObjection(null)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 px-1 py-0.5 underline cursor-pointer font-medium"
                  >
                    Fechar
                  </button>
                )}
              </div>
            </div>

            {/* Caixa de Resposta da Objeção Ativa */}
            {activeObjection && (
              <div className="mx-5 mt-3 p-3.5 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-950 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between font-bold text-amber-900 mb-1 text-[11px]">
                  <span className="flex items-center">
                    <Zap size={12} className="text-amber-600 mr-1 fill-amber-600" />
                    Como Contornar: {OBJECTION_LIST.find(o => o.id === activeObjection)?.label}
                  </span>
                  <button 
                    onClick={() => setActiveObjection(null)}
                    className="text-amber-800 hover:text-amber-950 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-sm font-medium leading-snug">
                  "{renderScriptText(OBJECTION_LIST.find(o => o.id === activeObjection)?.resposta || "")}"
                </p>
              </div>
            )}

            <div className="p-5 lg:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700">
              <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">1. Abertura</span>
                <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.abertura)}"</p>
              </div>

              <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">2. Motivo da Ligação</span>
                <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.motivo)}"</p>
              </div>

              {currentScript.qualificacao && (
                <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">3. Qualificação</span>
                  <p className="text-sm font-medium text-slate-800">"{renderScriptText(currentScript.qualificacao)}"</p>
                </div>
              )}

              <div className="bg-blue-50/40 p-3.5 rounded-lg border border-blue-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">4. Fechamento & Envio de Proposta</span>
                <p className="text-sm font-semibold text-blue-900">"{renderScriptText(currentScript.fechamento)}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Dialing & Dispositions - 100% Responsivo */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col justify-between p-5 lg:p-6 shrink-0 shadow-xs">
          
          <div className="text-center">
            {isDndBlocked && (
              <div className="mb-2 bg-rose-100 border border-rose-300 text-rose-800 px-3 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center justify-center space-x-1.5 animate-pulse shadow-xs">
                <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                <span>NÃO PERTURBE (DND ATIVO)</span>
              </div>
            )}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Número</span>
            <p className="text-2xl font-mono font-bold text-slate-900 tracking-tight">
              {formatPhone(activeLead?.telefone) || "(00) 00000-0000"}
            </p>
            {/* Bina Inteligente & Localização */}
            {activeLead?.telefone && (() => {
              const region = getRegionInfo(activeLead.telefone);
              return (
                <div className="mt-1 flex items-center justify-center space-x-1.5 text-[11px] text-slate-500 font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>📍 {region.uf} ({region.ddd}) • {region.regiao}</span>
                </div>
              );
            })()}
          </div>

          {/* SDR Qualification CTA & Call Status Actions */}
          <div className="flex-1 flex flex-col justify-center items-center my-5 lg:my-6">
            {callStatus === "idle" && (
              <div className="w-full flex flex-col items-center space-y-4">
                {/* Botão de Qualificação SDR (Acelera para Esteira + Dispara Whats) */}
                <button
                  onClick={handleQualifySdr}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                  title="Qualifica o lead, move para a Esteira em 'Documentos Pendentes' e abre o WhatsApp com mensagem formatada"
                >
                  <Check size={15} className="stroke-[3]" />
                  <span>Qualificar SDR ➔ Esteira</span>
                </button>

                {/* Botão Principal de Ligação */}
                <button 
                  onClick={handleStartCall}
                  className={`w-32 h-32 rounded-2xl text-white flex flex-col items-center justify-center font-bold shadow-md hover:scale-102 transition-all cursor-pointer ${
                    isDndBlocked 
                      ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20" 
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/10"
                  }`}
                >
                  <PhoneCall size={36} className="mb-1" />
                  <span className="text-xs uppercase tracking-wider">{isDndBlocked ? "Chamar (DND)" : "Chamar"}</span>
                </button>
              </div>
            )}

            {callStatus === "calling" && (
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-blue-600">Disparando para o smartphone...</p>
              </div>
            )}

            {callStatus === "talking" && (
              <div className="w-full text-center space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Duração</span>
                  <p className="text-3xl font-mono font-extrabold text-slate-800">{formatTime(duration)}</p>
                </div>
                <button 
                  onClick={handleEndCall}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition"
                >
                  <PhoneOff size={16} />
                  <span>Encerrar Chamada</span>
                </button>
              </div>
            )}

            {callStatus === "wrapup" && (
              <div className="w-full space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center block mb-2">Classificar Resultado</span>
                <div className="grid grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
                  <button onClick={() => handleDisposition("Contrato")} className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-bold text-xs flex justify-between items-center transition">
                    <span>Contrato Fechado</span> <Check size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Proposta")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Proposta Enviada</span> <Check size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Simulação")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Simulação Feita</span> <MessageSquare size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Retorno")} className="w-full text-left px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold text-xs flex justify-between items-center transition">
                    <span>Agendar Retorno</span> <Calendar size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Interessado")} className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md font-semibold text-xs flex justify-between items-center transition">
                    <span>Interessado</span> <User size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Não atendeu")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Não Atendeu</span> <PhoneOff size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Não interessado")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Não Tem Interesse</span> <X size={14} />
                  </button>
                  <button onClick={() => handleDisposition("Sem perfil")} className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium text-xs flex justify-between items-center transition">
                    <span>Sem Perfil / Saldo</span> <AlertCircle size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {callStatus === "idle" && (
            <button 
              onClick={() => saveCallRecord("Pulado")}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <span>Pular Lead</span>
              <FastForward size={12} />
            </button>
          )}

        </div>
      </div>

      {/* Modal Retorno */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Calendar className="text-amber-500" size={16} />
              <span>Agendar Retorno</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Data:</label>
                <input 
                  type="date" 
                  value={scheduleDate} 
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Horário:</label>
                <input 
                  type="time" 
                  value={scheduleTime} 
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Anotações:</label>
                <textarea 
                  placeholder="Ex: Ligar após as 14h, quer fechar com margem de R$ 500" 
                  value={scheduleNotes}
                  onChange={e => setScheduleNotes(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs h-16 outline-none"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg">Cancelar</button>
              <button onClick={confirmScheduleReturn} className="flex-1 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
