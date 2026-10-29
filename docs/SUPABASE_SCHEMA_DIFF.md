# Mapeamento de Divergências do Banco de Dados — Discadora Call Center

**Repositório:** `adrielmatos/discadora-callcenter`  
**Branch:** `fix/rls-least-privilege-pentest`  
**Projeto Supabase Ativo de Produção:** `arcaaeehnxluginzncfs` (sa-east-1 / Org: `vercel_icfg_...`)  
**Instância Incorreta Identificada:** `vtwyojpsrjyigsnnfawa` (Referência stale inserida no commit 0ac8baf)  
**Data da Auditoria:** 28 de Outubro de 2026  

---

## 1. Resumo Executivo das Divergências e Descoberta Crítica

Durante a auditoria forense conduzida pelo Antigravity em modo somente leitura via Supabase Management API:
1. **Descoberta do Banco Real:** O projeto Supabase real vinculado à organização do Vercel é `arcaaeehnxluginzncfs` (São Paulo, `sa-east-1`), contendo 491 leads ativos em `public.leads`, 75 chamadas registradas em `public.historico_ligacoes`, 19 scripts em `public.scripts_ligacao`, 4 planos em `public.planos`, a empresa master `A&K Soluções Financeiras` (`ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3`), o schema `private` com funções utilitárias e a RPC `sync_mined_lead`.
2. **Origem da Inconsistência:** O commit `0ac8baf` alterou indevidamente as referências de conexão para `vtwyojpsrjyigsnnfawa`. Como essa instância secundária não continha os dados ou esquemas corretos, causou a falsa impressão na auditoria anterior do ChatGPT de que o banco de produção estava vazio ou desprovido de funções.
3. **Resolução de Código:** O código-fonte em `src/lib/supabase.ts`, `.env.example` e a extensão do Chrome foram realinhados para a instância autêntica `arcaaeehnxluginzncfs`.


---

## 2. Matriz de Divergência de Nomenclatura de Tabelas

| Tabela Utilizada no Código (`src/**`) | Tabela na Migration `20261028_rls_least_privilege.sql` | Impacto da Disparidade | Ação Corretiva Necessária |
| :--- | :--- | :--- | :--- |
| `tasks` (`src/app/tasks/page.tsx`) | `crm_tarefas` (Políticas RLS criadas para `crm_tarefas`) | A tabela `tasks` utilizada pelos operadores fica **sem RLS** ou o painel de tarefas quebra caso `tasks` não exista e o banco utilize `crm_tarefas`. | Unificar a nomenclatura. Se a tabela oficial for `crm_tarefas`, refatorar `tasks/page.tsx` para consultar `crm_tarefas`. |
| `historico_ligacoes` (`LeadDrawer.tsx`, `resultados/page.tsx`, `whatsapp/send`, `whatsapp/broadcast`) | `historico_chamadas` (Políticas RLS criadas para `historico_chamadas`) | O histórico de ligações gravado e consultado pelo discador fica desprotegido ou quebra em runtime por inexistência da tabela. | Verificar no banco qual tabela existe. Aplicar RLS na tabela correta ou criar view/alias compatível. |
| `operadores` (`src/app/admin/page.tsx:97`) | `operadores_app` (Usada em `settings/page.tsx`, `whatsapp/send`, etc.) | O painel master `/admin` falha na contagem total de operadores ou consulta tabela legada desatualizada. | Alterar `/admin/page.tsx` para consultar `operadores_app`. |
| `scripts_ligacao` (`src/app/scripts/page.tsx`) | **Omitida** (Nenhuma política RLS criada) | Tabela fica aberta a qualquer usuário autenticado ou bloqueada por default caso RLS esteja ativo sem policies. | Criar políticas de leitura para operadores ativos e escrita restrita a admins/gestores. |
| `planos` (`src/app/settings/page.tsx`) | **Omitida** (Nenhuma política RLS criada) | Configurações comerciais e de planos ficam sem cobertura RLS explícita. | Criar política de `select` para autenticados e `all` restrito a administradores. |

---

## 3. Dependências de Funções e Schema `private` Faltantes

A migração `20261028_rls_least_privilege.sql` referencia 4 funções utilitárias no schema `private`:
```sql
private.current_role()
private.current_operator_id()
private.current_operator_is_admin()
private.current_operator_active()
```

### Análise de Risco:
1. **Inexistência de DDL:** Nenhuma das migrações do repositório contém o comando `CREATE SCHEMA IF NOT EXISTS private;` nem os comandos `CREATE OR REPLACE FUNCTION private.current_role()...`.
2. **Falha na Execução:** Se executada em um banco que não possua essas funções pré-instaladas, o PostgreSQL abortará o bloco de transação com:
   ```text
   ERROR: schema "private" does not exist
   ou
   ERROR: function private.current_role() does not exist
   ```
