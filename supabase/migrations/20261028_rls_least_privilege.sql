-- Least-privilege RLS hardening for the current single-operator ownership schema.
-- This migration intentionally does NOT invent tenant ownership for existing rows.
-- Operators can access only rows assigned to their operator UUID. Unassigned leads
-- remain admin-only until a verified company/tenant assignment is introduced.
-- Apply first to a staging database and run the authorization test matrix before production.

begin;

-- Remove broad "active operator can do everything" policies that bypass row ownership.
drop policy if exists operator_access_auditoria on public.auditoria;
drop policy if exists operator_access_campanhas on public.campanhas;
drop policy if exists crm_atividades_access on public.crm_atividades;
drop policy if exists crm_conversas_active on public.crm_conversas;
drop policy if exists crm_lead_tags_active on public.crm_lead_tags;
drop policy if exists crm_mensagens_active on public.crm_mensagens;
drop policy if exists crm_propostas_active on public.crm_propostas;
drop policy if exists crm_tags_active on public.crm_tags;
drop policy if exists crm_tarefas_active on public.crm_tarefas;
drop policy if exists crm_etapas_select on public.crm_etapas;
drop policy if exists operator_access_importacoes on public.importacoes;
drop policy if exists leads_management on public.leads;
drop policy if exists leads_operator_select on public.leads;
drop policy if exists leads_operator_update on public.leads;
drop policy if exists operator_access_leads on public.leads;
drop policy if exists operator_access_ligacoes on public.ligacoes;
drop policy if exists operator_access_lista_nao_perturbe on public.lista_nao_perturbe;
drop policy if exists operator_access_retornos on public.retornos;
drop policy if exists operator_access_telefones on public.telefones;
drop policy if exists history_management on public.historico_chamadas;
drop policy if exists history_operator_insert on public.historico_chamadas;
drop policy if exists history_operator_select on public.historico_chamadas;
drop policy if exists audit_logs_insert_active on public.audit_logs;

-- LEADS: only owner or privileged manager. Unassigned records are not visible to operators.
create policy leads_admin_all on public.leads
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy leads_operator_select_owned on public.leads
  for select to authenticated
  using (operador_id = (select private.current_operator_id()));
create policy leads_operator_update_owned on public.leads
  for update to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

-- CALL HISTORY: prevent operators from reading or writing other operators' history.
create policy history_admin_all on public.historico_chamadas
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy history_operator_select_owned on public.historico_chamadas
  for select to authenticated using (operador_id = (select private.current_operator_id()));
create policy history_operator_insert_owned on public.historico_chamadas
  for insert to authenticated with check (operador_id = (select private.current_operator_id()));

-- Operator-owned CRM entities.
create policy crm_atividades_admin_all on public.crm_atividades
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_atividades_operator_owned on public.crm_atividades
  for all to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

create policy crm_tarefas_admin_all on public.crm_tarefas
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_tarefas_operator_owned on public.crm_tarefas
  for all to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

create policy crm_propostas_admin_all on public.crm_propostas
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_propostas_operator_owned on public.crm_propostas
  for all to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

-- Conversations and messages are scoped through their assigned operator or lead.
create policy crm_conversas_admin_all on public.crm_conversas
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_conversas_operator_scoped on public.crm_conversas
  for all to authenticated
  using (
    responsavel_id = (select private.current_operator_id())
    or exists (select 1 from public.leads l
               where l.id = crm_conversas.lead_id
                 and l.operador_id = (select private.current_operator_id()))
  )
  with check (
    responsavel_id = (select private.current_operator_id())
    or exists (select 1 from public.leads l
               where l.id = crm_conversas.lead_id
                 and l.operador_id = (select private.current_operator_id()))
  );

create policy crm_mensagens_admin_all on public.crm_mensagens
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_mensagens_operator_scoped on public.crm_mensagens
  for all to authenticated
  using (
    operador_id = (select private.current_operator_id())
    or exists (select 1 from public.leads l
               where l.id = crm_mensagens.lead_id
                 and l.operador_id = (select private.current_operator_id()))
  )
  with check (
    operador_id = (select private.current_operator_id())
    and exists (select 1 from public.leads l
                where l.id = crm_mensagens.lead_id
                  and l.operador_id = (select private.current_operator_id()))
  );

create policy crm_lead_tags_admin_all on public.crm_lead_tags
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy crm_lead_tags_operator_scoped on public.crm_lead_tags
  for all to authenticated
  using (exists (select 1 from public.leads l
                 where l.id = crm_lead_tags.lead_id
                   and l.operador_id = (select private.current_operator_id())))
  with check (exists (select 1 from public.leads l
                      where l.id = crm_lead_tags.lead_id
                        and l.operador_id = (select private.current_operator_id())));

-- Shared lookup tables are readable by active operators; only admins can mutate them.
create policy crm_tags_operator_read on public.crm_tags
  for select to authenticated using (private.current_operator_active());
create policy crm_tags_admin_write on public.crm_tags
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());

create policy crm_etapas_operator_read on public.crm_etapas
  for select to authenticated using (private.current_operator_active());

create policy campanhas_operator_read on public.campanhas
  for select to authenticated using (private.current_operator_active());
create policy campanhas_admin_write on public.campanhas
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());

-- Imported files belong to their creator. Admins may manage all imports.
create policy importacoes_admin_all on public.importacoes
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy importacoes_creator_all on public.importacoes
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Call attempts, callbacks, and phone records are scoped to the assigned operator/lead.
create policy ligacoes_admin_all on public.ligacoes
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy ligacoes_operator_owned on public.ligacoes
  for all to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

create policy retornos_admin_all on public.retornos
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy retornos_operator_owned on public.retornos
  for all to authenticated
  using (operador_id = (select private.current_operator_id()))
  with check (operador_id = (select private.current_operator_id()));

create policy telefones_admin_all on public.telefones
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy telefones_operator_scoped on public.telefones
  for all to authenticated
  using (exists (select 1 from public.leads l
                 where l.id = telefones.lead_id
                   and l.operador_id = (select private.current_operator_id())))
  with check (exists (select 1 from public.leads l
                      where l.id = telefones.lead_id
                        and l.operador_id = (select private.current_operator_id())));

-- DND records are private; operators may read to enforce suppression, but only admins mutate.
create policy dnd_operator_read on public.lista_nao_perturbe
  for select to authenticated using (private.current_operator_active());
create policy dnd_admin_write on public.lista_nao_perturbe
  for all to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin())
  with check (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());

-- Audit records must not be freely forged by any active operator.
create policy auditoria_admin_read on public.auditoria
  for select to authenticated
  using (private.current_role() in ('DONO','GESTOR') or private.current_operator_is_admin());
create policy auditoria_operator_insert_own on public.auditoria
  for insert to authenticated
  with check (operador_id = (select private.current_operator_id()));

create policy audit_logs_insert_own on public.audit_logs
  for insert to authenticated
  with check (
    operator_id = (select private.current_operator_id())
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

commit;
