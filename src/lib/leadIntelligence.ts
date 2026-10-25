/**
 * Lead Intelligence & Data Quality Engine - A&K One Platform Enterprise
 * Validação algorítmica de CPFs (Receita Federal), higienização de telefones (Regra Anatel)
 * Deduplicação inteligente e parser de múltiplos formatos (CSV/TSV/XLSX)
 */

export interface LeadQualityStats {
  total: number;
  valid: number;
  duplicatesRemoved: number;
  cpfsValidated: number;
  cpfsInvalid: number;
  phonesSanitized: number;
  phonesInvalid: number;
}

/**
 * Validação matemática oficial de CPF da Receita Federal
 * Checa os 2 dígitos verificadores através de soma ponderada
 */
export function validateCPF(rawCpf: string | null | undefined): {
  isValid: boolean;
  cleanCPF: string;
  formattedCPF: string;
} {
  if (!rawCpf) return { isValid: false, cleanCPF: "", formattedCPF: "" };

  const digits = String(rawCpf).replace(/\D/g, "");

  // CPF precisa ter exatamente 11 dígitos
  if (digits.length !== 11) {
    return { isValid: false, cleanCPF: digits, formattedCPF: digits };
  }

  // Elimina sequências conhecidas de dígitos repetidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { isValid: false, cleanCPF: digits, formattedCPF: digits };
  }

  // Cálculo do 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(9), 10)) {
    return { isValid: false, cleanCPF: digits, formattedCPF: digits };
  }

  // Cálculo do 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits.charAt(10), 10)) {
    return { isValid: false, cleanCPF: digits, formattedCPF: digits };
  }

  const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  return { isValid: true, cleanCPF: digits, formattedCPF: formatted };
}

// Lista oficial de DDDs válidos do Brasil (Anatel)
const VALID_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19", // SP
  "21", "22", "24", // RJ
  "27", "28", // ES
  "31", "32", "33", "34", "35", "37", "38", // MG
  "41", "42", "43", "44", "45", "46", // PR
  "47", "48", "49", // SC
  "51", "53", "54", "55", // RS
  "61", // DF
  "62", "64", // GO
  "63", // TO
  "65", "66", // MT
  "67", // MS
  "68", // AC
  "69", // RO
  "71", "73", "74", "75", "77", // BA
  "79", // SE
  "81", "87", // PE
  "82", // AL
  "83", // PB
  "84", // RN
  "85", "88", // CE
  "86", "89", // PI
  "91", "93", "94", // PA
  "92", "97", // AM
  "95", // RR
  "96", // AP
  "98", "99"  // MA
]);

/**
 * Higienização de telefones segundo normas da Anatel
 * Injeta o 9º dígito em celulares móveis com 8 dígitos e normaliza para DDI 55
 */
export function sanitizePhone(rawPhone: string | null | undefined): {
  isValid: boolean;
  cleanPhone: string;
  formattedPhone: string;
  isMobile: boolean;
  ddd: string;
} {
  if (!rawPhone) {
    return { isValid: false, cleanPhone: "", formattedPhone: "", isMobile: false, ddd: "" };
  }

  let digits = String(rawPhone).replace(/\D/g, "");

  // Remove zero à esquerda no DDD se houver (ex: 011988887777 -> 11988887777)
  if (digits.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }

  // Remove código internacional 55 se vier incluso
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) {
    return { isValid: false, cleanPhone: digits, formattedPhone: digits, isMobile: false, ddd };
  }

  let localNumber = digits.slice(2);

  // Caso seja número móvel com 8 dígitos antigos (ex: 98887777 ou 88887777), injeta o 9
  if (localNumber.length === 8 && /^[6-9]/.test(localNumber)) {
    localNumber = "9" + localNumber;
    digits = ddd + localNumber;
  }

  const isMobile = localNumber.length === 9 && localNumber.startsWith("9");
  const isLandline = localNumber.length === 8 && /^[2-5]/.test(localNumber);

  if (!isMobile && !isLandline) {
    return { isValid: false, cleanPhone: digits, formattedPhone: digits, isMobile, ddd };
  }

  const formattedPhone = isMobile
    ? `(${ddd}) ${localNumber.slice(0, 5)}-${localNumber.slice(5)}`
    : `(${ddd}) ${localNumber.slice(0, 4)}-${localNumber.slice(4)}`;

  return {
    isValid: true,
    cleanPhone: digits,
    formattedPhone,
    isMobile,
    ddd
  };
}

/**
 * Parser de arquivos CSV / TSV de alta tolerância (detecta separador vírgula, ponto-e-vírgula ou tab)
 */
export function parseCSV(csvText: string): Record<string, any>[] {
  const lines = csvText.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detecta o delimitador mais frequente na primeira linha
  const headerLine = lines[0];
  const countComma = (headerLine.match(/,/g) || []).length;
  const countSemicolon = (headerLine.match(/;/g) || []).length;
  const countTab = (headerLine.match(/\t/g) || []).length;

  let delimiter = ",";
  if (countSemicolon > countComma && countSemicolon > countTab) delimiter = ";";
  else if (countTab > countComma && countTab > countSemicolon) delimiter = "\t";

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        result.push(current.trim().replace(/^"|"$/g, "").trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, "").trim());
    return result;
  };

  const headers = splitLine(headerLine);
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, index) => {
      rowObj[h] = values[index] !== undefined ? values[index] : "";
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Motor de Deduplicação e Enriquecimento em Lote
 */
export function processLeadsBatch(rawRows: any[], defaultEmpresaId?: string): {
  cleanLeads: any[];
  stats: LeadQualityStats;
} {
  const stats: LeadQualityStats = {
    total: rawRows.length,
    valid: 0,
    duplicatesRemoved: 0,
    cpfsValidated: 0,
    cpfsInvalid: 0,
    phonesSanitized: 0,
    phonesInvalid: 0
  };

  const seenPhones = new Set<string>();
  const seenCpfs = new Set<string>();
  const cleanLeads: any[] = [];

  for (const row of rawRows) {
    // 1. Sanitização do telefone
    const phoneInfo = sanitizePhone(row.telefone);
    if (!phoneInfo.isValid) {
      stats.phonesInvalid++;
      continue; // Ignora lead sem telefone nacional válido
    }

    if (phoneInfo.cleanPhone !== String(row.telefone).replace(/\D/g, "")) {
      stats.phonesSanitized++;
    }

    // 2. Validação do CPF
    let validCpfFormatted: string | null = null;
    if (row.cpf) {
      const cpfInfo = validateCPF(row.cpf);
      if (cpfInfo.isValid) {
        stats.cpfsValidated++;
        validCpfFormatted = cpfInfo.formattedCPF;
      } else {
        stats.cpfsInvalid++;
        validCpfFormatted = null; // Zera CPF corrompido para não poluir
      }
    }

    // 3. Deduplicação inteligente
    if (seenPhones.has(phoneInfo.cleanPhone)) {
      stats.duplicatesRemoved++;
      continue;
    }
    if (validCpfFormatted && seenCpfs.has(validCpfFormatted)) {
      stats.duplicatesRemoved++;
      continue;
    }

    seenPhones.add(phoneInfo.cleanPhone);
    if (validCpfFormatted) seenCpfs.add(validCpfFormatted);

    stats.valid++;
    cleanLeads.push({
      ...row,
      telefone: phoneInfo.cleanPhone,
      cpf: validCpfFormatted,
      empresa_id: row.empresa_id || defaultEmpresaId || "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3"
    });
  }

  return { cleanLeads, stats };
}
