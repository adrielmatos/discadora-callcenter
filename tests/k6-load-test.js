import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas customizadas de latência e confiabilidade
const landingPageDuration = new Trend('landing_page_duration');
const healthCheckDuration = new Trend('healthcheck_duration');
const leadApiDuration = new Trend('lead_api_duration');
const rateLimitHits = new Counter('rate_limit_hits_429');
const successfulRequests = new Rate('successful_requests');

export const options = {
  stages: [
    { duration: '10s', target: 15 }, // Warm-up: sobe até 15 usuários virtuais
    { duration: '20s', target: 35 }, // Carga de trabalho contínua: 35 VUs
    { duration: '15s', target: 50 }, // Pico de estresse concorrente: 50 VUs
    { duration: '10s', target: 0 },  // Cooldown e encerramento
  ],
  thresholds: {
    'http_req_duration{endpoint:landing}': ['p(95)<500'],
    'http_req_duration{endpoint:health}': ['p(95)<300'],
    'http_req_duration': ['p(95)<700'],
    'successful_requests': ['rate>0.90'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Grupo: Navegação na Landing Page & Páginas Estáticas
  group('1. Landing Page & Static Pages', function () {
    const res = http.get(`${BASE_URL}/`, {
      tags: { endpoint: 'landing' },
    });
    landingPageDuration.add(res.timings.duration);
    const success = check(res, {
      'landing status é 200': (r) => r.status === 200,
      'landing contém marca ou corpo válido': (r) => Boolean(r.body && r.body.length > 500),
    });
    successfulRequests.add(success);

    // Navega para /login
    const loginRes = http.get(`${BASE_URL}/login`, {
      tags: { endpoint: 'login' },
    });
    check(loginRes, {
      'login status é 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // 2. Grupo: Health Check API
  group('2. API Healthcheck', function () {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { endpoint: 'health' },
    });
    healthCheckDuration.add(res.timings.duration);
    const success = check(res, {
      'healthcheck status é 200': (r) => r.status === 200,
    });
    successfulRequests.add(success);
  });

  sleep(0.3);

  // 3. Grupo: Submissão de Leads na Landing Page & Validação de Anti-Spam
  group('3. Ingestão de Leads & Rate Limiting', function () {
    const isBot = __ITER % 5 === 0;
    const payload = JSON.stringify({
      nome: `Load Test Agent ${__VU}-${__ITER}`,
      telefone: '79998105266',
      tamanhoEquipe: '2 a 5 operadores',
      mensagem: 'Teste de carga automatizado k6',
      website_url: isBot ? 'http://bot-honeypot-trigger.com' : '',
    });

    const params = {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'lead_landing' },
    };

    const res = http.post(`${BASE_URL}/api/leads/landing`, payload, params);
    leadApiDuration.add(res.timings.duration);

    if (res.status === 429) {
      rateLimitHits.add(1);
      check(res, {
        'rate limit 429 retornado corretamente': (r) => r.status === 429,
      });
    } else {
      check(res, {
        'lead ingestion responde status HTTP esperado (200, 502 ou 503)': (r) =>
          [200, 502, 503].includes(r.status),
      });
    }
  });

  sleep(0.5);

  // 4. Grupo: Webhook Security & Fail-Closed
  group('4. Webhook Security & Fail-Closed', function () {
    // Rejeição obrigatória de webhook de cobrança sem assinatura criptográfica (HTTP 401)
    const unauthorizedBilling = http.post(
      `${BASE_URL}/api/webhooks/billing`,
      JSON.stringify({ type: 'payment', data: { id: 'fake_payment_123' } }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'billing_unauthorized' },
      }
    );
    check(unauthorizedBilling, {
      'webhook de cobrança sem assinatura é rejeitado com 401': (r) => r.status === 401,
    });

    // Rejeição obrigatória na URA DTMF sem credenciais autorizadas
    const unauthorizedUra = http.post(
      `${BASE_URL}/api/webhooks/ura-dtmf`,
      JSON.stringify({ telefone: '11999998888', digit: '1' }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'ura_unauthorized' },
      }
    );
    check(unauthorizedUra, {
      'ura webhook sem autorização é rejeitado (401 ou 503)': (r) => [401, 503].includes(r.status),
    });
  });

  sleep(0.5);
}
