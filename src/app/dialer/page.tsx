"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall, PhoneOff, Check, X, Calendar, MessageSquare,
  Play, FastForward, User, AlertCircle, Calculator,
  ShieldAlert, Sparkles, Building2, CheckCircle2, Zap, ChevronRight,
  Headphones, Mic, MicOff, Radio, Volume2, Hash, Phone,
  Clock, Bot, RefreshCw, Send, ExternalLink, CheckCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SoftphoneEngine, phoneAudio, SipConfig, SipRegStatus } from "@/lib/softphone";
import SoftphoneKeypadModal from "@/components/SoftphoneKeypadModal";
import FinanceCalculatorModal from "@/components/FinanceCalculatorModal";

const OBJECTION_LIST = [
  {
    id: "golpe",
    label: "🛡️ É Golpe?",
    resposta: "Compreendo perfeitamente o receio, [NOME], e o senhor está certíssimo em ter cuidado. Nós nunca pedimos senha nem adiantamento em dinheiro. A autorização é feita diretamente no aplicativo oficial do banco ou Meu INSS com biometria facial no seu celular. O valor entra direto na sua conta do [BANCO]. Posso te mandar o passo a passo seguro pelo WhatsApp?"
  },
  {
    id: "sem_margem",
    label: "💰 Sem Margem",
    resposta: "Excelente que já possui contrato ativo, [NOME]! É justamente por isso que liguei. Conseguimos fazer a Portabilidade com Troco: reduzimos a taxa do seu banco antigo e liberamos um troco de até R$ 2.500,00 na sua conta sem aumentar a parcela que o senhor já paga todo mês. Gostaria de ver quanto sobra de troco?"
  },
  {
    id: "juros",
    label: "📉 Juros Altos",
    resposta: "Entendo sua preocupação com juros, [NOME]. Mas veja: o consignado e FGTS têm a menor taxa do país (cerca de 1,6% a 1,8% ao mês), enquanto cartão de crédito e cheque especial passam de 14% ao mês. Usar esse limite para quitar dívidas caras ou economizar é a melhor decisão financeira. Vamos fazer uma simulação sem compromisso?"
  },
  {
    id: "familia",
    label: "🤔 Falar c/ Família",
    resposta: "Com certeza, [NOME], conversar com a família é muito importante. O que posso fazer para te ajudar é gerar a pré-análise formal agora e te mandar no WhatsApp. Assim você senta com eles, confere os números exatos e valores liberados no [BANCO]. Pode ser?"
  },
  {
    id: "sem_interesse",
    label: "❌ Sem Interesse",
    resposta: "Entendo perfeitamente, [NOME]! Mas me tira uma dúvida rápida: se hoje liberasse uma margem de [VALOR] com uma parcela que cabe no seu bolso para você guardar ou realizar algum projeto, você deixaria passar essa condição ou gostaria ao menos de saber os números exatos sem compromisso nenhum?"
  },
  {
    id: "agencia",
    label: "🏦 Prefiro Agência",
    resposta: "Compreendo, [NOME]. Mas a agência física costuma ter filas e taxas de balcão mais altas. Pelo nosso canal de correspondente bancário digital, a taxa é de esteira nacional reduzida e o dinheiro entra na sua conta hoje mesmo sem você precisar sair de casa. Vamos dar uma olhada na simulação?"
  }
];

