-- =========================================================================
-- MIGRAÇÃO DE BLINDAGEM: DISCADORA CALL CENTER & CONCORRÊNCIA ATÔMICA
-- =========================================================================

-- 1. Proteção RLS nas tabelas críticas
alter table if exists public.app_configuracoes enable row level security;
alter table if exists public.cobrancas_saas enable row level security;
alter table if exists public.empresas enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.lista_nao_perturbe enable row level security;

-- 2. Índice composto para aceleração de busca e bloqueio DND
create index if not exists idx_leads_pendentes_busca 
on public.leads(status, id asc) 
where status = 'pendente';

create index if not exists idx_dnd_busca_rapida 
on public.lista_nao_perturbe(telefone, cpf) 
where ativo = true;

-- 3. FUNÇÃO RPC ATÔMICA: Seleciona e trava 1 lead para o operador sem concorrência
-- Evita a colisão onde dois operadores discam para a mesma pessoa ao mesmo tempo.
create or replace function public.obter_proximo_lead_disponivel(
  p_operador_id bigint default null,
  p_produto text default null
)
returns setof public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads;
begin
  select l.* into v_lead
  from public.leads l
  where l.status = 'pendente'
    and (p_produto is null or p_produto = 'all' or l.produto ilike ('%' || p_produto || '%'))
    and not exists (
      select 1 from public.lista_nao_perturbe dnd
      where dnd.ativo = true
        and (dnd.telefone = l.telefone or (l.cpf is not null and dnd.cpf = l.cpf))
    )
  order by l.id asc
  limit 1
  for update skip locked;

  if found then
    -- Marca o lead como em atendimento imediatamente para nenhum outro operador pegar
    update public.leads
    set status = 'em_atendimento',
        updated_at = now()
    where id = v_lead.id;

    return next v_lead;
  end if;

  return;
end;
$$;

revoke all on function public.obter_proximo_lead_disponivel(bigint, text) from public;
grant execute on function public.obter_proximo_lead_disponivel(bigint, text) to authenticated;
grant execute on function public.obter_proximo_lead_disponivel(bigint, text) to anon;
