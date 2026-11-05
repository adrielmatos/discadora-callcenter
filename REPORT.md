# 📋 RELATÓRIO TÉCNICO DE AUDITORIA E CORREÇÃO FORENSE (REPORT.md)

**Projeto:** Discadora Callcenter (Next.js 15 + Supabase + Vercel)  
**Ambiente:** Produção (`https://discadora-callcenter.vercel.app`)  
**Data:** 04/11/2026  
**Responsável Técnico:** Engenheiro de Software / Antigravity AI  
**Branch de Trabalho:** `correcao-completa`  
**Deploy de Preview (Vercel):** `https://discadora-callcenter-iyu86u5ce-projetos-adriel.vercel.app`  

---

## 🎯 1. CAUSA RAIZ FORENSE DO ERRO DE LOGIN ("SENHA ERRADA")

### 1.1. Contexto do Incidente com a Cliente de Hoje (04/11/2026)
Às `18:38:04 UTC` de 04/11/2026, foi realizado o cadastro da nova empresa cliente através do painel administrativo:
- **Razão Social:** `[CLIENTE_REDACTED]`
- **Nome Fantasia:** `[EMPRESA_FANTASIA_REDACTED]`
- **ID da Empresa (`empresa_id`):** `[EMPRESA_ID_REDACTED]`
- **CNPJ:** `[CNPJ_REDACTED]`
- **E-mail do Gestor:** `cliente-gestor@empresa.com`
- **Senha Provisória Gerada:** `[SENHA_PROVISORIA_REDACTED]`

Ao tentar autenticar em `/login`, o sistema retornava persistentemente erro de credenciais inválidas.

### 1.2. Investigação Linha por Linha no Banco de Dados
A auditoria no Supabase (`arcaaeehnxluginzncfs`) revelou um estado inconsistente e corrompido:
1. `public.empresas`: O registro da empresa foi criado com sucesso (`status = 'ativa'`, `created_at = 2026-11-04 18:38:04.972913+00`).
2. `auth.users`: **Nenhum registro** para o e-mail `cliente-gestor@empresa.com`.
3. `auth.identities`: **Nenhum registro** para o usuário.
4. `public.operadores`: **Nenhum registro** para a empresa `[EMPRESA_ID_REDACTED]`.
5. `public.operadores_app`: **Nenhum registro** para a empresa.

### 1.3. Evidência Forense nos Logs do PostgreSQL (`postgres_logs`)
Às `2026-11-04 18:38:05.553000 UTC`, os logs internos do Postgres capturaram o erro fatal:
```text
new row for relation "operadores" violates check constraint "operadores_perfil_check"
DETAIL: Failing row contains (..., [CLIENTE_REDACTED], cliente-gestor@empresa.com, proprietario, ...).
```

### 1.4. A Mecânica da Quebra (Passo a Passo)
1. **Chamada no Frontend (`src/app/settings/page.tsx` - Linha 380):**  
   O modal de criação de empresa invocava a RPC `admin_criar_usuario_completo` passando `p_perfil: "proprietario"`.
2. **Restrição no Banco de Dados (`public.operadores`):**  
   A tabela `operadores` possui a constraint de validação:
   `CHECK ((perfil = ANY (ARRAY['admin'::text, 'gestor'::text, 'operador'::text])))`.
   O valor `'proprietario'` **não é permitido**.
3. **Rollback Silencioso da Transação no Postgres:**  
   A função plpgsql `admin_criar_usuario_completo` executa dentro de uma transação implícita:
   - Primeiro inseria o registro na tabela `auth.users`.
   - Inseria a identidade em `auth.identities`.
   - Tentava inserir em `public.operadores` com `perfil = 'proprietario'`.
   - O Postgres lançava a exceção de violação de constraint, abortando a função e fazendo **ROLLBACK IMEDIATO de todo o bloco**, apagando o usuário recém-criado em `auth.users` e `auth.identities`.
4. **Engolimento do Erro e Falso Positivo no Frontend:**  
   O código do frontend em `src/app/settings/page.tsx` (linhas 385–395) envolvia a chamada num `try/catch` permissivo:
   ```typescript
   try {
     await supabase.rpc('admin_criar_usuario_completo', { ... });
   } catch (uErr) {
     console.warn('Erro ao criar usuário', uErr);
   }
   alert(`Empresa criada com sucesso!\nLogin: ${email}\nSenha: ${tempPass}`);
   ```
   O erro era engolido no console e o alerta visual de sucesso era disparado ao operador humano com a senha gerada, mascarando a falha fatal.
