# Relatório Consolidado de Não Conformidades e Vulnerabilidades — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Commit Analisado:** `9dfb1d3b7dfb5688cd90616d2705388656c71b30`  
**Data:** 28 de Outubro de 2026  
**Status da Auditoria:** Concluída (Análise Estática & Pentest Arquitetural)  

---

## 1. Quadro Resumo de Vulnerabilidades por Severidade

| ID | Severidade | Categoria | Descrição Sucinta | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CRÍTICO** | RLS / Banco de Dados | Dependência de funções do schema `private` inexistentes na migração RLS | Não Resolvido |
| **SEC-02** | **CRÍTICO** | Isolamento Multitenant | Exposição de credenciais sensíveis (SIP, IA, WhatsApp) na linha global `id=1` de `app_configuracoes` | Não Resolvido |
| **SEC-03** | **CRÍTICO** | RLS / Permissões | Políticas RLS permissivas antigas não revogadas por nomeação divergente no PostgreSQL | Não Resolvido |
| **SEC-04** | **CRÍTICO** | Disponibilidade / Chaves | Ausência de `SUPABASE_SERVICE_ROLE_KEY` quebra captura de leads e webhooks | Bloqueado por Ambiente |
| **SEC-05** | **ALTO** | Schema / Integridade | Incompatibilidade de nomes de tabelas (`tasks` vs `crm_tarefas`, `historico_ligacoes` vs `historico_chamadas`) | Não Resolvido |
| **SEC-06** | **ALTO** | Ingestão / RPC | RPC `sync_mined_lead` ausente do versionamento de migrações do repositório | Não Resolvido |
| **SEC-07** | **ALTO** | Autorização / Bypass | Autorização do painel master `/admin` e `/settings` baseada em checagens client-side bypassáveis | Não Resolvido |
| **SEC-08** | **ALTO** | Dependências / CI | `npm audit --audit-level=high` reprovado por vulnerabilidades em dependências | Não Resolvido |
| **SEC-09** | **MÉDIO** | Qualidade / React | Avisos de `react-hooks/exhaustive-deps` em `conversas`, `dialer`, `leads`, `settings`, `BroadcastModal` | Mitigável no Código |
| **SEC-10** | **MÉDIO** | Configuração / Extensão | Hardcoded URL para instância legada do Supabase em `extensions/sofia-whatsapp-web` | Não Resolvido |
| **SEC-11** | **BAIXO** | SEO / Performance | Utilização de tags `<img>` nativas em vez de `next/image` nos componentes da Landing Page | Informativo |

---

## 2. Detalhamento Técnico das Não Conformidades

---

### SEC-01 — Dependência de Funções Inexistentes no Schema `private`
- **Severidade:** **CRÍTICO**
- **Arquivos Afetados:** `supabase/migrations/20261028_rls_least_privilege.sql`
- **Análise da Causa:** A migração utiliza as funções `private.current_role()`, `private.current_operator_id()`, `private.current_operator_is_admin()` e `private.current_operator_active()` em todas as cláusulas `USING` e `WITH CHECK`. Essas funções não foram criadas em nenhuma migração anterior no repositório.
- **Impacto de Segurança:** Se a migração for executada em um banco Supabase novo ou padrão, a execução abortará. Se o schema `private` existir mas retornar `NULL`, todos os operadores legítimos perderão acesso aos seus leads e atendimentos (negação de serviço operacional).
- **Remediação Obrigatória:**
  1. Definir explicitamente o DDL do schema `private` e a implementação das funções antes de referenciá-las.
  2. Implementar fallback seguro ou garantir que o JWT do Supabase Auth popule `app_metadata.operador_id` e `app_metadata.role` no momento do login.

---

### SEC-02 — Exposição de Credenciais Globais em `app_configuracoes`
- **Severidade:** **CRÍTICO**
- **Arquivos Afetados:**
  - `src/app/telefonia/page.tsx`
  - `src/app/omnichannel/page.tsx`
  - `src/app/dialer/page.tsx`
  - `src/app/settings/page.tsx`
- **Análise da Causa:** O frontend realiza queries diretas à tabela `app_configuracoes` buscando a linha global com `.eq("id", 1).single()`. O retorno inclui em texto puro:
  - Senha SIP do PABX (`sip_password`)
  - Chaves de API do Google Gemini (`gemini_api_key`)
  - Chaves de API da Groq (`groq_api_key`)
  - Token de API do WhatsApp (`wa_api_token`)
- **Impacto de Segurança:** Qualquer usuário autenticado (incluindo operadores novatos ou estagiários) tem acesso a essas credenciais na aba Network do navegador. Além disso, a página `/telefonia` permite que qualquer operador altere o SIP global da empresa inteira.
- **Remediação Obrigatória:**
  1. Adicionar coluna `empresa_id` em `app_configuracoes` e particionar por tenant.
  2. Proteger as colunas sensíveis via RLS para que apenas o dono/gestor possa ler/alterar.
  3. Mover a resolução de senhas SIP e chaves de IA para endpoints de backend (`/api/**`), sem expor secrets no client.

---

