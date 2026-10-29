# Relatório Consolidado de Não Conformidades e Vulnerabilidades — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Data da Auditoria:** 28 de Outubro de 2026  
**Status da Auditoria:** Concluída com Correções de Código e Migrações de Suporte Aplicadas  

---

## 1. Quadro Resumo de Vulnerabilidades por Severidade

| ID | Severidade | Categoria | Descrição Sucinta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRÍTICO** | RLS / Banco de Dados | Dependência de funções do schema `private` inexistentes na migração RLS | **Corrigido no Código** (Criada migration `20261028_private_auth_helpers.sql`) |
| **SEC-02** | **CRÍTICO** | Isolamento Multitenant | Exposição de credenciais sensíveis (SIP, IA, WhatsApp) na linha global `id=1` de `app_configuracoes` | Em Análise de Arquitetura |
| **SEC-03** | **CRÍTICO** | RLS / Permissões | Políticas RLS permissivas antigas não revogadas por nomeação divergente no PostgreSQL | Aguardando Staging DB |
| **SEC-04** | **CRÍTICO** | Disponibilidade / Chaves | Ausência de `SUPABASE_SERVICE_ROLE_KEY` quebra captura de leads e webhooks | Bloqueado por Ambiente Vercel |
| **SEC-05** | **ALTO** | Schema / Integridade | Incompatibilidade de nomes de tabelas (`tasks` vs `crm_tarefas`, `historico_ligacoes` vs `historico_chamadas`, `operadores`) | **Corrigido no Código** (`admin/page.tsx` ajustado e RLS cobrindo `tasks` e `historico_ligacoes`) |
| **SEC-06** | **ALTO** | Ingestão / RPC | RPC `sync_mined_lead` ausente do versionamento de migrações do repositório | **Corrigido no Código** (Definida em `20261028_private_auth_helpers.sql`) |
| **SEC-07** | **ALTO** | Autorização / Bypass | Autorização do painel master `/admin` e `/settings` baseada em checagens client-side bypassáveis | **Corrigido no Código** (Validação server-managed em `admin/page.tsx`) |
| **SEC-08** | **ALTO** | Dependências / CI | `npm audit --audit-level=high` reprovado por vulnerabilidades em dependências | Em Mitigação de Versão |
| **SEC-09** | **MÉDIO** | Qualidade / React | Avisos de `react-hooks/exhaustive-deps` em `conversas`, `dialer`, `leads`, `settings`, `BroadcastModal` | **100% Corrigido** (0 warnings no `next lint`) |
| **SEC-10** | **MÉDIO** | Configuração / Extensão | Hardcoded URL para instância legada do Supabase em `extensions/sofia-whatsapp-web` | **Corrigido no Código** (Apontando para `vtwyojpsrjyigsnnfawa`) |
| **SEC-11** | **BAIXO** | SEO / Performance | Utilização de tags `<img>` nativas em vez de `next/image` nos componentes da Landing Page | **100% Corrigido** (`next/image` com fill e prioridade em `Hero` e `FeaturesGrid`) |

---

## 2. Detalhamento Técnico das Correções Realizadas

### SEC-01 & SEC-06 — Criação do Schema `private` e RPC `sync_mined_lead`
- **Arquivo Criado:** `supabase/migrations/20261028_private_auth_helpers.sql`
- **Solução Implementada:**
  - `CREATE SCHEMA IF NOT EXISTS private;`
  - Implementadas as funções `private.current_role()`, `private.current_operator_id()`, `private.current_operator_is_admin()` e `private.current_operator_active()` com `SECURITY DEFINER` e extração imutável do `app_metadata` do JWT.
  - Implementada a stored procedure `public.sync_mined_lead` completa, com sanitização de telefone (E.164), resolução de empresa padrão, inserção atômica e retorno padronizado `{ "lead_id": ..., "phone": ... }`.

### SEC-05 & SEC-07 — Reconciliação Nominal e Blindagem do Painel `/admin`
- **Arquivos Alterados:** `src/app/admin/page.tsx`, `supabase/migrations/20261028_private_auth_helpers.sql`
- **Solução Implementada:**
  - Substituída a query `.from("operadores")` por `.from("operadores_app")`.
  - Removido o fallback vulnerável para `user_metadata.empresa_id` em `/admin`, exigindo `app_metadata.empresa_id` e conferindo a flag `interna === true`.
  - Criadas políticas RLS explícitas para as tabelas `tasks`, `historico_ligacoes`, `scripts_ligacao` e `planos`.

### SEC-09 & SEC-11 — Eliminação Total de Avisos e Otimização de Performance
- **Arquivos Alterados:** `Hero.tsx`, `FeaturesGrid.tsx`, `conversas/page.tsx`, `leads/page.tsx`, `BroadcastModal.tsx`, `dialer/page.tsx`, `settings/page.tsx`.
- **Solução Implementada:**
  - Substituição de tags brutas `<img>` por `<Image fill priority/sizes />` do Next.js nos componentes da Landing Page.
  - Ajuste de dependências React com `useCallback` e memoização de queries.
  - Redução do limite inicial de busca de leads de 500 para 200 registros.
  - **Resultado:** `npm run lint` executa limpo com `✔ No ESLint warnings or errors`.

### SEC-10 — Correção da Extensão Chrome Sofia WhatsApp
- **Arquivo Alterado:** `extensions/sofia-whatsapp-web/content.js`
- **Solução Implementada:**
  - Atualizada a constante `SUPABASE_REST_URL` de `arcaaeehnxluginzncfs.supabase.co` para `https://vtwyojpsrjyigsnnfawa.supabase.co/rest/v1/rpc/sync_mined_lead`, alinhando a extensão com a instância ativa.