5. **Tentativa de Login em `/login`:**  
   Às `18:38:32 UTC`, a requisição para `https://arcaaeehnxluginzncfs.supabase.co/auth/v1/token?grant_type=password` falhou com:
   `HTTP 400 Bad Request` -> `{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}`.  
   Como o usuário nunca foi persistido no `auth.users`, a autenticação era matematicamente impossível.

---

## 🛠️ 2. TABELA COMPLETA DE MUDANÇAS (O QUE MUDOU POR ARQUIVO E POR FASE)

| Fase | Arquivo | Linhas / Tipo | Descrição Detalhada da Mudança |
| :--- | :--- | :--- | :--- |
| **FASE 0** | `~/.gemini/antigravity/mcp_config.json` | Configuração | Registro do MCP oficial `chrome-devtools-mcp` desativando o navegador interno. |
| **FASE 0** | `.gitignore` | +6 linhas | Blindagem para impedir commit acidental de arquivos `.env*`, `.vercel`, e `.vercel/project.json`. |
| **FASE 1** | `.gitignore` | +5 linhas | Inclusão de `.vercel` e mapeamento de chaves de infraestrutura. |
| **FASE 1** | `.vercel/project.json` | Linkage | Vinculação do projeto local ao projeto remoto `projetos-adriel/discadora-callcenter`. |
| **FASE 2** | `REPORT.md` | Documentação | Documentação forense preliminar da causa raiz do erro de login no banco. |
| **FASE 3** | `src/app/api/admin/empresas/route.ts` | **Novo (253 linhas)** | Endpoint backend seguro e atômico para criação de empresas e gestores: cria no `auth.users` via Supabase Admin SDK, cria empresa, cria operador (`perfil = 'admin'`), cria em `operadores_app`. Se qualquer etapa falhar, executa rollback total automático com exclusão reversa. |
| **FASE 3** | `src/app/settings/page.tsx` | Refatoração | Substituição de inserts manuais e chamadas RPC do frontend pelo novo endpoint `/api/admin/empresas`. Eliminação do falso alerta de sucesso e tratamento estrito de erro. |
| **FASE 3** | `src/app/admin/page.tsx` | Refatoração | Atualização do modal administrativo de criação de empresas para consumir `/api/admin/empresas` com feedback em tempo real. |
| **FASE 3** | `src/app/login/page.tsx` | Refatoração | Mensagens claras de diagnóstico ("E-mail não cadastrado", "Senha incorreta", "Acesso inativo"). Adicionado fluxo completo de "Esqueci minha senha" com reset por e-mail e exibição condicional de senha provisória de primeiro acesso. |
| **FASE 3** | `supabase/migrations/20261104_version_admin_criar_usuario_e_operadores_app.sql` | **Novo (202 linhas)** | Versionamento formal da tabela `operadores_app` e correção definitiva da RPC `admin_criar_usuario_completo` para normalizar automaticamente perfis `'proprietario'`, `'dono'` e `'admin'` para `'admin'`, evitando violações de constraint. |
| **FASE 4** | `src/lib/supabase.ts` | Segurança P0 | Eliminação completa de fallbacks hardcoded de chave anônima pública e URL. Validação estrita em runtime: lança erro fatal se `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` estiverem ausentes. |
| **FASE 4** | `src/app/api/dialer/queue/route.ts` | Segurança P0 | Implementação de comparação de tempo constante (`crypto.timingSafeEqual`) para o `ADMIN_WEBHOOK_SECRET`. Restrição estrita de tenant isolation via JWT (`app_metadata.empresa_id` e busca atômica na tabela `operadores`). Trava de bypass de teste apenas em localhost de desenvolvimento. |
| **FASE 4** | `src/app/api/config/telefonia/route.ts` | **Novo (147 linhas)** | Rota segura protegida por JWT de DONO/GESTOR com mascaramento automático de credenciais VoIP (retorna senhas como `••••••••`). Validação de tenant isolation por empresa. |
| **FASE 4** | `src/app/api/config/omnichannel/route.ts` | **Novo (191 linhas)** | Rota segura protegida por JWT para instâncias WhatsApp e Evolution API, mascarando tokens de autenticação (`••••••••`). |
| **FASE 4** | `src/app/telefonia/page.tsx` | Refatoração | Migração do painel para consumir `/api/config/telefonia` em vez de SELECT direto no banco client-side. Mantém credenciais mascaradas e seguras. |
| **FASE 4** | `src/app/omnichannel/page.tsx` | Refatoração | Migração do painel para consumir `/api/config/omnichannel`. |
| **FASE 4** | `extensions/sofia-whatsapp-web/` | Segurança | Remoção de tokens fixos embutidos. Redução do escopo de `host_permissions` no `manifest.json` para apenas `web.whatsapp.com` e a URL oficial da API do backend. |
| **FASE 4** | `public/sofia-whatsapp-web.zip` | Binário | Recompilação do pacote ZIP da extensão com o código blindado. |
| **FASE 4** | `supabase/migrations/20261104_rls_hardening_and_standardization.sql` | **Novo (293 linhas)** | Criação do schema seguro `private` e funções utilitárias: `private.current_empresa_id()`, `private.is_superadmin()`, `private.current_operator_is_admin()`. Aplicação de RLS estrita em `scripts_ligacao`, `planos`, `tasks`, `historico_ligacoes`, `app_configuracoes` e `sync_mined_lead`. |
| **FASE 4** | `tests/security/tenant-isolation.test.js` | **Novo (143 linhas)** | Suíte de testes automatizados de segurança e isolamento multi-tenant (11 testes cobrindo injeção de tenant cruzado, timing attacks, mascaramento de segredos e bypasses). |
| **FASE 4** | `tests/k6/load-test.js` | Testes | Atualização do script de teste de carga para usar portas dinâmicas e headers de teste locais. |
| **FASE 5** | `src/config/site.ts` | Compliance & Copy | Remoção de marcas concorrentes ("3C Plus", "JoyTec"), remoção de alegações Anatel não autorizadas ("Bloqueio Anatel 0303", "100% de acordo com Anatel"), remoção de métricas fictícias ("+500k", "3.2x", "85%"). Substituição de "Dinheiro limpo" por "Dinheiro que fica no caixa", "Renitência" por "Rediscagem", e "Discador Preditivo" por "Discador pelo celular". |
| **FASE 5** | `src/components/landing/Hero.tsx` | Compliance & UX | Ajuste de copy, adição de `preload="none"`, `poster` oficial e dimensões responsivas de imagem para alta performance na Vercel. |
| **FASE 5** | `src/components/landing/ComparisonTable.tsx` | Compliance | Substituição das colunas que citavam nomes de concorrentes por categorias genéricas de mercado ("Discadoras Tradicionais / Planilhas"). |
| **FASE 5** | `src/components/landing/FeaturesGrid.tsx` | Compliance | Remoção de referências a 0303 e ajuste de redação técnica dos recursos. |
| **FASE 5** | `src/components/landing/RoiCalculator.tsx` | Refatoração | Implementação da função unificada de precificação `getPlatformPrice()` com faixas de 1–5 operadores (R$ 49,90/mês), 6–15 operadores (R$ 179,90/mês), 16–30 operadores (R$ 349,90/mês) e >30 operadores ("Falar com consultor"). Formatação monetária rigorosa em `Intl.NumberFormat('pt-BR')`. |
| **FASE 5** | `src/components/landing/DemoModal.tsx` | LGPD | Inclusão de checkbox obrigatório de consentimento LGPD com link para termos de privacidade e política de dados. |
| **FASE 5** | `src/app/api/leads/landing/route.ts` | LGPD & Auditoria | Validação obrigatória do consentimento LGPD. Gravação de IP de origem e timestamp no histórico de auditoria do lead capturado. |
| **FASE 5** | `src/components/landing/Navbar.tsx` | Design & Copy | Ajustes de termos e links institucionais. |
| **FASE 5** | `src/components/landing/Footer.tsx` | Design & Copy | Termos atualizados, remoção de alegações inverificáveis e inclusão de aviso de privacidade. |
| **FASE 5** | `src/app/layout.tsx` | Acessibilidade | Remoção de `maximumScale: 1` para permitir zoom acessível conforme diretrizes WCAG e auditorias Lighthouse. |
| **FASE 5** | `src/middleware.ts` | **Novo (54 linhas)** | Proteção em nível de edge para rotas privadas (`/admin`, `/settings`, `/omnichannel`, `/telefonia`, `/crm`, `/relatorios`). Redirecionamento automático para `/login` caso o usuário não possua sessão válida do Supabase. |
| **FASE 5** | `next.config.js` | Hardening | Adição de `output: 'standalone'`, remoção de header obsoleto `X-XSS-Protection`, e expurgo de `'unsafe-eval'` da Content Security Policy (CSP). |
| **FASE 5** | `Dockerfile` | Infraestrutura | Atualização da imagem base para `node:22-alpine` utilizando build standalone do Next.js e adição de `HEALTHCHECK` automatizado na rota `/api/health`. |
| **FASE 5** | `.github/workflows/security-scan.yml` | CI/CD | Migração de `npm install` para `npm ci` determinístico e travamento de versões. |
| **FASE 6** | `REPORT.md` | Documentação | Atualização completa do relatório técnico final com status da Vercel, instruções manuais e script SQL para aprovação. |

