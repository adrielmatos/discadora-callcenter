"use client";

import React, { useState } from "react";
import { 
  X, UserPlus, Building2, MapPin, Search, Check, 
  AlertCircle, DollarSign, Phone, FileText, Sparkles, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  empresaId?: string;
}

const BACEN_BANKS = [
  "Banco Pan",
  "Banco Safra",
  "Banco BMG",
  "C6 Bank",
  "Banco Daycoval",
  "Facta Financeira",
  "Itaú Consignado",
  "Bradesco Promotora",
  "Santander",
  "Caixa Econômica Federal",
  "Banco do Brasil",
  "Paraná Banco",
  "Banco Mercantil",
  "Banco Inbursa"
];

export default function LeadModal({ isOpen, onClose, onSuccess, empresaId }: LeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [produto, setProduto] = useState("Consignado INSS");
  const [banco, setBanco] = useState("Banco Pan");
  const [margem, setMargem] = useState("");

  // Endereço via ViaCEP / BrasilAPI (public-apis)
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  // Busca CEP via BrasilAPI / ViaCEP gratuito
  const handleCepLookup = async (cepInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, "");
    setCep(cleanCep);

    if (cleanCep.length === 8) {
      setCepLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();

        if (data.erro) {
          setErrorMsg("CEP não encontrado nos correios.");
        } else {
          setEndereco(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
        }
      } catch (e) {
        console.warn("Erro ao buscar ViaCEP:", e);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      setErrorMsg("Nome e Telefone são obrigatórios.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const cleanPhone = telefone.replace(/\D/g, "");
      const cleanCpf = cpf.replace(/\D/g, "");

      const { error } = await supabase.from("leads").insert({
        nome: nome.trim(),
        telefone: cleanPhone,
        cpf: cleanCpf || null,
        produto,
        banco,
        margem_disponivel: margem.trim() || null,
        cep: cep || null,
        endereco: endereco.trim() || null,
        bairro: bairro.trim() || null,
        cidade: cidade.trim() || null,
        uf: uf.trim() || null,
        status: "pendente",
        etapa_crm: "fila"
      });

      if (error) {
        setErrorMsg("Erro ao salvar lead: " + error.message);
      } else {
        onSuccess();
        onClose();
        // Limpa campos
        setNome("");
        setTelefone("");
        setCpf("");
        setMargem("");
        setCep("");
        setEndereco("");
        setBairro("");
        setCidade("");
        setUf("");
      }
    } catch (err: any) {
      setErrorMsg("Erro interno: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Topo */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold">Novo Lead / Proposta</h2>
              <p className="text-[11px] text-slate-400">Cadastro de lead com auto-preenchimento por CEP • public-apis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Nome Completo do Cliente *</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="DDD + Número"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  CPF (Sem Máscara)
                </label>
                <input
                  type="text"
                  placeholder="Somente números"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Produto</label>
                <select
                  value={produto}
                  onChange={e => setProduto(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="Consignado INSS">Consignado INSS</option>
                  <option value="Saque FGTS">Saque FGTS</option>
                  <option value="Portabilidade">Portabilidade</option>
                  <option value="BPC/LOAS">BPC/LOAS</option>
                  <option value="Servidor SIAPE">Servidor SIAPE</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Banco Parceiro</label>
                <select
                  value={banco}
                  onChange={e => setBanco(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white"
                >
                  {BACEN_BANKS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Margem / Saldo</label>
                <input
                  type="text"
                  placeholder="Ex: R$ 350,00"
                  value={margem}
                  onChange={e => setMargem(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Endereço & Localização (public-apis ViaCEP) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-blue-600" />
                <span>Endereço do Lead (Busca Automática por CEP)</span>
              </span>
              {cepLoading && (
                <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 animate-pulse">
                  <Loader2 size={11} className="animate-spin" />
                  Buscando CEP...
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">CEP (8 dígitos):</label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="00000000"
                  value={cep}
                  onChange={e => handleCepLookup(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Rua / Logradouro:</label>
                <input
                  type="text"
                  placeholder="Preenchido via CEP"
                  value={endereco}
                  onChange={e => setEndereco(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Bairro:</label>
                <input
                  type="text"
                  placeholder="Bairro"
                  value={bairro}
                  onChange={e => setBairro(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Cidade:</label>
                <input
                  type="text"
                  placeholder="Cidade"
                  value={cidade}
                  onChange={e => setCidade(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">UF (Estado):</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="UF"
                  value={uf}
                  onChange={e => setUf(e.target.value.toUpperCase())}
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{loading ? "Cadastrando..." : "Cadastrar Lead"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
