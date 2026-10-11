// Gerador oficial de PIX Padrão Banco Central do Brasil (EMV-QRCPS / BR Code)
// Permite gerar código "PIX Copia e Cola" dinâmico para qualquer valor e chave.

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// Cálculo do Checksum CRC-16 (Polinômio 0x1021 / Padrão CCITT-FALSE)
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadParams {
  chave: string;
  beneficiario: string;
  cidade: string;
  valor: number;
  identificador?: string;
}

export function gerarPixCopiaECola({
  chave,
  beneficiario,
  cidade,
  valor,
  identificador = "***"
}: PixPayloadParams): string {
  // Limpeza de campos
  const cleanChave = chave.trim();
  const cleanNome = beneficiario
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 25)
    .trim() || "AK SOLUCOES";
  const cleanCidade = cidade
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 15)
    .trim() || "SALVADOR";
  const strValor = valor.toFixed(2);

  // Merchant Account Information (ID 26)
  const gui = formatField("00", "br.gov.bcb.pix");
  const keyField = formatField("01", cleanChave);
  const merchantAccount = formatField("26", `${gui}${keyField}`);

  // Additional Data Field Template (ID 62)
  const txId = formatField("05", identificador.slice(0, 25) || "***");
  const additionalData = formatField("62", txId);

  // Montagem do Payload Base
  let payload =
    formatField("00", "01") + // Payload Format Indicator
    merchantAccount +
    formatField("52", "0000") + // Merchant Category Code
    formatField("53", "986") + // Transaction Currency (BRL = 986)
    formatField("54", strValor) + // Transaction Amount
    formatField("58", "BR") + // Country Code
    formatField("59", cleanNome) + // Merchant Name
    formatField("60", cleanCidade) + // Merchant City
    additionalData +
    "6304"; // CRC16 Indicator

  // Adiciona o Checksum calculado
  const checksum = crc16(payload);
  return `${payload}${checksum}`;
}

// Gera a URL do QR Code via API pública do Google Charts (rápido e sem dependências)
export function getPixQrCodeImageUrl(copiaECola: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(copiaECola)}`;
}
