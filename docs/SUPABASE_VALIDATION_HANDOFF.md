# Handoff de validação do Supabase — Discadora Call Center

Este documento é um roteiro para o Antigravity validar a migração e o isolamento de acesso **sem executar mudanças durante a fase de inspeção**. O projeto Supabase de produção não foi alterado por este repositório.

## 1. Inspeção somente leitura antes de qualquer migração

Execute estas consultas no SQL Editor conectado ao projeto correto. Não selecione nem exporte dados pessoais dos leads.

### Tabelas e colunas realmente existentes

```sql
select table_schema, table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = any (array[
    'leads','empresas','operadores_app','app_configuracoes',
    'historico_chamadas','lista_nao_perturbe','cobrancas_saas',
    'auditoria','audit_logs','consent_logs','campanhas','importacoes',
    'ligacoes','retornos','telefones','crm_atividades','crm_conversas',
    'crm_lead_tags','crm_mensagens','crm_propostas','crm_tags',
    'crm_tarefas','crm_etapas'
  ])
order by table_name, ordinal_position;
```

### Políticas RLS atuais

```sql
select schemaname, tablename, policyname, permissive, roles,
       cmd, qual, with_check
from pg_policies
where schemaname in ('public','private')
order by schemaname, tablename, policyname;
```

### Funções e permissões da fila

```sql
select n.nspname as schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in (
  'obter_proximo_lead_disponivel','current_role',
  'current_operator_id','current_operator_is_admin',
  'current_operator_active','sync_mined_lead'
)
order by n.nspname, p.proname;
```

### Verificar tabelas e colunas ausentes, sem modificar nada

```sql
select to_regclass('public.empresas') as empresas,
       to_regclass('public.operadores_app') as operadores_app,
       to_regclass('public.app_configuracoes') as app_configuracoes;
```

## 2. Bloqueadores que precisam ser reconciliados com o schema real

- A aplicação espera objetos como `empresas`, `operadores_app`, `app_configuracoes` e a RPC `sync_mined_lead`; confirmar existência, assinaturas e colunas antes de qualquer SQL.
- A migração `20261028_rls_least_privilege.sql` depende de funções no schema `private` e de colunas de propriedade. Confirmar todas as dependências antes de executá-la.
- A RPC `obter_proximo_lead_disponivel` foi endurecida para que chamadas autenticadas usem `app_metadata.empresa_id` e `app_metadata.operador_id`, e para que apenas `service_role` possa fornecer explicitamente os IDs. Confirmar que o emissor do JWT realmente define essas claims para todos os operadores; caso contrário, a função deve negar acesso (fail closed) até que o vínculo confiável seja implementado.
- A URA agora usa `URA_WEBHOOK_EMPRESA_ID` configurada no servidor. Definir essa variável no ambiente correto antes de habilitar o webhook. Não voltar a aceitar o tenant do corpo ou query string.
- A auditoria não deve confiar em `user_metadata.empresa_id`, pois esse campo pode ser alterado pelo usuário.

## 3. Matriz mínima de autorização antes de liberar produção

Usar contas de teste já existentes e dados fictícios autorizados. Não usar dados reais de clientes.

- DONO/GESTOR: acesso administrativo apenas dentro do escopo empresarial autorizado.
- OPERADOR A: ler/alterar seus leads; não pode ler/alterar leads atribuídos ao OPERADOR B.
- Lead sem operador: não deve ficar visível nem ser reclamado por um operador sem regra de atribuição verificada.
- Histórico, conversas, mensagens, propostas, tarefas, retornos e importações: validar isolamento por operador e por empresa em SELECT/INSERT/UPDATE/DELETE.
- Não Perturbe: qualquer falha na consulta deve bloquear a chamada/envio (fail closed).
- RPC da discadora: duas chamadas concorrentes não podem receber o mesmo lead; não aceitar IDs de outro operador/empresa enviados pelo cliente.
- Webhooks: token ausente/inválido rejeitado; repetição do mesmo evento não duplica efeitos; erros de gravação retornam falha e não são reportados como sucesso.
- CRM/IA: confirmar que a persistência da conversa realmente ocorreu antes de informar sucesso; validar limite de tamanho, autenticação, rate limit e escopo de tenant.

## 4. Critério de liberação

Não mesclar/promover para produção enquanto a migração não for validada contra as tabelas e funções reais, as políticas permissivas antigas não forem inventariadas, a matriz acima não passar e os fluxos de cobrança não tiverem tratamento transacional/idempotente confirmado. O status READY de uma prévia ou um guard estático não equivale a pentest nem prova que o banco está seguro.
