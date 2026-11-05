# 📋 RELATÓRIO TÉCNICO DE AUDITORIA E CORREÇÃO FORENSE (REPORT.md)

**Projeto:** Discadora Callcenter (Next.js 15 + Supabase + Vercel)  
**Ambiente:** Produção (`https://discadora-callcenter.vercel.app`)  
**Data:** 04/11/2026  
**Responsável Técnico:** Engenheiro de Software / Antigravity AI  
**Branch de Trabalho:** `correcao-completa`  

---

## 🔍 FASE 0 - Ferramentas e Infraestrutura de Diagnóstico

1. **Chrome DevTools MCP Oficial (`chrome-devtools-mcp`):**
   - Configurado em `~/.gemini/antigravity/mcp_config.json`:
     `{"type":"stdio","command":"npx","args":["chrome-devtools-mcp@latest","-y"]}`.
2. **Plugin `oh-my-claudecode`:**
   - O Claude Code CLI está instalado no terminal (`C:\Users\vinic\AppData\Roaming\npm\claude.ps1`). A tentativa de adicionar o marketplace via terminal não-interativo apresentou espera indefinida na confirmação do prompt. Conforme instruído ("se não for possível, siga sem ele e registre no relatório"), o processo seguiu normalmente sem o plugin.
3. **CLIs Vercel e Supabase:**
   - Vercel CLI instalada e autenticada com sucesso (`v65.11.0`, usuário `adrielmatos`).
   - Supabase CLI instalada e autenticada via token de acesso da organização (`v3.0.0`, projeto `arcaaeehnxluginzncfs`).

---

## 🌐 FASE 1 - Descoberta do Ambiente e Auditoria de Infraestrutura

1. **Vercel Link & Variáveis de Ambiente:**
   - Projeto vinculado: `projetos-adriel/discadora-callcenter`.
   - `vercel env ls` revelou: **Nenhuma variável de ambiente configurada na Vercel**. A aplicação em produção estava dependendo integralmente dos fallbacks de código em `src/lib/supabase.ts` e não possuía `SUPABASE_SERVICE_ROLE_KEY` injetada, disparando avisos em tempo de compilação.
2. **Comparação de Project-Ref:**
   - URL do Supabase: `https://arcaaeehnxluginzncfs.supabase.co`.
   - Project Ref: `arcaaeehnxluginzncfs`.
   - Fallback em `src/lib/supabase.ts`: `arcaaeehnxluginzncfs`.
   - **Conclusão:** Produção e código apontam para o mesmo banco de dados.
3. **Comparação de Banco Real vs Migrations (`supabase migration list --remote`):**
   - Banco real possui 21 migrações remotas históricas.
   - Tabelas encontradas no banco que divergem ou coexistem com duplicações:
     * `public.operadores_app` (existe no banco, não versionada em migrations)
     * `public.tasks` vs `public.crm_tarefas` (duplicação de modelos de tarefas)
     * `public.historico_ligacoes` vs `public.historico_chamadas` (duplicação de histórico)
     * Funções RPC no banco não versionadas no repositório: `admin_criar_usuario_completo`, `admin_redefinir_senha_usuario`, `sync_mined_lead`.
4. **Logs de Runtime da Vercel e Supabase (Últimas 24h):**
   - Vercel Hobby plan limita a retenção de logs recentes no CLI.
   - Logs unificados de autenticação do Supabase (`auth_logs`) registraram múltiplos disparos de `400: Invalid login credentials` na rota `/token` às `18:38:32Z` a `18:42:41Z` de 04/11/2026.

---

## 🎯 FASE 2 - Causa Raiz do Erro de Login ("Senha Errada")

### 1. Dados do Cliente Cadastrado Hoje (04/11/2026)
- **Empresa:** `Maria Célia castelo da Silva` (Fantasia: `Castelo consig`)
- **ID da Empresa:** `ae2525e2-ab4d-4417-a550-39d593c78b45`
- **CNPJ:** `96380359315`
- **E-mail do Gestor:** `mcpromotora86@gmail.com`
- **Data de Cadastro:** `2026-11-04 18:38:04.972913+00`

### 2. Diagnóstico no Banco de Dados
- `auth.users`: O e-mail `mcpromotora86@gmail.com` **NÃO EXISTE**. O banco de autenticação possui apenas 2 registros (`adrielmatos46@gmail.com` e `poc.redteam.ak+sb2@gmail.com`).
- `auth.identities`: **Nenhum registro** para `mcpromotora86@gmail.com`.
- `public.operadores`: **Nenhum registro** vinculado a esta empresa.
- `public.operadores_app`: **Nenhum registro** vinculado a esta empresa.
- `public.empresas`: A empresa foi inserida com sucesso com status `ativa`.

### 3. Evidência Forense nos Logs do PostgreSQL (`postgres_logs`)
Às `2026-11-04 18:38:05.553000 UTC`, o Postgres registrou:
```
new row for relation "operadores" violates check constraint "operadores_perfil_check"
```

### 4. A Causa Raiz Exata
1. **Incompatibilidade de Schema (Constraint Violation):**
   A tabela `public.operadores` possui a restrição:
   `CHECK ((perfil = ANY (ARRAY['admin'::text, 'gestor'::text, 'operador'::text])))`
   No entanto, em `src/app/settings/page.tsx` (linha 380), a função RPC `admin_criar_usuario_completo` é chamada passando:
   `p_perfil: "proprietario"`.
2. **Rollback Silencioso da Transação:**
   Ao tentar inserir o operador com perfil `"proprietario"`, o PostgreSQL gerou uma exceção de violação de check constraint. Como a função plpgsql roda dentro de uma transação atômica, o insert anterior em `auth.users` e `auth.identities` sofreu **ROLLBACK IMEDIATO**.
3. **Engolimento do Erro no Frontend:**
   O bloco `try/catch` no frontend engoliu o erro (`catch (uErr) { console.warn(...) }`) e imediatamente disparou um `alert()` de boas-vindas com o e-mail e a senha temporária `Ak@123456`, dando a falsa impressão de que o usuário havia sido criado.
4. **Requisição `/auth/v1/token`:**
   Ao tentar acessar `/login`, o Supabase Auth respondeu com `HTTP 400 Bad Request` e mensagem `{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}`, pois o usuário de fato nunca existiu no Auth.
5. **Falta de Atomicidade:**
   O cadastro de empresa insere a empresa primeiro e tenta criar o usuário depois. Em caso de falha no usuário, a empresa continuava órfã no banco sem gestor.
