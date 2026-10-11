"use client";

import React, { useState } from "react";
import { 
  X, Check, Copy, QrCode, ShieldCheck, AlertCircle, 
  ExternalLink, CheckCircle2, Clock, DollarSign, Building2 
} from "lucide-react";
import { gerarPixCopiaECola, getPixQrCodeImageUrl } from "@/lib/pix";

interface CobrancaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa: {
    id: string;
    razao_social: string;
    plano_nome?: string;
    plano_preco?: string;
  };
  valor: number;
  pixConfig: {
    chave: string;
    beneficiario: string;
    cidade: string;
  };
  onConfirmManual?: (cobrancaId?: string) => Promise<void>;
  cobrancaId?: string;
}

export default function CobrancaModal({
  isOpen,
  onClose,
  empresa,
  valor,
  pixConfig,
  onConfirmManual,
  cobrancaId
}: CobrancaModalProps) {
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  if (!isOpen) return null;

  // Gera o código PIX Copia e Cola oficial se houver chave configurada
  const chaveValida = pixConfig.chave && pixConfig.chave.trim() !== "";
  const copiaECola = chaveValida
    ? gerarPixCopiaECola({
        chave: pixConfig.chave,
        beneficiario: pixConfig.beneficiario || "A&K SOLUCOES",
        cidade: pixConfig.cidade || "SALVADOR",
        valor: valor || 197.0,
        identificador: empresa.id.slice(0, 15)
      })
    : "";

  const qrCodeUrl = copiaECola ? getPixQrCodeImageUrl(copiaECola, 240) : "";

  const handleCopy = () => {
    if (!copiaECola) return;
    navigator.clipboard.writeText(copiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualApprove = async () => {
    if (!onConfirmManual) return;
    setIsConfirming(true);
    try {
      await onConfirmManual(cobrancaId);
      setConfirmSuccess(true);
      setTimeout(() => {
        setConfirmSuccess(false);
        onClose();
      }, 2000);
    } catch (e) {
      alert("Erro ao confirmar fatura");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 p-5 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Faturamento Seguro SaaS</span>
            </div>
            <h3 className="text-sm font-bold text-white leading-tight">
              {empresa.razao_social}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo da Fatura */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Resumo do Plano e Valor */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Plano Selecionado
              </span>
              <p className="text-sm font-black text-slate-900">{empresa.plano_nome || "Mensalidade SaaS"}</p>
              <span className="text-[11px] text-slate-500">Acesso por 30 dias</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Valor Total
              </span>
              <p className="text-xl font-black text-emerald-600">
                R$ {valor.toFixed(2)}
              </p>
            </div>
          </div>

          {/* QR Code e PIX */}
          {chaveValida ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Pague com PIX (Aprovação Instantânea)
                </span>
                
                {/* Imagem do QR Code */}
                <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-slate-200 inline-block shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto rounded-lg"
                  />
                </div>
                
                <p className="text-[11px] text-slate-500">
                  Abra o aplicativo do seu banco e aponte a câmera para o QR Code acima.
                </p>
              </div>

              {/* Copia e Cola */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Ou copie o código PIX Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={copiaECola}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-600 outline-none truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      copied 
                        ? "bg-emerald-600 text-white" 
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copiado!" : "Copiar"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertCircle size={16} className="text-amber-600" />
                <span>Chave PIX da A&K não configurada</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Vá em <strong>Configurações ➔ Financeiro</strong> e cadastre sua chave PIX (CNPJ, CPF ou E-mail) para que o sistema gere automaticamente o QR Code de pagamento para seus clientes.
              </p>
            </div>
          )}

          {/* Botão de Liberação Manual pelo Dono / Administrador */}
          {onConfirmManual && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                Ação Administrativa (A&K Matriz)
              </span>

              {confirmSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Plano ativado com sucesso por mais 30 dias!</span>
                </div>
              ) : (
                <button
                  onClick={handleManualApprove}
                  disabled={isConfirming}
                  className="w-full bg-slate-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isConfirming ? "Confirmando..." : "Dar Baixa Manual e Ativar Empresa Agora"}</span>
                </button>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
