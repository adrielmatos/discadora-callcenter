/**
 * Suíte de Testes Sintéticos de Segurança e Conformidade
 * Executa verificações de unidade sobre guardrails do Bacen, validação de assinaturas e sanitização.
 */

const { createHmac, timingSafeEqual } = require("node:crypto");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASSOU: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FALHOU: ${testName}`);
    testsFailed++;
  }
}

console.log("=================================================================");
console.log("TESTES SINTÉTICOS DE SEGURANÇA E CONFORMIDADE (AUDITORIA)");
console.log("=================================================================\n");

// 1. Teste de Guardrail Bacen (Resoluções 3.954 e CDC Art. 39)
console.log("1. Verificando Guardrail Bacen contra cobrança de taxa prévia...");
function sanitizeBacenReply(text) {
  if (!text) return "";
  const forbiddenPatterns = [
    /taxa\s+(de\s+)?(cadastro|abertura|seguro|antecipada)/i,
    /dep[oó]sito\s+pr[eé]vio/i,
    /pagar\s+(algo|valor|taxa)\s+antes/i
  ];
  if (forbiddenPatterns.some(pattern => pattern.test(text))) {
    return "Nosso atendimento é 100% gratuito e não cobramos nenhuma taxa antecipada, em estrita conformidade com as normas do Banco Central. Deseja realizar sua simulação gratuita agora?";
  }
  return text;
}

const safeText = "Sua margem disponível é de R$ 350,00. Deseja simular?";
assert(sanitizeBacenReply(safeText) === safeText, "Texto legítimo não é alterado");

const prohibitedText1 = "Para liberar o empréstimo, você precisa pagar taxa de cadastro de R$ 50.";
assert(sanitizeBacenReply(prohibitedText1).includes("100% gratuito"), "Bloqueia 'taxa de cadastro'");

const prohibitedText2 = "Exigimos um depósito prévio para cobrir os custos do contrato.";
assert(sanitizeBacenReply(prohibitedText2).includes("100% gratuito"), "Bloqueia 'depósito prévio'");


// 2. Teste de Validação de Assinatura HMAC Mercado Pago
console.log("\n2. Verificando Validação Criptográfica de Assinatura Webhook (HMAC-SHA256)...");
function verifyMercadoPagoSignature(webhookSecret, dataId, requestId, timestamp, suppliedSignature) {
  if (!webhookSecret || !timestamp || !suppliedSignature || !requestId || !dataId) {
    return false;
  }
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedSignature = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
  
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const suppliedBuffer = Buffer.from(suppliedSignature, "hex");
  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

const secret = "test_webhook_secret_key_12345";
const dataId = "123456789";
const reqId = "req-uuid-999";
const ts = "1729000000";
const validManifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
const validSig = createHmac("sha256", secret).update(validManifest).digest("hex");

assert(verifyMercadoPagoSignature(secret, dataId, reqId, ts, validSig) === true, "Assinatura válida é aceita");
assert(verifyMercadoPagoSignature(secret, dataId, reqId, ts, "deadbeef1234") === false, "Assinatura incorreta é rejeitada");
assert(verifyMercadoPagoSignature(secret, dataId, "different-req", ts, validSig) === false, "Replay com request-id adulterado é rejeitado");


// 3. Teste de Sanitização e Formatação de Telefones
console.log("\n3. Verificando Formatação e Validação de Telefones E.164...");
function formatPhone(raw) {
  const digitsOnly = String(raw || "").replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 13) return null;
  if (!digitsOnly.startsWith("55") && (digitsOnly.length === 10 || digitsOnly.length === 11)) {
    return `55${digitsOnly}`;
  }
  return digitsOnly;
}

assert(formatPhone("(11) 98765-4321") === "5511987654321", "Formata celular com DDD sem DDI");
assert(formatPhone("1133334444") === "551133334444", "Formata fixo com DDD");
assert(formatPhone("5511987654321") === "5511987654321", "Preserva número já com DDI 55");
assert(formatPhone("1234") === null, "Rejeita número curto inválido");
assert(formatPhone("1199999999999999") === null, "Rejeita número longo inválido");


// 4. Teste de Fail-Closed para URA DTMF
console.log("\n4. Verificando Regras de Falha Fechada na URA DTMF...");
function checkUraConfig(secret, token, empresaId) {
  if (!secret || !token || secret !== token) {
    return { ok: false, status: 401, error: "Acesso negado" };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!empresaId || !uuidRegex.test(empresaId)) {
    return { ok: false, status: 503, error: "Integração URA não configurada para tenant válido" };
  }
  return { ok: true, status: 200 };
}

assert(checkUraConfig("token123", "wrong_token", "c748c97e-1234-4567-89ab-cdef01234567").ok === false, "Rejeita token inválido");
assert(checkUraConfig("token123", "token123", "").ok === false, "Rejeita execução sem tenant configurado");
assert(checkUraConfig("token123", "token123", "invalid-uuid").ok === false, "Rejeita tenant com UUID malformado");
assert(checkUraConfig("token123", "token123", "c748c97e-1234-4567-89ab-cdef01234567").ok === true, "Aceita configuração válida");

console.log("\n=================================================================");
console.log(`TOTAL: ${testsPassed + testsFailed} testes | PASSARAM: ${testsPassed} | FALHARAM: ${testsFailed}`);
console.log("=================================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
