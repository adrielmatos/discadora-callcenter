# Matriz de Rotas e Superfícies de Ataque — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch de Análise:** `fix/rls-least-privilege-pentest`  
**Commit:** `9dfb1d3b7dfb5688cd90616d2705388656c71b30`  
**Data da Auditoria:** 28 de Outubro de 2026  

---

## 1. Visão Geral da Arquitetura de Roteamento

A aplicação utiliza o **Next.js App Router** (`src/app/`), com renderização híbrida:
- O layout raiz (`src/app/layout.tsx`) envelopa as rotas em dois componentes centrais:
  - `AuthGuard` (`src/components/AuthGuard.tsx`): Realiza o controle de sessão no lado cliente (SPA) via Supabase Auth (`getSession()` e `onAuthStateChange`). Bloqueia o acesso a rotas privadas caso a sessão seja nula ou caso a empresa esteja `suspensa` ou com `teste` expirado.
  - `AppShell` (`src/components/AppShell.tsx`): Renderiza a `Sidebar` do painel operacional para rotas privadas e oculta a sidebar para rotas públicas.
- **Rotas Públicas Isentas:** Definidas em `PUBLIC_ROUTES = ["/", "/login", "/download-extensao"]`.

> **Vulnerabilidade Estrutural Crítica:**  
> O `AuthGuard` é um componente **estritamente client-side** (`"use client"`). Não existe middleware do Next.js (`middleware.ts`) protegendo as rotas no nível do servidor (Edge/Node SSR).  
> Consequentemente, a segurança do sistema depende **100% da integridade e cobertura do Row Level Security (RLS) no Supabase** e das validações nas rotas de API (`/api/**`).

---

## 2. Matriz de Rotas do Frontend (Páginas)

| Rota | Arquivo Fonte | Acesso Previsto | Mecanismo de Autenticação / Guarda | Riscos Identificados & Superfície de Ataque |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Público | `PUBLIC_ROUTES` (Bypass `AuthGuard` e `AppShell`) | **Baixo.** Renderiza componentes React nativos da Landing Page. Formulário de contato consome `/api/leads/landing`. |
| `/login` | `src/app/login/page.tsx` | Público | `PUBLIC_ROUTES` (Bypass `AuthGuard`) | **Médio.** Permite login via `signInWithPassword`. Ausência de captcha ou rate-limit contra brute force no client. Redireciona para `/dialer`. |
| `/download-extensao` | `src/app/download-extensao/page.tsx` | Público | `PUBLIC_ROUTES` (Bypass `AuthGuard`) | **Baixo.** Página estática com instruções e download da extensão Chrome. |
| `/dashboard` | `src/app/dashboard/page.tsx` | Autenticado | `AuthGuard` (Client-side) | **Médio.** Consulta direta via client Supabase a `empresas`, `leads`, `historico_ligacoes`, `operadores_app`. Se o RLS falhar, dados de outros tenants vazam. |
| `/dialer` | `src/app/dialer/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Crítico.** Consome RPC `obter_proximo_lead_disponivel`. Lê configurações SIP diretamente de `app_configuracoes` (`id: 1`) expondo `sip_password` ao navegador do operador. |
| `/leads` | `src/app/leads/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Alto.** Permite listagem, filtragem e importação em massa de leads via planilha (SheetJS). Inserções diretas na tabela `leads`. Depende totalmente do RLS para segregação. |
| `/conversas` | `src/app/conversas/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Alto.** Consulta `leads` com tabulações de WhatsApp/Sofia. Dispara mensagens via `/api/whatsapp/send` e IA via `/api/ai/chat`. |
| `/retornos` | `src/app/retornos/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Médio.** Consulta e atualiza tabela `retornos`. Risco de vazamento entre operadores se RLS não estiver restrito a `operador_id`. |
| `/campanhas` | `src/app/campanhas/page.tsx` | Gestor / Admin | `AuthGuard` (Client-side) | **Alto.** Gestão de campanhas. Não possui verificação de perfil no frontend; qualquer operador autenticado pode alterar status e excluir campanhas se o RLS não restringir a admins. |
| `/dnd` | `src/app/dnd/page.tsx` | Gestor / Admin | `AuthGuard` (Client-side) | **Alto.** Gestão da lista Não Perturbe. Inserção e deleção direta em `lista_nao_perturbe`. Falha no RLS permite a operadores desregulamentar números bloqueados. |
| `/scripts` | `src/app/scripts/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Alto.** Tabela `scripts_ligacao`. Não possui escopo de tenant (`empresa_id`) no frontend e a tabela foi omitida na migration `20261028_rls_least_privilege.sql`. |
| `/resultados` | `src/app/resultados/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Médio.** Relatórios gerenciais baseados em `historico_ligacoes`. Depende de RLS para não expor métricas globais a operadores simples. |
| `/tasks` | `src/app/tasks/page.tsx` | Operador / Gestor | `AuthGuard` (Client-side) | **Alto.** Código consulta tabela `tasks`, enquanto a migration endurece `crm_tarefas`. Disparidade de schema gera bypass ou erro de permissão. |
| `/telefonia` | `src/app/telefonia/page.tsx` | Gestor / Admin | `AuthGuard` (Client-side) | **Crítico.** Sem checagem de perfil (admin/gestor). Qualquer operador logado visualiza `sip_password` em texto puro e pode sobrescrever a configuração global (`id: 1`). |
| `/omnichannel` | `src/app/omnichannel/page.tsx` | Gestor / Admin | `AuthGuard` (Client-side) | **Crítico.** Sem checagem de perfil. Qualquer operador logado visualiza chaves de API (`gemini_api_key`, `groq_api_key`, `wa_api_token`) e pode atualizar a linha `id: 1` de `app_configuracoes`. |
| `/settings` | `src/app/settings/page.tsx` | Gestor / Admin | `AuthGuard` (Client-side) | **Crítico.** Gestão de empresas, operadores e faturamento SaaS. Bloqueio visual para empresas não-internas (`interna: false`), mas sem proteção no nível de rota no Next.js. |
| `/admin` | `src/app/admin/page.tsx` | Superadmin Central | `AuthGuard` (Client-side) | **Crítico.** Painel master. Checagem client-side falha se `user_metadata` for manipulado ou se o usuário não possuir `empresa_id` cadastrado. Tabela consultada (`operadores`) difere de `operadores_app`. |