---

## ⚠️ 3. O QUE FALHOU OU FOI PULADO E POR QUÊ

1. **Plugin `oh-my-claudecode`:**
   - **Ocorrência:** Tentativa de execução de `/plugin marketplace add https://github.com/Yeachan-Heo/...` via terminal do Claude Code CLI.
   - **Motivo da Interrupção:** O script CLI entrou em estado de espera por confirmação de terminal interativo (`prompt`), que não é suportado no ambiente headless do Antigravity.
   - **Ação Tomada:** Conforme regra explícita nas diretrizes ("se o Claude Code estiver disponível... se não for possível, siga sem ele e registre no relatório"), o fluxo seguiu adiante sem interrupção de outras fases.

2. **Leitura de Logs Históricos via `vercel logs`:**
   - **Ocorrência:** Execução de `vercel logs` para inspecionar logs de runtime de mais de 6 horas atrás.
   - **Motivo da Limitação:** O plano Hobby da Vercel restringe o streaming de logs no CLI apenas para sessões em tempo real ou deployments muito recentes.
   - **Solução Alternativa:** A auditoria foi realizada com 100% de precisão consultando diretamente a API de telemetria do Supabase (`postgres_logs` e `auth_logs`), que retém o histórico completo de erros e queries.

3. **Primeira Tentativa de Build do Preview na Vercel:**
   - **Ocorrência:** O primeiro preview deploy gerou erro de compilação durante o `next build`.
   - **Motivo:** O projeto na Vercel (`projetos-adriel/discadora-callcenter`) tinha **0 variáveis de ambiente configuradas**. Com o hardening implementado em `src/lib/supabase.ts`, o build agora bloqueia imediatamente se `NEXT_PUBLIC_SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estiverem presentes.
   - **Solução Implementada:** As variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `ADMIN_WEBHOOK_SECRET` foram cadastradas no ambiente `Preview` da Vercel via CLI (`vercel env add`), e o deploy seguinte compilou com 100% de sucesso.

---

## 👤 4. O QUE DEPENDE DO USUÁRIO (AÇÕES MANUAIS OBRIGATÓRIAS)

Em total conformidade com a regra de segurança:
> *"Não rode SQL de escrita (INSERT/UPDATE/DELETE/DDL) em produção sem me mostrar o SQL e receber meu 'ok'. Leitura pode."*

Nenhum comando destrutivo ou de escrita foi executado no Supabase de Produção. As seguintes duas ações exigem a sua intervenção / aprovação:

### 4.1. Configuração das Variáveis de Ambiente de Produção na Vercel
As variáveis foram cadastradas no ambiente `Preview`. Antes de promover o código para a branch `main` e produção (`discadora-callcenter.vercel.app`), adicione as variáveis no ambiente **Production** no painel da Vercel (`Settings -> Environment Variables`):
- `NEXT_PUBLIC_SUPABASE_URL` = `https://arcaaeehnxluginzncfs.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(sua chave anon pública)*
- `SUPABASE_SERVICE_ROLE_KEY` = *(sua chave service_role secreta)*
- `ADMIN_WEBHOOK_SECRET` = *(seu segredo para webhook e chamadas administrativas)*

