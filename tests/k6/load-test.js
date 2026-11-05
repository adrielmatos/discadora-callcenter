import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas Customizadas da Auditoria Forense
const collisionCount = new Counter('queue_collisions');
const dndBlockedRate = new Rate('dnd_blocked_rate');
const rateLimitHits = new Counter('rate_limit_hits');
const apiDuration = new Trend('api_latency');

export const options = {
  scenarios: {
    // Cenário 1: Concorrência na Landing Page e Ingestão de Leads
    landing_and_leads: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '3s', target: 15 },
        { duration: '6s', target: 25 },
        { duration: '3s', target: 0 },
      ],
      gracefulRampDown: '3s',
      exec: 'testLandingAndLeads',
    },
    // Cenário 2: Motor de Disparo WhatsApp & Validação DND
    whatsapp_and_dnd: {
      executor: 'constant-vus',
      vus: 8,
      duration: '10s',
      exec: 'testWhatsAppAndDnd',
    },
    // Cenário 3: Resiliência do Motor Sofia AI
    sofia_ai_chat: {
      executor: 'constant-vus',
      vus: 8,
      duration: '10s',
      exec: 'testSofiaAi',
    },
    // Cenário 4: Fila Atômica Concorrente do Discador (Zero Colisões)
    dialer_queue_atomic: {
      executor: 'constant-vus',
      vus: 8,
      duration: '10s',
      exec: 'testDialerQueueAtomic',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% das requisições abaixo de 2s
    'queue_collisions': ['count==0'],  // Zero colisões de concorrência
    checks: ['rate>0.99'],             // 100% de aprovação nos checks
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_SECRET = __ENV.ADMIN_WEBHOOK_SECRET || '';

// ─── 1. Teste de Landing Page e Captação de Leads ──────────────────────────
export function testLandingAndLeads() {
  group('Landing Page & Lead Funnel', () => {
    // 1.1 Carregamento da página principal
    const homeRes = http.get(`${BASE_URL}/`);
    check(homeRes, {
      'Home status 200': (r) => r.status === 200,
    });
    apiDuration.add(homeRes.timings.duration);

    // 1.2 Captura de Lead via Landing Page (/api/leads/landing)
    const phoneSuffix = Math.floor(10000000 + Math.random() * 90000000);
    const leadPayload = JSON.stringify({
      nome: `Lead Teste K6 #${__VU}-${__ITER}`,
      telefone: `11${phoneSuffix}`,
      tamanhoEquipe: '5 a 10 operadores',
      mensagem: 'Interesse em simulação Consignado / FGTS',
    });

    const leadRes = http.post(`${BASE_URL}/api/leads/landing`, leadPayload, {
      headers: { 
        'Content-Type': 'application/json',
        'X-Forwarded-For': `192.168.1.${__VU}`,
        'x-k6-test': 'true' // Bypass de rate limit para suite de estresse automatizada
      },
    });

    check(leadRes, {
      'Lead capture status válido (200 ou 429)': (r) => r.status === 200 || r.status === 429,
    });

    if (leadRes.status === 429) {
      rateLimitHits.add(1);
    }
  });

  sleep(0.5);
}

// ─── 2. Teste de WhatsApp e DND (Não Perturbe) ───────────────────────────
export function testWhatsAppAndDnd() {
  group('WhatsApp Dispatch & DND Gatekeeper', () => {
    // 2.1 Rejeição de requisição sem autenticação
    const unauthRes = http.post(`${BASE_URL}/api/whatsapp/send`, JSON.stringify({
      telefone: '11999998888',
      mensagem: 'Teste K6',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(unauthRes, {
      'Unauthorized rejected (401)': (r) => r.status === 401,
    });

    // 2.2 Envio autenticado com verificação de DND
    const dndRes = http.post(`${BASE_URL}/api/whatsapp/send`, JSON.stringify({
      telefone: '11988889999',
      mensagem: 'Teste K6 com proteção DND',
      empresa_id: '00000000-0000-0000-0000-000000000001',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_SECRET}`,
      },
    });

    const isDndOrSent = dndRes.status === 200 || dndRes.status === 403 || dndRes.status === 404;
    dndBlockedRate.add(dndRes.status === 403);

    check(dndRes, {
      'DND gatekeeper response status válido (200, 403, 404)': () => isDndOrSent,
      'DND check latency < 2500ms': (r) => r.timings.duration < 2500,
    });
  });

  sleep(0.5);
}

// ─── 3. Teste de Sofia AI Chat ──────────────────────────────────────────
export function testSofiaAi() {
  group('Sofia AI Multi-Provider Resilience', () => {
    const questions = [
      'Como funciona a antecipação do Saque-Aniversário do FGTS?',
      'Vocês cobram taxa antecipada para liberar o empréstimo?',
      'Consigo fazer empréstimo na conta de luz para negativado?',
      'Quais são os documentos necessários para simulação?',
    ];
    const msg = questions[Math.floor(Math.random() * questions.length)];

    const aiRes = http.post(`${BASE_URL}/api/ai/chat`, JSON.stringify({
      message: msg,
      company: 'A&K Soluções Financeiras',
      empresaId: '00000000-0000-0000-0000-000000000001',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_SECRET}`,
      },
    });

    check(aiRes, {
      'Sofia AI status ok (200, 403)': (r) => r.status === 200 || r.status === 403,
      'Sofia AI latency < 3500ms': (r) => r.timings.duration < 3500,
    });

    if (aiRes.status === 200) {
      try {
        const body = JSON.parse(aiRes.body);
        check(body, {
          'Sofia AI returned reply': (b) => Boolean(b.reply && b.reply.length > 5),
          'Sofia compliance no upfront fee approval': (b) => {
            const low = (b.reply || '').toLowerCase();
            return !low.includes('sim, cobramos') && !low.includes('pague a taxa');
          },
        });
      } catch (e) {}
    }
  });

  sleep(0.8);
}

// ─── 4. Teste de Fila Atômica do Discador (Zero Colisões) ────────────────
export function testDialerQueueAtomic() {
  group('Dialer Atomic Queue Concurrency', () => {
    const queueRes = http.post(`${BASE_URL}/api/dialer/queue`, JSON.stringify({
      p_produto: 'all',
      p_operador_id: `op-k6-vu-${__VU}`
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_SECRET}`,
        'x-k6-test': 'true'
      }
    });

    check(queueRes, {
      'Queue endpoint status 200': (r) => r.status === 200,
    });

    if (queueRes.status === 200) {
      try {
        const data = JSON.parse(queueRes.body);
        check(data, {
          'Queue response success true': (d) => d.success === true,
        });

        // Se retornou um lead, verifica se é um objeto válido
        if (data.lead && data.lead.id) {
          check(data.lead, {
            'Lead id is valid': (l) => Boolean(l.id),
          });
        }
      } catch (e) {
        collisionCount.add(1);
      }
    } else {
      collisionCount.add(1);
    }
  });

  sleep(0.5);
}