const DDD_REGIONS: Record<string, { uf: string, regiao: string }> = {
  "11": { uf: "SP", regiao: "São Paulo / Capital" }, "12": { uf: "SP", regiao: "Vale do Paraíba" },
  "13": { uf: "SP", regiao: "Baixada Santista" }, "14": { uf: "SP", regiao: "Bauru / Marília" },
  "15": { uf: "SP", regiao: "Sorocaba" }, "16": { uf: "SP", regiao: "Ribeirão Preto" },
  "17": { uf: "SP", regiao: "São José do Rio Preto" }, "18": { uf: "SP", regiao: "Presidente Prudente" },
  "19": { uf: "SP", regiao: "Campinas" }, "21": { uf: "RJ", regiao: "Rio de Janeiro / Capital" },
  "22": { uf: "RJ", regiao: "Região dos Lagos" }, "24": { uf: "RJ", regiao: "Petrópolis / Volta Redonda" },
  "27": { uf: "ES", regiao: "Vitória / Vila Velha" }, "28": { uf: "ES", regiao: "Cachoeiro de Itapemirim" },
  "31": { uf: "MG", regiao: "Belo Horizonte" }, "32": { uf: "MG", regiao: "Juiz de Fora" },
  "33": { uf: "MG", regiao: "Governador Valadares" }, "34": { uf: "MG", regiao: "Uberlândia" },
  "35": { uf: "MG", regiao: "Poços de Caldas" }, "37": { uf: "MG", regiao: "Divinópolis" },
  "38": { uf: "MG", regiao: "Montes Claros" }, "41": { uf: "PR", regiao: "Curitiba" },
  "42": { uf: "PR", regiao: "Ponta Grossa" }, "43": { uf: "PR", regiao: "Londrina" },
  "44": { uf: "PR", regiao: "Maringá" }, "45": { uf: "PR", regiao: "Foz do Iguaçu" },
  "46": { uf: "PR", regiao: "Francisco Beltrão" }, "47": { uf: "SC", regiao: "Joinville / Blumenau / Itajaí" },
  "48": { uf: "SC", regiao: "Florianópolis" }, "49": { uf: "SC", regiao: "Chapecó" },
  "51": { uf: "RS", regiao: "Porto Alegre" }, "53": { uf: "RS", regiao: "Pelotas" },
  "54": { uf: "RS", regiao: "Caxias do Sul" }, "55": { uf: "RS", regiao: "Santa Maria" },
  "61": { uf: "DF", regiao: "Brasília" }, "62": { uf: "GO", regiao: "Goiânia" },
  "63": { uf: "TO", regiao: "Palmas" }, "64": { uf: "GO", regiao: "Rio Verde" },
  "65": { uf: "MT", regiao: "Cuiabá" }, "66": { uf: "MT", regiao: "Rondonópolis" },
  "67": { uf: "MS", regiao: "Campo Grande" }, "68": { uf: "AC", regiao: "Rio Branco" },
  "69": { uf: "RO", regiao: "Porto Velho" }, "71": { uf: "BA", regiao: "Salvador" },
  "73": { uf: "BA", regiao: "Ilhéus / Itabuna" }, "74": { uf: "BA", regiao: "Juazeiro" },
  "75": { uf: "BA", regiao: "Feira de Santana" }, "77": { uf: "BA", regiao: "Vitória da Conquista" },
  "79": { uf: "SE", regiao: "Aracaju" }, "81": { uf: "PE", regiao: "Recife" },
  "82": { uf: "AL", regiao: "Maceió" }, "83": { uf: "PB", regiao: "João Pessoa" },
  "84": { uf: "RN", regiao: "Natal" }, "85": { uf: "CE", regiao: "Fortaleza" },
  "86": { uf: "PI", regiao: "Teresina" }, "87": { uf: "PE", regiao: "Petrolina" },
  "88": { uf: "CE", regiao: "Juazeiro do Norte" }, "89": { uf: "PI", regiao: "Picos" },
  "91": { uf: "PA", regiao: "Belém" }, "92": { uf: "AM", regiao: "Manaus" },
  "93": { uf: "PA", regiao: "Santarém" }, "94": { uf: "PA", regiao: "Marabá" },
  "95": { uf: "RR", regiao: "Boa Vista" }, "96": { uf: "AP", regiao: "Macapá" },
  "97": { uf: "AM", regiao: "Interior do Amazonas" }, "98": { uf: "MA", regiao: "São Luís" },
  "99": { uf: "MA", regiao: "Imperatriz" }
};

const formatPhone = (phone?: string) => {
  if (!phone) return "";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 11) return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return phone;
};

