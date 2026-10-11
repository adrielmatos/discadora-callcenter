"use client";

import React, { useState } from "react";
import { Phone, Delete, X, Volume2, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { phoneAudio } from "@/lib/softphone";

interface SoftphoneKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onSendDtmf?: (digit: string) => void;
  onCallNumber?: (phoneNumber: string) => void;
  isInCall?: boolean;
  activeNumber?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onHangup?: () => void;
}

const KEYS = [
  { key: "1", sub: "" },
  { key: "2", sub: "ABC" },
  { key: "3", sub: "DEF" },
  { key: "4", sub: "GHI" },
  { key: "5", sub: "JKL" },
  { key: "6", sub: "MNO" },
  { key: "7", sub: "PQRS" },
  { key: "8", sub: "TUV" },
  { key: "9", sub: "WXYZ" },
  { key: "*", sub: "" },
  { key: "0", sub: "+" },
  { key: "#", sub: "" }
];

export default function SoftphoneKeypadModal({
  isOpen,
  onClose,
  onSendDtmf,
  onCallNumber,
  isInCall = false,
  activeNumber = "",
  isMuted = false,
  onToggleMute,
  onHangup
}: SoftphoneKeypadProps) {
  const [digits, setDigits] = useState("");

  if (!isOpen) return null;

  const handleKeyPress = (key: string) => {
    phoneAudio.playDtmf(key);
    setDigits(prev => prev + key);
    if (onSendDtmf && isInCall) {
      onSendDtmf(key);
    }
  };

  const handleBackspace = () => {
    setDigits(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDigits("");
  };

  const handleCall = () => {
    if (!digits.trim()) return;
    if (onCallNumber) {
      onCallNumber(digits.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xs overflow-hidden flex flex-col">
        
        {/* Header do Teclado */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-4 text-white flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Radio size={16} className={isInCall ? "text-emerald-400 animate-pulse" : "text-blue-400"} />
            <div>
              <h3 className="text-xs font-bold tracking-wide">
                {isInCall ? "Teclado DTMF (Em Chamada)" : "Discador Telefônico Manual"}
              </h3>
              <p className="text-[10px] text-slate-300">
                {isInCall ? (activeNumber || "Chamada Ativa") : "Digite para discar ou navegar URA"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Display dos Dígitos */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between min-h-[64px]">
          <div className="flex-1 overflow-x-auto text-right pr-2">
            <span className="font-mono text-2xl font-black tracking-widest text-slate-900">
              {digits || (isInCall ? "Pressione um dígito" : "0000-0000")}
            </span>
          </div>
          {digits && (
            <button
              onClick={handleBackspace}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
              title="Apagar dígito"
            >
              <Delete size={18} />
            </button>
          )}
        </div>

        {/* Grade de Teclas Telefônicas */}
        <div className="p-5 grid grid-cols-3 gap-3 bg-white">
          {KEYS.map(({ key, sub }) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-blue-50 active:bg-blue-600 active:text-white border border-slate-200/90 hover:border-blue-300 flex flex-col items-center justify-center transition shadow-2xs group"
            >
              <span className="text-lg font-black text-slate-800 group-hover:text-blue-700 group-active:text-white leading-none">
                {key}
              </span>
              {sub && (
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500 group-active:text-white/80 tracking-wider mt-0.5">
                  {sub}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Ações Inferiores */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          {isInCall ? (
            <>
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    isMuted
                      ? "bg-rose-100 text-rose-700 border border-rose-300"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{isMuted ? "Mutado" : "Mudo"}</span>
                </button>
              )}

              {onHangup && (
                <button
                  onClick={() => {
                    onHangup();
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center space-x-1.5 shadow-sm transition"
                >
                  <PhoneOff size={15} />
                  <span>Desligar</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleClear}
                className="px-3 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition"
              >
                Limpar
              </button>
              <button
                onClick={handleCall}
                disabled={!digits.trim()}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center space-x-1.5 shadow-sm transition"
              >
                <Phone size={15} />
                <span>Discar Número</span>
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