3. **Bloqueio Total de Acesso:** Se as funções retornarem `NULL` (por exemplo, se o operador não tiver mapeamento no JWT ou na tabela de operadores), a cláusula `using (operador_id = (select private.current_operator_id()))` avaliará como `false` para todos os registros, bloqueando completamente a visualização de leads e dados operacionais pelo operador legítimo.

---

## 4. Divergência Estrutural em `app_configuracoes`

A tabela `app_configuracoes` apresenta duas lógicas contraditórias no código-fonte:

1. **Abordagem de Instância Única Global (`id = 1`):**
   - Utilizada em:
     - `src/app/settings/page.tsx:267` (`.eq("id", 1).single()`)
     - `src/app/telefonia/page.tsx:35` (`.eq("id", 1).single()`)
     - `src/app/omnichannel/page.tsx:84` (`.eq("id", 1).single()`)
     - `src/app/dialer/page.tsx:413` (`.eq("id", 1).single()`)
     - `src/app/api/webhooks/billing/route.ts:130` (`.eq("id", 1).single()`)
2. **Abordagem Multitenant Isolada (`empresa_id`):**
   - Utilizada em:
     - `src/app/api/ai/chat/route.ts:257` (`.eq("empresa_id", targetEmpresaId)`)
     - `src/app/api/ai/analyze-chat/route.ts:77` (`.eq("empresa_id", targetEmpresaId)`)

### Consequências:
- Se a tabela no Supabase possuir a coluna `empresa_id`, qualquer tenant que salve dados em `/settings` ou `/omnichannel` estará sobrescrevendo o registro `id = 1` global, misturando tokens de WhatsApp e senhas SIP entre diferentes clientes SaaS.
- Se a tabela possuir apenas `id` e não possuir `empresa_id`, a rota `/api/ai/chat` falhará com erro de SQL (`column app_configuracoes.empresa_id does not exist`).

---

## 5. Auditoria da RPC `sync_mined_lead`

A RPC `sync_mined_lead` é o ponto nevrálgico de ingestão de dados para:
- Captura de formulário da Landing Page (`/api/leads/landing`)
- Handoff e qualificação da Sofia IA (`/api/ai/chat`)
- Análise de conversas pós-atendimento (`/api/ai/analyze-chat`)
- Extensão Chrome de mineração no WhatsApp Web (`extensions/sofia-whatsapp-web/content.js`)

### Especificação Esperada pelo Código:
```sql
CREATE OR REPLACE FUNCTION public.sync_mined_lead(
  p_client_phone text,
  p_client_name text,
  p_produto text,
  p_banco text,
  p_margem text,
  p_etapa text,
  p_tabulacao text,
  p_resumo text,
  p_sugestao text,
  p_temperatura text,
  p_empresa_id uuid
)
RETURNS jsonb -- ou table (lead_id bigint/uuid)
```

### Divergência Encontrada:
- **Ausência de Migration:** O código da RPC `sync_mined_lead` **não consta em nenhum arquivo de migração** do repositório.
- **Risco de 502/503:** Se o banco Supabase de destino não possuir exatamente esta assinatura retornando `{ "lead_id": ... }`, a captura da landing page e o atendimento da Sofia falharão sistematicamente.
- **URL Legada na Extensão:** A extensão `extensions/sofia-whatsapp-web/content.js` aponta para uma instância externa antiga:
  `https://arcaaeehnxluginzncfs.supabase.co/rest/v1/rpc/sync_mined_lead`.

---

## 6. Procedimento de Validação no SQL Editor do Supabase

Conforme o handoff de segurança, execute a query abaixo no Supabase Dashboard (em modo **somente leitura**) para certificar o estado real do banco antes de qualquer migração:

```sql
-- Verificar existência das tabelas conflitantes
SELECT 
  table_name, 
  to_regclass('public.' || table_name) IS NOT NULL AS exists_in_db
FROM (VALUES 
  ('leads'), ('empresas'), ('operadores_app'), ('operadores'),
  ('tasks'), ('crm_tarefas'), ('historico_chamadas'), ('historico_ligacoes'),
  ('scripts_ligacao'), ('planos'), ('app_configuracoes'), ('lista_nao_perturbe')
) AS t(table_name);

-- Verificar se o schema 'private' e as funções utilitárias existem
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'private'
   OR p.proname IN ('sync_mined_lead', 'obter_proximo_lead_disponivel');
```