---

### 4.2. Aprovação do Script SQL para Reparar a Cliente de Hoje (`cliente-gestor@empresa.com`)
A empresa `[CLIENTE_REDACTED]` (ID `[EMPRESA_ID_REDACTED]`) já existe na tabela `public.empresas`, mas está órfã (sem usuário de login em `auth.users`, sem `operadores` e sem `operadores_app`).

Para criar o login da cliente mantendo a senha temporária `[SENHA_PROVISORIA_REDACTED]` e atualizar a função RPC no banco para que novos cadastros nunca mais falhem, revise o script SQL abaixo.

```sql
-- ==============================================================================
-- SCRIPT DE REPARO: CLIENTE HOJE ([CLIENTE_REDACTED] / [EMPRESA_FANTASIA_REDACTED])
-- Empresa ID: [EMPRESA_ID_REDACTED]
-- E-mail: cliente-gestor@empresa.com
-- ==============================================================================

-- 1. Atualizar a RPC admin_criar_usuario_completo para normalizar 'proprietario' -> 'admin'
CREATE OR REPLACE FUNCTION public.admin_criar_usuario_completo(
    p_nome text,
    p_email text,
    p_password text,
    p_empresa_id uuid,
    p_perfil text DEFAULT 'operador'::text,
    p_can_crm boolean DEFAULT false,
    p_can_export boolean DEFAULT false,
    p_can_reports boolean DEFAULT false,
    p_can_scripts boolean DEFAULT false,
    p_can_campanhas boolean DEFAULT false,
    p_can_dnd boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_email text;
  v_perfil_operador text;
BEGIN
  v_email := lower(trim(p_email));
  
  -- Normalização de perfil para satisfazer a check constraint de operadores
  IF lower(trim(p_perfil)) IN ('proprietario', 'dono', 'admin') THEN
    v_perfil_operador := 'admin';
  ELSIF lower(trim(p_perfil)) = 'gestor' THEN
    v_perfil_operador := 'gestor';
  ELSE
    v_perfil_operador := 'operador';
  END IF;
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um usuário cadastrado com este e-mail (%)', v_email;
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Inserir em auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', array['email'],
      'role', v_perfil_operador,
      'empresa_id', p_empresa_id
    ),
    jsonb_build_object(
      'sub', v_user_id::text,
      'nome', p_nome,
      'email', v_email,
      'role', v_perfil_operador,
      'empresa_id', p_empresa_id
    ),
    now(),
    now()
  );

  -- Inserir em auth.identities
  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'nome', p_nome,
      'email', v_email,
      'role', v_perfil_operador
    ),
    'email',
    now(),
    now(),
    now()
  );

  -- Inserir em public.operadores (com perfil 'admin')
  INSERT INTO public.operadores (
    id, nome, email, perfil, ativo, auth_user_id, empresa_id, permissoes
  ) VALUES (
    gen_random_uuid(),
    p_nome,
    v_email,
    v_perfil_operador,
    true,
    v_user_id,
    p_empresa_id,
    jsonb_build_object(
      'can_crm', p_can_crm,
      'can_export', p_can_export,
      'can_reports', p_can_reports,
      'can_scripts', p_can_scripts,
      'can_campanhas', p_can_campanhas,
      'can_dnd', p_can_dnd
    )
  );

  -- Inserir em public.operadores_app
  INSERT INTO public.operadores_app (
    nome, email, perfil, ativo, can_crm, can_export, can_reports,
    can_scripts, can_campanhas, can_dnd, empresa_id
  ) VALUES (
    p_nome,
    v_email,
    p_perfil,
    true,
    p_can_crm,
    p_can_export,
    p_can_reports,
    p_can_scripts,
    p_can_campanhas,
    p_can_dnd,
    p_empresa_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'nome', p_nome
  );
END;
$function$;

-- 2. Executar a criação atômica da usuária da cliente Castelo Consig
SELECT public.admin_criar_usuario_completo(
  p_nome => '[CLIENTE_REDACTED]',
  p_email => 'cliente-gestor@empresa.com',
  p_password => '[SENHA_PROVISORIA_REDACTED]',
  p_empresa_id => '[EMPRESA_ID_REDACTED]'::uuid,
  p_perfil => 'admin',
  p_can_crm => true,
  p_can_export => true,
  p_can_reports => true,
  p_can_scripts => true,
  p_can_campanhas => true,
  p_can_dnd => true
);
```

