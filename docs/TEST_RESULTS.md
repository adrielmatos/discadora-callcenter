# Relatório de Execução de Testes e Validação — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Commit Analisado:** `9dfb1d3b7dfb5688cd90616d2705388656c71b30`  
**Data da Execução:** 28 de Outubro de 2026  

---

## 1. Resumo Consolidado das Baterias de Teste

| Bateria de Testes | Comando / Ferramenta | Resultado | Status |
| :--- | :--- | :--- | :--- |
| **Preflight Estático de Segurança** | `node scripts/security-preflight.js` | 0 erros. DDL regex, ausência de secrets embutidos e headers validados. | **PASSOU** |
| **Compilação de Produção (Next.js)** | `npm run build` | 29 rotas compiladas (10 dynamic API, 19 static). Aviso de chave ausente. | **PASSOU** |
| **Análise de Linter (ESLint)** | `npm run lint` | 0 erros impeditivos. 6 avisos de dependência em hooks, 2 avisos de `<img>`. | **PASSOU (COM AVISOS)** |
| **Suíte de Segurança Sintética** | `node scripts/audit-synthetic-tests.js` | 15 testes executados (Guardrails Bacen, HMAC-SHA256, E.164, URA Fail-Closed). | **PASSOU** |
| **Auditoria de Vulnerabilidades** | `npm audit --audit-level=high` | 9 vulnerabilidades (1 crítica em Next.js <=15.5.27, 7 altas, 1 moderada). | **FALHOU (CODE 1)** |
| **Pentest Dinâmico Multitenant / RLS** | Teste E2E contra banco Supabase | Sem ambiente de staging com credenciais seguras provisionadas. | **BLOQUEADO** |

---

## 2. Detalhes das Execuções

### 2.1. Preflight Estático de Segurança (`scripts/security-preflight.js`)
- **Comando:** `npm run preflight`
- **Resultados:**
  - Verificação de DDL perigoso no código da aplicação: Nenhuma ocorrência de `DROP TABLE`, `TRUNCATE` ou SQL injection estático.
  - Varredura de segredos em código cliente (`src/`): Nenhuma chave privada ou de serviço detectada no bundle cliente.
  - Checagem de headers de segurança em `next.config.js`: HSTS (`max-age=31536000`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin` confirmados.
- **Saída:** Código de saída 0.

### 2.2. Compilação de Produção (`npm run build`)
- **Comando:** `npm run build`
- **Ambiente:** Node.js `v24.21.0`, Next.js `14.2.3` (node_modules local) / `15.5.28` (manifesto `package.json`).
- **Rotas Compiladas com Sucesso:**
  - 10 Endpoints de API (`ƒ /api/**`): `ai/chat`, `ai/analyze-chat`, `health`, `leads/landing`, `webhooks/billing`, `webhooks/ura-dtmf`, `whatsapp/send`, `whatsapp/broadcast`.
  - 19 Páginas Estáticas (`○ /**`): `/`, `/login`, `/dashboard`, `/dialer`, `/leads`, `/conversas`, `/settings`, `/admin`, `/dnd`, etc.
- **Avisos Emitidos:**
  - `[Supabase Security Warning] SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente de produção.` (Disparado 6 vezes durante a coleta de metadados das páginas).

### 2.3. Linter e Verificação de Hooks (`npm run lint`)
- **Comando:** `npm run lint`
- **Avisos Identificados (`react-hooks/exhaustive-deps`):**
  - `src/app/conversas/page.tsx:85:6`: Dependência ausente `'fetchLeads'`.
  - `src/app/dialer/page.tsx:456:6`, `466:6`, `503:6`: Dependências ausentes `'fetchQueue'`, `'loadWhatsappHistory'`, `'triggerCall'`.
  - `src/app/leads/page.tsx:101:6`: Dependência ausente `'fetchLeads'`.
  - `src/app/settings/page.tsx:288:6`: Dependência ausente `'fetchEmpresas'`.
  - `src/components/BroadcastModal.tsx:63:6`: Dependência ausente `'fetchQueue'`.
- **Avisos de Otimização de Imagens (`@next/next/no-img-element`):**
  - `src/components/landing/FeaturesGrid.tsx:112:19`
  - `src/components/landing/Hero.tsx:198:15`

### 2.4. Suíte de Segurança Sintética (`scripts/audit-synthetic-tests.js`)
- **Comando:** `node scripts/audit-synthetic-tests.js`
- **Cobertura de Testes:**
  - **Bacen Guardrails (CDC Art. 39 e Bacen 3.954/2011):** Verificou a intercepção e substituição de respostas que solicitam "taxa de cadastro" ou "depósito prévio" por texto de conformidade institucional.
  - **Validação HMAC-SHA256 Mercado Pago:** Testou a validação de assinaturas em tempo constante (`timingSafeEqual`) e a rejeição de requisições adulteradas ou de replay com `request-id` divergente.
  - **Sanitização E.164:** Validou a normalização de números de celular e fixo brasileiros com DDD e DDI 55, além da rejeição de sequências inválidas.
  - **URA DTMF Fail-Closed:** Confirmou que ausência de token ou de tenant UUID rejeita o processamento com códigos 401 e 503.
- **Resultado:** 15 testes aprovados, 0 falhas.

### 2.5. Auditoria de Dependências (`npm audit`)
- **Comando:** `npm audit --audit-level=high`
- **Vulnerabilidades Detectadas:**
  - **Crítica (1):** `next <=15.5.27` — Server-Side Request Forgery (SSRF) / Cache Poisoning (GHSA-2464-fhr4-w9xw).
  - **Alta (7):** Pacotes utilitários transitivos (`glob`, `minimatch`, `postcss`).
- **Status:** **FALHOU** com código de saída 1. Impede a aprovação do workflow de CI `.github/workflows/security-scan.yml`.

### 2.6. Teste Dinâmico em Staging (Supabase RLS)
- **Status:** **BLOQUEADO**
- **Motivo:** Conforme as diretrizes inegociáveis de auditoria, é estritamente proibido aplicar DDL, efetuar resets ou modificar o banco de dados de produção do cliente (`vtwyojpsrjyigsnnfawa`). Um ambiente isolado de homologação/staging com credenciais próprias não foi fornecido para a realização de pentest dinâmico multi-operador com injeção de JWT.