const getRegionInfo = (phone?: string) => {
  if (!phone) return { ddd: "XX", uf: "BR", regiao: "Nacional" };
  const clean = phone.replace(/\D/g, "");
  const ddd = clean.length >= 10 ? clean.slice(0, 2) : "";
  return { ddd: ddd || "XX", uf: DDD_REGIONS[ddd]?.uf || "BR", regiao: DDD_REGIONS[ddd]?.regiao || "Nacional" };
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

interface WhatsAppInteraction {
  id: number;
  created_at: string;
  clientMessage?: string;
  sofiaMessage?: string;
  raw: string;
}

export default function DialerWorkspace() {
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [isPowerDialing, setIsPowerDialing] = useState(false);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "talking" | "wrapup">("idle");
  const [duration, setDuration] = useState(0);
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [selectedScriptProduct, setSelectedScriptProduct] = useState("");
  const [productFilter] = useState("all");
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [dndBlockedSet, setDndBlockedSet] = useState<Set<string>>(new Set());
  const [showCalc, setShowCalc] = useState(false);
  const [activeObjection, setActiveObjection] = useState<string | null>(null);

  // ─── ABAS CENTRAIS: Script vs Sofia WhatsApp ───────────────────────
  const [activeTab, setActiveTab] = useState<"script" | "sofia">("script");
  const [whatsappInteractions, setWhatsappInteractions] = useState<WhatsAppInteraction[]>([]);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);

  // ─── ESTADOS DO SOFTPHONE WEBRTC (Fase 2) ─────────────────────────
  const [softphoneMode, setSoftphoneMode] = useState<"webrtc" | "smartphone">("webrtc");
  const [sipRegStatus, setSipRegStatus] = useState<SipRegStatus>("smartphone_mode");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sipConfig, setSipConfig] = useState<SipConfig | null>(null);

  const softphoneRef = useRef<SoftphoneEngine | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeLead = leadsList[currentLeadIndex];
  const cleanActivePhone = activeLead?.telefone?.replace(/\D/g, "") || "";
  const cleanActiveCpf = activeLead?.cpf?.replace(/\D/g, "") || "";
  const isDndBlocked = Boolean((cleanActivePhone && dndBlockedSet.has(cleanActivePhone)) || (cleanActiveCpf && dndBlockedSet.has(cleanActiveCpf)));
  const leadsRestantes = leadsList.length - currentLeadIndex;

  const getLeadDiagnosis = (lead?: Lead) => {
    if (!lead) return "";
    const prod = (lead.produto || "").toLowerCase();
    const bco = lead.banco && lead.banco !== "Não informado" ? lead.banco : "Banco Parceiro";
    if (prod.includes("fgts")) return `Saldo pré-aprovado para antecipação do Saque-Aniversário no ${bco}. Liberação via PIX em até 2 horas.`;
    if (prod.includes("porta") || prod.includes("refin")) return `Portabilidade com Troco no ${bco}. Redução de taxa + troco em dinheiro sem alterar a parcela.`;
    if (prod.includes("inss") || prod.includes("bpc") || prod.includes("loas")) return `Beneficiário elegível a Crédito Consignado no ${bco} com taxas reduzidas e desconto direto em folha.`;
    if (prod.includes("siape") || prod.includes("servidor")) return `Servidor público com margem consignável estendida no ${bco}. Menor taxa do mercado.`;
    return `Lead qualificado com oportunidade de crédito consignado facilitado no ${bco}. Sem consulta ao SPC/Serasa.`;
  };

  const fetchQueue = async (filter = productFilter) => {
    let query = supabase.from("leads").select("*").eq("status", "pendente").order("id", { ascending: true });
    if (filter === "fgts") query = query.ilike("produto", "%fgts%");
    else if (filter === "inss") query = query.or("produto.ilike.%inss%,produto.ilike.%bpc%,produto.ilike.%loas%");
    else if (filter === "consignado") query = query.ilike("produto", "%consignado%");
    const { data } = await query.limit(150);
    if (data) { setLeadsList(data); setCurrentLeadIndex(0); }
  };

  const fetchScripts = async () => {
    const { data } = await supabase.from("scripts_ligacao").select("*").order("id", { ascending: true });
    if (data) setScriptsList(data);
  };

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
    } catch (e) { console.error("Erro DND:", e); }
  };

  // Parser das conversas do WhatsApp salvas no histórico de ligações
  const parseWhatsappInteractions = (records: any[]): WhatsAppInteraction[] => {
    return records
      .filter(r => r.tabulacao && (r.tabulacao.includes("[WhatsApp") || r.tabulacao.toLowerCase().includes("whatsapp")))
      .map(r => {
        const tab = r.tabulacao;
        let clientMsg = "";
        let sofiaMsg = "";

        const clientQuote = tab.match(/Cliente:\s*"([^"]+)"/i);
        const sofiaQuote = tab.match(/Sofia:\s*"([^"]+)"/i);

        if (clientQuote) {
          clientMsg = clientQuote[1];
        } else {
          const clientSimple = tab.match(/Cliente:\s*(.+?)\s*\|\s*Sofia:/i);
          if (clientSimple) clientMsg = clientSimple[1];
        }

        if (sofiaQuote) {
          sofiaMsg = sofiaQuote[1];
        } else {
          const sofiaSimple = tab.match(/Sofia:\s*(.+)$/i);
          if (sofiaSimple) sofiaMsg = sofiaSimple[1];
        }

        if (!clientMsg && !sofiaMsg) {
          sofiaMsg = tab.replace(/\[WhatsApp Sofia\]/gi, "").replace(/\[WhatsApp\]/gi, "").trim();
        }

        return {
          id: r.id,
          created_at: r.created_at,
          clientMessage: clientMsg,
          sofiaMessage: sofiaMsg,
          raw: tab
        };
      });
  };

  // Busca histórico de WhatsApp do lead ativo
  const loadWhatsappHistory = async (leadId: number) => {
    setLoadingWhatsapp(true);
    try {
      const { data } = await supabase
        .from("historico_ligacoes")
        .select("id, tabulacao, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      if (data) {
        setWhatsappInteractions(parseWhatsappInteractions(data));
      } else {
        setWhatsappInteractions([]);
      }
    } catch (err) {
      console.error("Erro ao carregar conversas do WhatsApp:", err);
      setWhatsappInteractions([]);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  // Inicializa o Softphone WebRTC a partir das configurações do Supabase
  const initSoftphone = async () => {
    try {
      const { data } = await supabase
        .from("app_configuracoes")
        .select("sip_host, sip_port, sip_user, sip_password, sip_protocol")
        .eq("id", 1)
        .single();

      if (data && data.sip_host && data.sip_user) {
        setSipConfig(data as SipConfig);
        const engine = new SoftphoneEngine(
          (status) => setSipRegStatus(status),
          (state) => {
            if (state === "talking") setCallStatus("talking");
            else if (state === "wrapup") setCallStatus("wrapup");
            else if (state === "failed") {
              setCallStatus("wrapup");
            }
          }
        );

        if (remoteAudioRef.current) {
          engine.setAudioElement(remoteAudioRef.current);
        }

        softphoneRef.current = engine;
        engine.connect(data as SipConfig);
      } else {
        setSipRegStatus("smartphone_mode");
      }
    } catch (e) {
      console.warn("Softphone WebRTC rodando em modo smartphone:", e);
      setSipRegStatus("smartphone_mode");
    }
  };

  useEffect(() => {
    fetchQueue("all");
    fetchScripts();
    fetchDnd();
    initSoftphone();

    return () => {
      if (softphoneRef.current) {
        softphoneRef.current.disconnect();
      }
    };
  }, []);

  // Recarrega conversas do WhatsApp quando muda o lead
  useEffect(() => {
    if (activeLead?.id) {
      loadWhatsappHistory(activeLead.id);
    } else {
      setWhatsappInteractions([]);
    }
  }, [activeLead?.id]);

  useEffect(() => {
    if (!activeLead || scriptsList.length === 0) return;
    const leadProduct = (activeLead.produto || "").toLowerCase().trim();
    const leadBank = (activeLead.banco || "").toLowerCase().trim();
    let match = null;
    if (leadProduct.includes("bpc") || leadProduct.includes("loas")) {
      match = scriptsList.find(s => s.produto.toLowerCase().includes("bpc") || s.produto.toLowerCase().includes("loas")) || scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    } else if (leadProduct.includes("inss")) match = scriptsList.find(s => s.produto.toLowerCase().includes("inss"));
    else if (leadProduct.includes("fgts")) match = scriptsList.find(s => s.produto.toLowerCase().includes("fgts"));
    else if (leadProduct.includes("porta") || leadProduct.includes("portabilidade")) match = scriptsList.find(s => s.produto.toLowerCase().includes("portabilidade"));
    else if (leadProduct.includes("refin")) match = scriptsList.find(s => s.produto.toLowerCase().includes("refinanciamento"));
    else if (leadProduct.includes("siape") || leadProduct.includes("servidor")) match = scriptsList.find(s => s.produto.toLowerCase().includes("siape") || s.produto.toLowerCase().includes("servidor"));
    else if (leadProduct.includes("consignado")) match = scriptsList.find(s => s.produto.toLowerCase().includes("consignado geral") || s.produto.toLowerCase().includes("consignado"));
    if (!match && leadProduct) match = scriptsList.find(s => s.produto.toLowerCase().includes(leadProduct) || leadProduct.includes(s.produto.toLowerCase()));
    if (!match && leadBank && leadBank !== "não informado") match = scriptsList.find(s => s.produto.toLowerCase().includes(leadBank));
    if (match) setSelectedScriptProduct(match.produto);
    else {
      const padrao = scriptsList.find(s => s.produto.toLowerCase().includes("padrão") || s.produto.toLowerCase().includes("geral") || s.produto.toLowerCase().includes("mestre"));
      setSelectedScriptProduct(padrao ? padrao.produto : (scriptsList[0]?.produto || ""));
    }
  }, [activeLead, scriptsList]);

  useEffect(() => {
    let interval: any;
    if (callStatus === "talking") interval = setInterval(() => setDuration(d => d + 1), 1000);
    else setDuration(0);
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown > 0) {
      const t = setTimeout(() => setAutoNextCountdown(c => (c !== null ? c - 1 : null)), 1000);
      return () => clearTimeout(t);
    } else { setAutoNextCountdown(null); triggerCall(); }
  }, [autoNextCountdown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Disparo da Chamada: WebRTC nativo ou Ponte Smartphone
  const triggerCall = async (customNumber?: string) => {
    const targetNumber = customNumber || activeLead?.telefone;
    if (!targetNumber) return;

    if (softphoneMode === "webrtc" && softphoneRef.current && sipRegStatus === "registered") {
      setCallStatus("calling");
      const success = await softphoneRef.current.makeCall(targetNumber);
      if (!success) {
        window.location.href = `tel:+55${targetNumber.replace(/\D/g, "")}`;
        setTimeout(() => setCallStatus("talking"), 2000);
      }
    } else {
      phoneAudio.startRinging();
      window.location.href = `tel:+55${targetNumber.replace(/\D/g, "")}`;
      setCallStatus("calling");
      setTimeout(() => {
        phoneAudio.stopRinging();
        setCallStatus("talking");
      }, 2000);
    }
  };

  const handleStartCall = () => {
    if (isDndBlocked) {
      const ok = window.confirm("⚠️ Este contato está no Não Perturbe (DND). Deseja ligar mesmo assim?");
      if (!ok) return;
    }
    setAutoNextCountdown(null);
    triggerCall();
  };

  const handleEndCall = () => {
    if (softphoneRef.current) {
      softphoneRef.current.hangup();
    } else {
      phoneAudio.stopRinging();
      phoneAudio.playHangupTone();
    }
    setCallStatus("wrapup");
  };

  const handleToggleMute = () => {
    if (softphoneRef.current) {
      const muted = softphoneRef.current.toggleMute();
      setIsMuted(muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleSendDtmf = (digit: string) => {
    if (softphoneRef.current) {
      softphoneRef.current.sendDtmf(digit);
    } else {
      phoneAudio.playDtmf(digit);
    }
  };

  const handleDisposition = async (status: string) => {
    if (!activeLead?.id) return;
    if (status === "Retorno") { setShowScheduleModal(true); return; }
    await saveCallRecord(status);
  };

  const saveCallRecord = async (status: string, notes?: string) => {
    if (!activeLead?.id) return;
    await supabase.from("historico_ligacoes").insert({ lead_id: activeLead.id, tabulacao: status, duracao_segundos: duration });
    let etapaCrm = "finalizado";
    if (status === "Contrato") etapaCrm = "contrato";
    else if (status === "Proposta") etapaCrm = "proposta";
    else if (status === "Simulação") etapaCrm = "simulacao";
    else if (status === "Interessado") etapaCrm = "contato";
    await supabase.from("leads").update({ status: "finalizado", etapa_crm: etapaCrm, ultima_tabulacao: status, tentativas: 1 }).eq("id", activeLead.id);
    handleNextLead();
  };

  const handleNextLead = () => {
    setCallStatus("idle");
    setActiveObjection(null);
    setIsMuted(false);
    if (currentLeadIndex + 1 < leadsList.length) {
      setCurrentLeadIndex(curr => curr + 1);
      if (isPowerDialing) setAutoNextCountdown(2);
    } else fetchQueue();
  };

  const handleQualifySdr = async () => {
    if (!activeLead) return;
    await supabase.from("leads").update({ etapa_crm: "esteira_docs", status: "qualificado", ultima_tabulacao: "Qualificado SDR" }).eq("id", activeLead.id);
    await supabase.from("historico_ligacoes").insert({ lead_id: activeLead.id, tabulacao: "Qualificado SDR", duracao_segundos: duration });
    const cleanNumber = activeLead.telefone.replace(/\D/g, "");
    const rawMargem = (activeLead.margem_disponivel || "").trim();
    const isMargemZero = !rawMargem || rawMargem === "R$ 0,00" || rawMargem === "0";
    const valorMsg = isMargemZero ? "condição especial aprovada" : `margem liberada de ${rawMargem}`;
    const msg = `Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. Sua simulação de crédito pelo ${activeLead.banco || "banco parceiro"} com ${valorMsg} foi qualificada com sucesso! Para darmos andamento na liberação direta na sua conta, pode me enviar uma foto do seu documento (RG ou CNH)?`;
    window.open(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(msg)}`, "_blank");
    handleNextLead();
  };

  const confirmScheduleReturn = async () => {
    if (!activeLead?.id || !scheduleDate) { alert("Selecione a data do retorno."); return; }
    const fullDate = `${scheduleDate}T${scheduleTime || "10:00"}:00`;
    await supabase.from("retornos").insert({ lead_id: activeLead.id, data_hora: new Date(fullDate).toISOString(), observacao: scheduleNotes || "Retorno agendado pelo operador", concluido: false });
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
    const text = encodeURIComponent(`Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. Conforme conversamos, segue a simulação referente à sua ${valorMsg} pelo banco ${activeLead.banco || "parceiro"}. Ficou com alguma dúvida nas condições?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

  const handleSendQuickProposal = () => {
    if (!activeLead) return;
    const cleanPhone = activeLead.telefone.replace(/\D/g, "");
    const rawMargem = (activeLead.margem_disponivel || "").trim();
    const isMargemZero = !rawMargem || rawMargem === "R$ 0,00" || rawMargem === "0";
    const valorMsg = isMargemZero ? "condição especial aprovada" : `limite liberado de ${rawMargem}`;
    const text = encodeURIComponent(`Olá, ${activeLead.nome}! Sou o Adriel da A&K Soluções Financeiras. A Sofia me passou sua ficha referente à ${valorMsg} no ${activeLead.banco || "banco conveniado"}. Gostaria de confirmar a liberação no seu PIX agora?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${text}`, "_blank");
  };

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

  // ─── Fila vazia ───────────────────────────────────────────────────
  if (!activeLead && leadsList.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-10 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Fila Finalizada!</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">Todos os leads pendentes foram tabulados.</p>
          <button onClick={() => fetchQueue("all")} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition cursor-pointer">
            Recarregar Fila
          </button>
        </div>
      </div>
    );
  }

  const region = getRegionInfo(activeLead?.telefone);

  // ─── RENDER PRINCIPAL ORGANIZADO & SEM POLUIÇÃO ────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {/* Áudio Remoto Oculto para WebRTC */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* ── HEADER SUPERIOR FIXO & PROFISSIONAL (Zero botões flutuantes sobrepostos) ── */}
      <header className="h-14 px-4 lg:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
        
        {/* Esquerda: Identificação da Fila + Status Softphone */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <PhoneCall size={15} />
            </div>
            <span className="text-xs font-extrabold text-slate-800 hidden sm:inline">Discador Ativo</span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Contador de Leads */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{leadsRestantes} na fila</span>
          </div>

          {autoNextCountdown !== null && (
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-[11px] font-bold animate-pulse flex items-center gap-1">
              <Zap size={11} className="fill-blue-600" />
              Discando em {autoNextCountdown}s
            </span>
          )}

          {/* Status do Softphone */}
          <div className="hidden md:flex items-center gap-2 pl-1">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              sipRegStatus === "registered"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : sipRegStatus === "connecting"
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : "bg-slate-50 text-slate-600 border-slate-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                sipRegStatus === "registered" ? "bg-emerald-500" : sipRegStatus === "connecting" ? "bg-amber-500" : "bg-slate-400"
              }`} />
              {sipRegStatus === "registered"
                ? `Ramal ${sipConfig?.sip_user || ""} Online`
                : sipRegStatus === "connecting"
                ? "Conectando PABX..."
                : "Modo Smartphone"}
            </span>

            {/* Alternador WebRTC vs Celular */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[10px]">
              <button
                onClick={() => setSoftphoneMode("webrtc")}
                className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                  softphoneMode === "webrtc" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-500"
                }`}
                title="Discar usando fone WebRTC via PABX"
              >
                <Headphones size={11} />
                <span>WebRTC</span>
              </button>
              <button
                onClick={() => setSoftphoneMode("smartphone")}
                className={`px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                  softphoneMode === "smartphone" ? "bg-white text-blue-700 shadow-2xs" : "text-slate-500"
                }`}
                title="Discar usando aplicativo móvel ou link tel:"
              >
                <Phone size={11} />
                <span>Celular</span>
              </button>
            </div>
          </div>
        </div>

        {/* Direita: Simulador + Teclado DTMF + Modo Manual/Power */}
        <div className="flex items-center gap-2">
          {/* Teclado Manual */}
          <button
            onClick={() => setIsKeypadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer shadow-2xs"
            title="Abrir teclado numérico DTMF ou discar número manual"
          >
            <Hash size={13} className="text-blue-600" />
            <span className="hidden sm:inline">Teclado</span>
          </button>

          {/* Calculadora Financeira (FinceptTerminal) */}
          <button
            onClick={() => setShowCalc(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition cursor-pointer shadow-2xs"
            title="Simulador Completo FGTS, Portabilidade e Margem"
          >
            <Calculator size={13} className="text-blue-600" />
            <span className="hidden sm:inline">Simulador</span>
          </button>

          {/* Modo de Discagem: Manual vs Power */}
          <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs">
            <button
              onClick={() => { setIsPowerDialing(false); setAutoNextCountdown(null); }}
              title="Manual: você decide quando ligar"
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                !isPowerDialing ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setIsPowerDialing(true)}
              title="Power: avança e disca automaticamente"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                isPowerDialing ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Play size={10} className="fill-current" />
              Power
            </button>
          </div>
        </div>
      </header>

      {/* ── CORPO PRINCIPAL (2 Colunas Limpas) ───────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ── COLUNA ESQUERDA: Ficha do Lead + Abas Centrais ───────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto border-r border-slate-200">

          {/* DND alerta */}
          {isDndBlocked && (
            <div className="mx-4 mt-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
              <ShieldAlert size={14} className="text-rose-500" />
              ATENÇÃO: Este contato está cadastrado no Não Perturbe (DND / Bloqueio)
            </div>
          )}

          {/* ── CARD DO LEAD ATIVO (Limpo e compacto) ────────────────── */}
          <div className="mx-4 mt-3 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden shrink-0">
            {/* Banner de diagnóstico */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-xs min-w-0">
                <Sparkles size={13} className="text-blue-200 shrink-0" />
                <span className="font-medium text-blue-50 truncate leading-snug">{getLeadDiagnosis(activeLead)}</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-white px-2.5 py-0.5 rounded-full shrink-0 ml-2">
                Pré-Qualificado
              </span>
            </div>

            {/* Identificação e Margem */}
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-lg border border-blue-200/60 shrink-0">
                  {activeLead?.nome?.charAt(0) || "C"}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-slate-900 leading-tight truncate">{activeLead?.nome}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                      {activeLead?.cpf || "CPF Indisponível"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                      <Building2 size={11} className="text-blue-600" />
                      {activeLead?.banco || "Banco Parceiro"}
                    </span>
                    <button
                      onClick={handleWhatsApp}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                      title="Abrir WhatsApp direto do lead"
                    >
                      <MessageSquare size={11} />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              {/* Card de Margem / Limite */}
              <div className="text-left sm:text-right shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margem / Limite</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeLead?.margem_disponivel || "R$ 0,00"}
                </span>
              </div>
            </div>
          </div>

          {/* ── SISTEMA DE ABAS CENTRAIS: Script vs Sofia WhatsApp ───── */}
          <div className="mx-4 mt-3 mb-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-[380px]">
            
            {/* Header das Abas */}
            <div className="border-b border-slate-200 px-4 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("script")}
                  className={`py-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                    activeTab === "script"
                      ? "border-blue-600 text-blue-700 bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>📜 Script de Ligação</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("sofia")}
                  className={`py-3 px-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                    activeTab === "sofia"
                      ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Bot size={14} className={activeTab === "sofia" ? "text-emerald-600" : "text-slate-400"} />
                  <span>Conversa Sofia (WhatsApp)</span>
                  {whatsappInteractions.length > 0 ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                      {whatsappInteractions.length}
                    </span>
                  ) : (
                    <span className="bg-slate-200/80 text-slate-500 px-1.5 py-0.2 rounded-full text-[10px] font-semibold">
                      0
                    </span>
                  )}
                </button>
              </div>

              {/* Botão recarregar dados da aba atual */}
              {activeTab === "sofia" && (
                <button
                  onClick={() => activeLead?.id && loadWhatsappHistory(activeLead.id)}
                  title="Atualizar mensagens do WhatsApp"
                  className="text-slate-400 hover:text-emerald-600 transition p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <RefreshCw size={13} className={loadingWhatsapp ? "animate-spin text-emerald-600" : ""} />
                </button>
              )}
            </div>

            {/* ── CONTEÚDO DA ABA 1: SCRIPT DE LIGAÇÃO ────────────────── */}
            {activeTab === "script" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Objeções Rápidas em Pílulas */}
                <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200/60 flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-amber-800 text-[11px] font-extrabold shrink-0">
                    <Zap size={12} className="text-amber-500 fill-amber-400" />
                    <span>Objeções:</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap min-w-0 py-0.5">
                    {OBJECTION_LIST.map((obj) => {
                      const isActive = activeObjection === obj.id;
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => setActiveObjection(isActive ? null : obj.id)}
                          className={`whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full font-medium transition shrink-0 cursor-pointer ${
                            isActive
                              ? "bg-amber-600 text-white font-bold ring-2 ring-amber-400 shadow-2xs"
                              : "bg-white text-amber-900 border border-amber-200/80 hover:bg-amber-100"
                          }`}
                        >
                          {obj.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Resposta da Objeção Selecionada */}
                {activeObjection && (
                  <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 shrink-0">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        <Zap size={12} className="text-amber-500 fill-amber-500" />
                        {OBJECTION_LIST.find(o => o.id === activeObjection)?.label}
                      </span>
                      <button onClick={() => setActiveObjection(null)} className="text-amber-700 hover:text-amber-950 cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-snug text-amber-950">
                      "{renderScriptText(OBJECTION_LIST.find(o => o.id === activeObjection)?.resposta || "")}"
                    </p>
                  </div>
                )}

                {/* 4 Etapas do Script */}
                <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                  {[
                    { num: "1", label: "Abertura", text: currentScript.abertura, color: "blue" },
                    { num: "2", label: "Motivo da Ligação", text: currentScript.motivo, color: "slate" },
                    ...(currentScript.qualificacao ? [{ num: "3", label: "Qualificação", text: currentScript.qualificacao, color: "slate" }] : []),
                    { num: currentScript.qualificacao ? "4" : "3", label: "Fechamento & Proposta", text: currentScript.fechamento, color: "emerald" },
                  ].map((step) => (
                    <div
                      key={step.num}
                      className={`p-3 rounded-xl border text-xs ${
                        step.color === "blue" ? "bg-blue-50/50 border-blue-100" :
                        step.color === "emerald" ? "bg-emerald-50/50 border-emerald-100" :
                        "bg-slate-50 border-slate-100"
                      }`}
                    >
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${
                        step.color === "blue" ? "text-blue-600" : step.color === "emerald" ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {step.num}. {step.label}
                      </span>
                      <p className={`text-xs sm:text-sm font-medium leading-relaxed ${
                        step.color === "blue" ? "text-blue-950" : step.color === "emerald" ? "text-emerald-950" : "text-slate-800"
                      }`}>
                        "{renderScriptText(step.text)}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CONTEÚDO DA ABA 2: CONVERSA SOFIA (WHATSAPP) ─────────── */}
            {activeTab === "sofia" && (
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {loadingWhatsapp ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400 gap-2">
                    <RefreshCw size={14} className="animate-spin text-emerald-600" />
                    <span>Carregando conversas do WhatsApp da Sofia...</span>
                  </div>
                ) : whatsappInteractions.length === 0 ? (
                  // Estado Vazio Limpo (Sem Poluição)
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 shadow-2xs border border-emerald-100">
                      <MessageSquare size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Nenhuma conversa prévia no WhatsApp</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">
                      A Sofia ainda não conversou com {activeLead?.nome || "este lead"} no WhatsApp. Você pode ligar diretamente ou enviar uma abordagem inicial agora.
                    </p>
                    <button
                      onClick={handleWhatsApp}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <MessageSquare size={13} />
                      <span>Iniciar Abordagem no WhatsApp com Sofia</span>
                    </button>
                  </div>
                ) : (
                  // Chat estilo WhatsApp do Lead com a Sofia
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Alerta de Lead Quente */}
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between shrink-0 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>🔥 LEAD QUENTE: Cliente já conversou com a Sofia no WhatsApp!</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {whatsappInteractions.length} interação(ões)
                      </span>
                    </div>

                    {/* Lista de Mensagens Balões */}
                    <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-100/70 rounded-xl border border-slate-200">
                      {whatsappInteractions.map((item) => (
                        <div key={item.id} className="space-y-2">
                          {/* Balão do Cliente (Esquerda) */}
                          {item.clientMessage && (
                            <div className="flex justify-start">
                              <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-xs p-3 shadow-2xs border border-slate-200 text-xs">
                                <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                  {activeLead?.nome || "Cliente"}
                                </span>
                                <p className="text-slate-800 font-medium leading-relaxed">{item.clientMessage}</p>
                                <span className="text-[9px] text-slate-400 block text-right mt-1">
                                  {formatMsgTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Balão da Sofia (Direita) */}
                          {item.sofiaMessage && (
                            <div className="flex justify-end">
                              <div className="max-w-[85%] bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tr-xs p-3 shadow-2xs text-xs">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <Bot size={11} /> Sofia (IA A&K)
                                  </span>
                                </div>
                                <p className="text-slate-900 font-medium leading-relaxed">{item.sofiaMessage}</p>
                                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-emerald-700 font-medium">
                                  <span>{formatMsgTime(item.created_at)}</span>
                                  <CheckCheck size={12} className="text-blue-500" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Ações Rápidas do WhatsApp */}
                    <div className="pt-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Bot size={13} className="text-emerald-600" />
                        <span>Sincronizado automaticamente via Sofia IA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSendQuickProposal}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send size={12} />
                          <span>Mandar Proposta no Zap</span>
                        </button>
                        <button
                          onClick={handleWhatsApp}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <ExternalLink size={12} />
                          <span>Abrir WhatsApp Web</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── COLUNA DIREITA: Telefone + Controles de Chamada ─────────── */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col p-5 shrink-0 justify-between">
          
          {/* Header do Telefone + Localização */}
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                softphoneMode === "webrtc" && sipRegStatus === "registered"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {softphoneMode === "webrtc" && sipRegStatus === "registered" ? "🎧 Softphone WebRTC" : "📱 Ponte Celular"}
              </span>
            </div>

            <p className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
              {formatPhone(activeLead?.telefone) || "(00) 00000-0000"}
            </p>

            {activeLead?.telefone && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>📍 {region.uf} ({region.ddd}) • {region.regiao}</span>
              </div>
            )}
          </div>

          {/* Área de Estados da Chamada */}
          <div className="flex-1 flex flex-col justify-center gap-4 py-4">

            {/* ESTADO 1: IDLE (Pronto para Chamar) */}
            {callStatus === "idle" && (
              <>
                <button
                  onClick={handleQualifySdr}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Qualificar SDR ➔ Esteira</span>
                </button>

                <button
                  onClick={handleStartCall}
                  className={`w-full py-5 rounded-2xl text-white flex flex-col items-center justify-center font-bold shadow-md hover:scale-[1.02] transition-all cursor-pointer ${
                    isDndBlocked ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <PhoneCall size={32} className="mb-1.5" />
                  <span className="text-sm uppercase tracking-wider">{isDndBlocked ? "Chamar (DND!)" : "Ligar Agora"}</span>
                </button>
              </>
            )}

            {/* ESTADO 2: CALLING (Chamando / Conectando) */}
            {callStatus === "calling" && (
              <div className="text-center space-y-3 bg-blue-50/60 p-5 rounded-2xl border border-blue-200/60">
                <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
                <div>
                  <p className="text-xs font-bold text-blue-900">
                    {softphoneMode === "webrtc" && sipRegStatus === "registered"
                      ? "Chamando pelo Ramal WebRTC..."
                      : "Disparando para o smartphone..."}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Aguardando atendimento...</p>
                </div>
                <button
                  onClick={handleEndCall}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PhoneOff size={14} />
                  <span>Cancelar Chamada</span>
                </button>
              </div>
            )}

            {/* ESTADO 3: TALKING (Em Conversação Ativa) */}
            {callStatus === "talking" && (
              <div className="space-y-3">
                <div className="bg-slate-900 text-white p-5 rounded-2xl text-center shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-center space-x-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Em Conversação</span>
                  </div>
                  <p className="text-4xl font-mono font-black text-white tracking-wider">{formatTime(duration)}</p>

                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Radio size={12} className="text-emerald-400" />
                    <span>{softphoneMode === "webrtc" ? "Áudio WebRTC Ativo" : "Linha Celular"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleToggleMute}
                    className={`py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      isMuted
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    <span>{isMuted ? "Mutado" : "Mudo"}</span>
                  </button>

                  <button
                    onClick={() => setIsKeypadOpen(true)}
                    className="py-3 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Hash size={15} className="text-blue-600" />
                    <span>Teclado URA</span>
                  </button>
                </div>

                <button
                  onClick={handleEndCall}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <PhoneOff size={16} />
                  <span>Desligar Chamada</span>
                </button>
              </div>
            )}

            {/* ESTADO 4: WRAPUP (Classificar Tabulação) */}
            {callStatus === "wrapup" && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">Classificar Resultado</span>
                {[
                  { label: "✅ Contrato Fechado", status: "Contrato", cls: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold" },
                  { label: "📄 Proposta Enviada", status: "Proposta", cls: "bg-slate-50 text-slate-700 border-slate-200" },
                  { label: "🔢 Simulação Feita", status: "Simulação", cls: "bg-slate-50 text-slate-700 border-slate-200" },
                  { label: "📅 Agendar Retorno", status: "Retorno", cls: "bg-amber-50 text-amber-800 border-amber-200 font-bold" },
                  { label: "👋 Interessado", status: "Interessado", cls: "bg-blue-50 text-blue-800 border-blue-200" },
                  { label: "📵 Não Atendeu", status: "Não atendeu", cls: "bg-slate-50 text-slate-600 border-slate-200" },
                  { label: "🚫 Sem Interesse", status: "Não interessado", cls: "bg-slate-50 text-slate-600 border-slate-200" },
                  { label: "⚠️ Sem Perfil / Saldo", status: "Sem perfil", cls: "bg-slate-50 text-slate-600 border-slate-200" },
                ].map(({ label, status, cls }) => (
                  <button
                    key={status}
                    onClick={() => handleDisposition(status)}
                    className={`w-full text-left px-3 py-2 border rounded-lg font-medium text-xs flex justify-between items-center transition hover:brightness-95 cursor-pointer ${cls}`}
                  >
                    <span>{label}</span>
                    <ChevronRight size={13} className="opacity-40" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pular Lead */}
          {callStatus === "idle" && (
            <button
              onClick={() => saveCallRecord("Pulado")}
              className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition border-t border-slate-100 pt-3 cursor-pointer"
            >
              <FastForward size={12} />
              <span>Pular Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* ── MODAL RETORNO ─────────────────────────────────────────────── */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-amber-500" size={16} />
              Agendar Retorno
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Data:</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Horário:</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Anotações:</label>
                <textarea
                  placeholder="Ex: Ligar após as 14h, quer fechar com margem de R$ 500"
                  value={scheduleNotes}
                  onChange={e => setScheduleNotes(e.target.value)}
                  className="w-full border border-slate-200 p-2 rounded-lg text-xs h-16 outline-none focus:border-blue-400"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmScheduleReturn}
                className="flex-1 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TECLADO DTMF & DISCADOR MANUAL ───────────────────────── */}
      <SoftphoneKeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        onSendDtmf={handleSendDtmf}
        onCallNumber={(num) => triggerCall(num)}
        isInCall={callStatus === "talking"}
        activeNumber={activeLead?.telefone}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onHangup={handleEndCall}
      />

      {/* ── MODAL CALCULADORA FINANCEIRA (FinceptTerminal) ───────────── */}
      <FinanceCalculatorModal
        isOpen={showCalc}
        onClose={() => setShowCalc(false)}
        leadName={activeLead?.nome}
        leadPhone={activeLead?.telefone}
        onSendSimulationWhatsApp={(txt) => {
          const clean = (activeLead?.telefone || "").replace(/\D/g, "");
          const phone = clean.startsWith("55") ? clean : `55${clean}`;
          if (phone.length >= 10) {
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(txt)}`, "_blank");
          }
        }}
      />
    </div>
  );
}