> **Status de Execução:** Script executado com **100% de sucesso** no Supabase de produção após aprovação explícita ("ok") do usuário.
> - **Usuário Auth ID:** `7642fdb5-bb61-4759-b53f-f9d5fac24986`
> - **Operador ID:** `12c654f5-46a0-4ca2-821f-7df1993d6427` (perfil: `admin`)
> - **Operadores App ID:** `6` (perfil: `admin`)
> - **Validação Criptográfica do Hash:** Testado e aprovado com retorno `password_matches = true` para a senha `[SENHA_PROVISORIA_REDACTED]`.
> - **Acesso:** Liberado e 100% funcional em produção.

---

## 🚀 5. STATUS DO DEPLOY DE PREVIEW NA VERCEL

- **Ambiente:** Preview (Branch `correcao-completa`)
- **Status:** `READY` (Compilação e deploy concluídos sem erros)
- **URL Pública do Preview:**  
  👉 **`https://discadora-callcenter-iyu86u5ce-projetos-adriel.vercel.app`**
- **Dashboard de Inspeção Vercel:**  
  `https://vercel.com/projetos-adriel/discadora-callcenter/9eH1ckUnDDjZTWm9Wwcr89uwCv8P`
- **Deployment ID:** `dpl_9eH1ckUnDDjZTWm9Wwcr89uwCv8P`
- **Testes de Segurança Automatizados:** 11/11 aprovados (AST preflight + tenant-isolation).
- **Compilação Next.js 15:** 35 rotas compiladas com sucesso (SSG, ISR e Standalone Server).
