// Motor WebRTC & Softphone SIP para Discadora A&K
// Suporta PABX IP Asterisk, FreePBX, ViciDial e OpenSIPS via WebSocket (WSS)

export interface SipConfig {
  sip_host: string;
  sip_port: string;
  sip_user: string;
  sip_password: string;
  sip_protocol: string;
}

export type SipRegStatus =
  | "smartphone_mode"
  | "disconnected"
  | "connecting"
  | "registered"
  | "registration_failed";

export type SipCallState =
  | "idle"
  | "calling"
  | "ringing"
  | "talking"
  | "wrapup"
  | "failed";

// Frequências DTMF padrão ITU-T
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477]
};

// Gerador de Tons Telefônicos com Web Audio API nativa
class PhoneAudioFeedback {
  private ctx: AudioContext | null = null;
  private ringOsc1: OscillatorNode | null = null;
  private ringOsc2: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringInterval: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Toca tom DTMF curto ao pressionar dígito
  playDtmf(key: string, durationMs = 150) {
    const ctx = this.getContext();
    if (!ctx) return;
    const freqs = DTMF_FREQS[key];
    if (!freqs) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + durationMs / 1000);
    osc2.stop(ctx.currentTime + durationMs / 1000);
  }

  // Tom de chamada (Ringback Tone) brasileiro: 425Hz com cadência 1s toca / 4s silêncio
  startRinging() {
    this.stopRinging();
    const ctx = this.getContext();
    if (!ctx) return;

    const playBeep = () => {
      try {
        if (!this.ctx || this.ctx.state === "closed") return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 425;
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.0);
      } catch (e) {}
    };

    playBeep();
    this.ringInterval = setInterval(playBeep, 4000);
  }

  stopRinging() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  // Tom de encerramento / ocupado (Beep Beep Beep)
  playHangupTone() {
    this.stopRinging();
    const ctx = this.getContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      const delay = i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 425;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    }
  }
}

export const phoneAudio = new PhoneAudioFeedback();

// Carregador assíncrono do JsSIP via CDN seguro
let jssipLoadingPromise: Promise<any> | null = null;

export function loadJsSIP(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Apenas no navegador"));
  if ((window as any).JsSIP) return Promise.resolve((window as any).JsSIP);
  if (jssipLoadingPromise) return jssipLoadingPromise;

  jssipLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jssip/3.10.1/jssip.min.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).JsSIP) {
        resolve((window as any).JsSIP);
      } else {
        reject(new Error("Falha ao inicializar JsSIP"));
      }
    };
    script.onerror = () => reject(new Error("Não foi possível carregar a biblioteca JsSIP"));
    document.head.appendChild(script);
  });

  return jssipLoadingPromise;
}

// Gerenciador de Sessão e Ramal WebRTC
export class SoftphoneEngine {
  private ua: any = null;
  private currentSession: any = null;
  private config: SipConfig | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;

  public regStatus: SipRegStatus = "disconnected";
  public callState: SipCallState = "idle";
  public isMuted: boolean = false;
  public lastError: string | null = null;

  // Callbacks de evento
  private onRegStatusChange?: (status: SipRegStatus) => void;
  private onCallStateChange?: (state: SipCallState) => void;

  constructor(
    onRegStatus?: (status: SipRegStatus) => void,
    onCallState?: (state: SipCallState) => void
  ) {
    this.onRegStatusChange = onRegStatus;
    this.onCallStateChange = onCallState;
  }

  setAudioElement(el: HTMLAudioElement | null) {
    this.remoteAudioElement = el;
  }