### SEC-03 — Políticas RLS Antigas Não Revogadas por Nomeação Divergente
- **Severidade:** **CRÍTICO**
- **Arquivos Afetados:** `supabase/migrations/20261028_rls_least_privilege.sql`
- **Análise da Causa:** A migração utiliza `DROP POLICY IF EXISTS <nome_especifico>`. No PostgreSQL, políticas RLS com comportamento `PERMISSIVE` operam com união lógica (`OR`). Se o banco de produção contiver políticas legadas com outros nomes (ex.: `"Enable read access for all users"` ou `"Allow authenticated users"`), essas políticas antigas **continuarão ativas**, sobrepondo-se às políticas restritivas e anulando o isolamento por operador.
- **Impacto de Segurança:** Vazamento horizontal total de dados entre operadores e empresas concorrentes (quebra do isolamento SaaS).
- **Remediação Obrigatória:** Executar consulta no catálogo `pg_policies` antes da aplicação, garantindo que qualquer política não listada na migration seja explicitamente revogada.

---

### SEC-04 — Ausência de `SUPABASE_SERVICE_ROLE_KEY` no Ambiente
- **Severidade:** **CRÍTICO**
- **Arquivos Afetados:** `.env.local`, `.env.example`, `src/lib/supabase.ts`, `/api/leads/landing`, `/api/webhooks/**`
- **Análise da Causa:** A chave administrativa `SUPABASE_SERVICE_ROLE_KEY` não está presente no `.env.local` nem nas variáveis obrigatórias documentadas no repositório.
- **Impacto de Segurança:** Durante a compilação e em execução, o código emite alertas de segurança. Endpoints críticos como `/api/leads/landing` (captura de vendas) e `/api/webhooks/billing` (ativação de assinaturas) falham com `503 Service Unavailable`, pois implementam falha fechada quando o client admin é nulo.
- **Remediação Obrigatória:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` com segurança nas configurações de ambiente da Vercel e ambientes de staging/produção.

---

### SEC-05 — Divergência Nominal de Tabelas entre Frontend e RLS
- **Severidade:** **ALTO**
- **Arquivos Afetados:**
  - `src/app/tasks/page.tsx` (usa `tasks` vs migration `crm_tarefas`)
  - `src/app/resultados/page.tsx`, `LeadDrawer.tsx` (usam `historico_ligacoes` vs migration `historico_chamadas`)
  - `src/app/admin/page.tsx` (usa `operadores` vs `operadores_app`)
  - `src/app/scripts/page.tsx` (usa `scripts_ligacao` sem RLS)
- **Análise da Causa:** A migração `20261028_rls_least_privilege.sql` foi desenhada usando convenções nominais de CRM corporativo (`crm_tarefas`, `historico_chamadas`), enquanto o frontend consome tabelas desenvolvidas em fases anteriores (`tasks`, `historico_ligacoes`).
- **Impacto de Segurança:** A aplicação em runtime gerará erros `404 Relation Not Found` ou operará sobre tabelas desprotegidas por RLS.
- **Remediação Obrigatória:** Alinhar as tabelas do frontend para apontar para as entidades reais do schema do banco ou atualizar as políticas RLS para cobrir os nomes em uso.

---

### SEC-06 — RPC `sync_mined_lead` Ausente das Migrações
- **Severidade:** **ALTO**
- **Arquivos Afetados:** `src/app/api/leads/landing/route.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/analyze-chat/route.ts`
- **Análise da Causa:** A stored procedure `sync_mined_lead` é chamada diretamente via `.rpc("sync_mined_lead", {...})`, mas sua definição SQL não existe na pasta `supabase/migrations/`.
- **Impacto de Segurança:** Impossibilidade de replicar o ambiente em staging ou testar a esteira de captura de forma automatizada. Se a função não estiver pré-criada manualmente no banco de produção, o funil comercial e o CRM da Sofia IA quebram imediatamente.
- **Remediação Obrigatória:** Incluir o arquivo de migração contendo a criação formal da função `sync_mined_lead` com `SECURITY DEFINER` e validações de input.

---

### SEC-07 — Autorização de Telas Administrativas Baseada Apenas no Client
- **Severidade:** **ALTO**
- **Arquivos Afetados:** `src/app/admin/page.tsx`, `src/app/settings/page.tsx`, `src/app/telefonia/page.tsx`, `src/app/omnichannel/page.tsx`
- **Análise da Causa:** As verificações de privilégio (`interna === true`, perfil admin) são feitas no `useEffect` do React no navegador. Não há `middleware.ts` para barrar a entrega do HTML/JS no Next.js. Além disso, a checagem em `admin/page.tsx` usa fallback para `user_metadata.empresa_id` (que é mutável pelo usuário).
- **Impacto de Segurança:** Qualquer usuário autenticado pode acessar a interface visual de módulos administrativos e tentar explorar endpoints de backend ou RLS mal configurados.
- **Remediação Obrigatória:**
  1. Implementar `src/middleware.ts` interceptando rotas `/admin/**` e `/settings/**`.
  2. Nunca utilizar `user_metadata` para autorização de papéis ou tenant.

---

### SEC-08 — Falha de Auditoria de Dependências (`npm audit`)
- **Severidade:** **ALTO**
- **Arquivos Afetados:** `package.json`, `package-lock.json`, `.github/workflows/security-scan.yml`
- **Análise da Causa:** O workflow de CI `.github/workflows/security-scan.yml` executa `npm audit --audit-level=high`. Atualmente, existem vulnerabilidades conhecidas em `next` (GHSA-2464-fhr4-w9xw) e pacotes transitivos (`glob`, `minimatch`), que fazem o comando falhar com exit code 1.
- **Impacto de Segurança:** Falha nos gates automáticos de pipeline no GitHub Actions e risco de exploração de vulnerabilidades de SSR/DoS em versões não corrigidas.
- **Remediação Obrigatória:** Aplicar overrides no `package.json` ou atualizar para versões que solucionem as CVEs ativas sem quebrar a compatibilidade com Next 14/15 e React 18.
