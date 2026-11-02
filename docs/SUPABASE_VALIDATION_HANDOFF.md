# Handoff de Validação do Supabase — Discadora Call Center

Este documento é o roteiro executivo para validação da migração e isolamento de acesso **sem executar mudanças durante a fase de inspeção**. O projeto Supabase de produção ativo (`arcaaeehnxluginzncfs`) foi inspecionado em modo estritamente somente leitura via catálogo do PostgreSQL e não foi alterado por este repositório.

Para aprofundamento técnico, consulte os documentos complementares gerados na auditoria:
- [AUDIT_ROUTE_MATRIX.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/AUDIT_ROUTE_MATRIX.md) — Matriz completa de superfícies de ataque, autenticação e rotas.
- [SUPABASE_SCHEMA_DIFF.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/SUPABASE_SCHEMA_DIFF.md) — Mapeamento detalhado de divergências de tabelas, funções e colunas.
- [AUDIT_FINDINGS.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/AUDIT_FINDINGS.md) — Relatório consolidado de não conformidades e vulnerabilidades.
- [ENVIRONMENT_CHECKLIST.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/ENVIRONMENT_CHECKLIST.md) — Inventário seguro de variáveis de ambiente.
- [TEST_RESULTS.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/TEST_RESULTS.md) — Resultados das baterias de testes e lint.
- [AUDIT_BASELINE.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/AUDIT_BASELINE.md) — Registro de rastreabilidade de commits e PR #2.
- [RELEASE_READINESS.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/RELEASE_READINESS.md) — Matriz de liberação para produção (Gate Go/No-Go).

---

## 1. Inspeção Somente Leitura Antes de Qualquer Migração

Execute estas consultas no SQL Editor conectado ao projeto Supabase em ambiente de homologação/staging. **Não selecione nem exporte dados pessoais dos leads (LGPD).**

### 1.1. Tabelas e Colunas Existentes no Banco

```sql
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = ANY (ARRAY[
    'leads','empresas','operadores_app','app_configuracoes',
    'historico_chamadas','historico_ligacoes','lista_nao_perturbe','cobrancas_saas',
    'auditoria','audit_logs','consent_logs','campanhas','importacoes',
    'ligacoes','retornos','telefones','crm_atividades','crm_conversas',
    'crm_lead_tags','crm_mensagens','crm_propostas','crm_tags',
    'crm_tarefas','tasks','crm_etapas','scripts_ligacao','planos'
  ])
ORDER BY table_name, ordinal_position;
```

### 1.2. Políticas RLS Atualmente em Vigor

```sql
SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public','private')
ORDER BY schemaname, tablename, policyname;
```

### 1.3. Funções e Procedimentos no Catálogo

```sql
SELECT n.nspname AS schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'obter_proximo_lead_disponivel','current_role',
  'current_operator_id','current_operator_is_admin',
  'current_operator_active','sync_mined_lead'
)
ORDER BY n.nspname, p.proname;
```

---

## 2. Bloqueadores Críticos a Serem Reconciliados

1. **Schema `private` Inexistente:**  
   A migração `20261028_rls_least_privilege.sql` depende das funções `private.current_role()`, `private.current_operator_id()`, etc. Se o schema `private` não for criado previamente com as funções adequadas, a migration falhará ou causará negação de serviço a todos os operadores.
2. **Divergências Nominais:**  
   - O código utiliza `tasks`, enquanto a migration protege `crm_tarefas`.
   - O código utiliza `historico_ligacoes`, enquanto a migration protege `historico_chamadas`.
   - A tabela `scripts_ligacao` foi omitida na migration.
3. **RPC `sync_mined_lead` Ausente do Versionamento:**  
   A procedure de sincronização de leads da landing page e da IA precisa de migration formal no repositório.
4. **Isolamento de `app_configuracoes`:**  
   A tabela precisa ser particionada por `empresa_id` e ter suas colunas sensíveis (SIP password, API keys) protegidas contra leitura indiscriminada por operadores.
5. **Claims no JWT de Autenticação:**  
   A RPC `obter_proximo_lead_disponivel` exige `app_metadata.empresa_id` e `app_metadata.operador_id`. É necessário certificar que a trigger/hook de criação de sessão no Supabase Auth realmente injeta essas claims no token emitido.

---

## 3. Matriz Mínima de Testes em Staging Pré-Produção

Utilize contas fictícias de teste em banco de homologação isolado:
- **DONO/GESTOR:** Acesso administrativo limitado estritamente à sua própria empresa.
- **OPERADOR A:** Consegue listar e alterar apenas os leads atribuídos ao seu `operador_id`. Não tem visibilidade sobre leads do OPERADOR B.
- **Leads Sem Operador:** Permanecem restritos à visualização de administradores/gestores até serem atribuídos via fila atômica.
- **Concorrência da Discadora:** Duas chamadas simultâneas à RPC `obter_proximo_lead_disponivel` devem travar leads distintos através de `FOR UPDATE SKIP LOCKED`.
- **Lista Não Perturbe (DND):** Qualquer falha na verificação da lista deve abortar a discagem/envio imediatamente (fail-closed).
- **Webhooks:** Rejeição de assinaturas inválidas e idempotência contra duplicidade de pagamentos.

---

## 4. Critério de Liberação

**NÃO REALIZAR MERGE DA PR #2 NEM PROMOVER PARA PRODUÇÃO** até que os itens acima sejam validados e o parecer em [RELEASE_READINESS.md](file:///C:/Users/vinic/.gemini/antigravity/scratch/discadora-callcenter/docs/RELEASE_READINESS.md) seja atualizado para aprovação formal.