---

## 3. Matriz de Rotas de Backend (API Routes)

| Endpoint | Método | Autenticação Exigida | Autorização & Isolamento de Tenant | Validação de Entrada | Resiliência & Tratamento de Falha |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | Nenhuma (Público) | N/A. Consulta `empresas.select('id').limit(1)`. | Nenhuma (sem parâmetros). | Retorna status `200` (healthy) ou `503` (unhealthy) com latência e uso de memória. |
| `/api/leads/landing` | `POST` | Nenhuma (Público) | Restrito internamente à empresa master (`interna = true`). Executa RPC `sync_mined_lead` via `supabaseAdmin`. | Valida nome (<= 150 chars) e telefone (10-13 dígitos). | **Falha Fechada:** Exige `SUPABASE_SERVICE_ROLE_KEY`. Se a chave faltar ou a empresa interna não existir, retorna `503`. Se a RPC falhar, retorna `502`. |
| `/api/webhooks/billing` | `POST` | Webhook Secret / HMAC / Bearer JWT | - **Mercado Pago:** HMAC-SHA256 (`x-signature`, `x-request-id`, `ts`).<br>- **Asaas:** Token no header `asaas-access-token`.<br>- **EFI:** Segredo no header `x-efi-secret`.<br>- **Manual:** Token Bearer JWT de admin/proprietário ou header `x-admin-secret`. | Valida assinaturas criptográficas em tempo constante (`timingSafeEqual`) e formato dos payloads. | **Falha Fechada:** Se `SUPABASE_SERVICE_ROLE_KEY` estiver ausente, retorna `503`. Se a assinatura for inválida, retorna `401`. Idempotência garantida na verificação de `status === 'paga'`. |
| `/api/webhooks/ura-dtmf` | `POST` (`GET` = 405) | Segredo URA (`x-ura-token` ou Bearer) | Tenant estritamente amarrado à variável `URA_WEBHOOK_EMPRESA_ID`. Rejeita qualquer tenant informado no body ou query string. | Valida telefone obrigatório e formata para padrão internacional (E.164 / DDI 55). | **Falha Fechada:** Consulta `lista_nao_perturbe` antes de qualquer ação; se a consulta ao DND falhar, bloqueia o processamento com `503`. |
| `/api/whatsapp/send` | `POST` | Bearer JWT (Supabase Auth) ou `ADMIN_WEBHOOK_SECRET` | Tenant obtido de `app_metadata.empresa_id` ou via `operadores_app.empresa_id`. Operador não pode enviar mensagens em nome de outro tenant. | Valida formato do telefone, tamanho da mensagem (máx 4.000 chars) e existência do lead no tenant. | **Falha Fechada:** Consulta `lista_nao_perturbe`; se a verificação falhar, aborta com `503`. Se estiver no DND, rejeita com `403`. |
| `/api/whatsapp/broadcast` | `POST` | Bearer JWT ou `ADMIN_WEBHOOK_SECRET` | Restrito ao tenant autenticado. Leads pertencentes a outros tenants são filtrados. | Valida array de contatos e mensagem. | Filtra contatos cadastrados no DND. Executa inserts individuais de histórico. |
| `/api/ai/chat` | `POST` | Bearer JWT ou `SUPABASE_SERVICE_ROLE_KEY` | Tenant obtido de `app_metadata.empresa_id` ou `operadores_app`. Busca configurações exclusivamente com `.eq("empresa_id", targetEmpresaId)`. | Valida mensagem (máx 2.000 chars) e histórico (máx 20 turnos). Sanitização Bacen anti-taxa prévia. | Se a IA falhar ou exceder rate limit (Gemini/Groq), realiza fallback no pool de chaves. Sincroniza lead no CRM via `sync_mined_lead`. |
| `/api/ai/analyze-chat` | `POST` | Bearer JWT ou `SUPABASE_SERVICE_ROLE_KEY` | Tenant obtido do JWT ou registro de operador. | Valida transcript (máx 15.000 chars). Valida schema JSON de retorno da IA. | Se a análise falhar, retorna `500`. Se a persistência via `sync_mined_lead` falhar, retorna `502`. |