  // Inicializa conexão SIP com o PABX
  async connect(config: SipConfig) {
    this.config = config;

    // Se faltar host ou usuário, permanece no modo smartphone
    if (!config.sip_host || !config.sip_user) {
      this.updateRegStatus("smartphone_mode");
      return;
    }

    try {
      this.updateRegStatus("connecting");
      const JsSIP = await loadJsSIP();

      if (this.ua) {
        try { this.ua.stop(); } catch (e) {}
        this.ua = null;
      }

      const cleanHost = config.sip_host.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/.*$/, "");
      const port = config.sip_port ? `:${config.sip_port}` : ":8089";
      const wssUrl = `wss://${cleanHost}${port}/ws`;

      const socket = new JsSIP.WebSocketInterface(wssUrl);
      const configuration = {
        sockets: [socket],
        uri: `sip:${config.sip_user}@${cleanHost}`,
        password: config.sip_password,
        register: true,
        session_timers: false,
        user_agent: "AK-Solucoes-CallCenter-WebRTC/1.0"
      };

      this.ua = new JsSIP.UA(configuration);

      this.ua.on("connected", () => {
        this.lastError = null;
      });

      this.ua.on("disconnected", () => {
        if (this.regStatus !== "smartphone_mode") {
          this.updateRegStatus("disconnected");
        }
      });

      this.ua.on("registered", () => {
        this.lastError = null;
        this.updateRegStatus("registered");
      });

      this.ua.on("unregistered", () => {
        this.updateRegStatus("disconnected");
      });

      this.ua.on("registrationFailed", (e: any) => {
        this.lastError = e?.cause || "Falha na autenticação do ramal SIP";
        this.updateRegStatus("registration_failed");
      });

      this.ua.on("newRTCSession", (data: any) => {
        const session = data.session;
        if (session.direction === "incoming") {
          // Chamada recebida (auto-atendimento de retorno do PABX se aplicável)
          this.handleSessionEvents(session);
        }
      });

      this.ua.start();
    } catch (err: any) {
      console.warn("Softphone WebRTC aviso de inicialização:", err);
      this.lastError = err?.message || "Servidor SIP indisponível";
      this.updateRegStatus("registration_failed");
    }
  }

  disconnect() {
    if (this.currentSession) {
      try { this.currentSession.terminate(); } catch (e) {}
      this.currentSession = null;
    }
    if (this.ua) {
      try { this.ua.stop(); } catch (e) {}
      this.ua = null;
    }
    this.updateRegStatus("disconnected");
    this.updateCallState("idle");
  }

  // Efetua discagem para o número do cliente
  async makeCall(phoneNumber: string): Promise<boolean> {
    const cleanNumber = phoneNumber.replace(/\D/g, "");

    // Se o ramal não estiver registrado via WebRTC, usa ponte celular
    if (!this.ua || this.regStatus !== "registered" || !this.ua.isRegistered()) {
      phoneAudio.startRinging();
      this.updateCallState("calling");
      setTimeout(() => {
        phoneAudio.stopRinging();
        this.updateCallState("talking");
      }, 2000);
      return false; // Indica modo alternativo
    }

    try {
      this.updateCallState("calling");
      phoneAudio.startRinging();

      // Solicita permissão do microfone
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const cleanHost = this.config?.sip_host.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "").replace(/\/.*$/, "") || "localhost";
      const targetUri = `sip:${cleanNumber}@${cleanHost}`;

      const options = {
        mediaConstraints: { audio: true, video: false },
        pcConfig: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      };

      const session = this.ua.call(targetUri, options);
      this.handleSessionEvents(session);
      return true;
    } catch (err: any) {
      console.error("Erro ao iniciar chamada WebRTC:", err);
      phoneAudio.stopRinging();
      phoneAudio.playHangupTone();
      this.lastError = err?.message || "Erro no dispositivo de áudio";
      this.updateCallState("failed");
      return false;
    }
  }

  private handleSessionEvents(session: any) {
    this.currentSession = session;
    this.isMuted = false;

    session.on("progress", () => {
      this.updateCallState("ringing");
    });

    session.on("confirmed", () => {
      phoneAudio.stopRinging();
      this.updateCallState("talking");

      // Conecta o áudio remoto ao elemento <audio>
      try {
        const stream = new MediaStream();
        const receivers = session.connection.getReceivers();
        receivers.forEach((receiver: any) => {
          if (receiver.track && receiver.track.kind === "audio") {
            stream.addTrack(receiver.track);
          }
        });

        if (this.remoteAudioElement) {
          this.remoteAudioElement.srcObject = stream;
          this.remoteAudioElement.play().catch(() => {});
        }
      } catch (e) {
        console.warn("Aviso ao vincular fluxo de áudio:", e);
      }
    });

    session.on("ended", () => {
      phoneAudio.stopRinging();
      phoneAudio.playHangupTone();
      this.currentSession = null;
      this.updateCallState("wrapup");
    });

    session.on("failed", (e: any) => {
      phoneAudio.stopRinging();
      phoneAudio.playHangupTone();
      this.lastError = e?.cause || "Chamada não completada pelo PABX";
      this.currentSession = null;
      this.updateCallState("failed");
    });
  }

  // Desliga chamada ativa
  hangup() {
    phoneAudio.stopRinging();
    if (this.currentSession) {
      try { this.currentSession.terminate(); } catch (e) {}
      this.currentSession = null;
    }
    phoneAudio.playHangupTone();
    this.updateCallState("wrapup");
  }

  // Muta / Desmuta microfone
  toggleMute(): boolean {
    if (!this.currentSession) return false;
    if (this.isMuted) {
      this.currentSession.unmute({ audio: true });
      this.isMuted = false;
    } else {
      this.currentSession.mute({ audio: true });
      this.isMuted = true;
    }
    return this.isMuted;
  }

  // Envia dígito DTMF (URA) e toca som na linha
  sendDtmf(digit: string) {
    phoneAudio.playDtmf(digit);
    if (this.currentSession) {
      try {
        this.currentSession.sendDTMF(digit);
      } catch (e) {
        console.warn("DTMF via SIP não suportado pelo provedor:", e);
      }
    }
  }

  private updateRegStatus(status: SipRegStatus) {
    this.regStatus = status;
    if (this.onRegStatusChange) this.onRegStatusChange(status);
  }

  private updateCallState(state: SipCallState) {
    this.callState = state;
    if (this.onCallStateChange) this.onCallStateChange(state);
  }
}