---

## 4. Análise de Falhas Críticas de Superfície de Ataque

1. **Exposição de Credenciais Globais no Client-Side (`app_configuracoes`):**
   - As páginas `/telefonia` e `/omnichannel` executam `select(*)` e `update(*)` na linha global `id: 1` de `app_configuracoes`.
   - Um operador de nível básico pode abrir a página `/omnichannel`, ler a chave de API da Google Gemini e da Groq, ou o token da Evolution API / WhatsApp, além de sobrescrevê-los.
   - **Correção mandatória:** `app_configuracoes` deve ser particionada por `empresa_id`, com colunas sensíveis (API keys, senhas SIP) protegidas por RLS para leitura apenas por `DONO`/`GESTOR`, ou movidas para rotas de backend com mascaramento no client.

2. **Ausência de Middleware Server-Side para Rotas Administrativas:**
   - O acesso a `/admin`, `/settings`, `/omnichannel` e `/telefonia` não é interceptado por um Next.js Middleware. Usuários não autorizados baixam o bundle JS e montam os componentes, confiando apenas no bloqueio do RLS nas requisições Supabase.
   - **Recomendação:** Implementar `src/middleware.ts` com validação de sessão e claims de perfil antes de entregar as páginas.

3. **Inconsistência de Nomes de Tabelas entre Frontend e Migrations:**
   - O frontend consulta `tasks`, enquanto a migration RLS define políticas para `crm_tarefas`.
   - O frontend consulta `historico_ligacoes`, enquanto a migration define políticas para `historico_chamadas`.
   - O frontend consulta `operadores` em `/admin`, enquanto o resto do sistema utiliza `operadores_app`.
   - A tabela `scripts_ligacao` não possui nenhuma política RLS na migration.
