-- =========================================================================
-- MIGRAÇÃO DE BLINDAGEM: DISCADORA CALL CENTER & CONCORRÊNCIA ATÔMICA
-- =========================================================================

-- 1. Proteção RLS nas tabelas críticas
alter table if exists public.app_configuracoes enable row level security;
alter table if exists public.cobrancas_saas enable row level security;
alter table if exists public.empresas enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.lista_nao_perturbe enable row level security;

-- Garante coluna updated_at na tabela leads
alter table if exists public.leads add column if not exists updated_at timestamp with time zone default now();

-- 2. Índice composto para aceleração de busca e bloqueio DND
create index if not exists idx_leads_pendentes_busca 
on public.leads(status, id asc) 
where status = 'pendente';

create index if not exists idx_dnd_busca_rapida 
on public.lista_nao_perturbe(telefone, cpf) 
where ativo = true;

-- 3. FUNÇÃO RPC ATÔMICA COM ISOLAMENTO DE TENANT:
-- Seleciona e trava 1 lead para o operador sem colisão e estritamente restrito à empresa do operador.
-- BLINDAGEM DE SEGURANÇA:
-- A identidade do tenant é obtida PRECIPUAMENTE do app_metadata (imutável pelo usuário cliente).
-- Um operador jamais pode consultar leads de outra empresa passando p_empresa_id arbitrário.
create or replace function public.obter_proximo_lead_disponivel(
  p_operador_id bigint default null,
  p_produto text default null,
  p_empresa_id uuid default null
)
returns setof public.leads
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lead public.leads;
  v_jwt_empresa_id uuid;
  v_jwt_operador_id bigint;
  v_caller_empresa_id uuid;
begin
  -- 1. Extrai a empresa obrigatoriamente do app_metadata do JWT (protegido pelo servidor Supabase)
  v_jwt_empresa_id := nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;

  -- Usuários autenticados só podem operar com tenant e operador vindos de claims server-managed.
  -- Nunca aceitar p_empresa_id ou p_operador_id fornecidos pelo cliente como autoridade.
  if auth.role() = 'authenticated' then
    v_jwt_operador_id := nullif(auth.jwt() -> 'app_metadata' ->> 'operador_id', '')::bigint;
    if v_jwt_empresa_id is null or v_jwt_operador_id is null then
      raise insufficient_privilege using message = 'Tenant/operador ausente em app_metadata; acesso negado.';
    end if;
    if p_empresa_id is not null and p_empresa_id <> v_jwt_empresa_id then
      raise insufficient_privilege using message = 'Tenant solicitado não corresponde à identidade autenticada.';
    end if;
    if p_operador_id is not null and p_operador_id <> v_jwt_operador_id then
      raise insufficient_privilege using message = 'Operador solicitado não corresponde à identidade autenticada.';
    end if;
    v_caller_empresa_id := v_jwt_empresa_id;
    p_operador_id := v_jwt_operador_id;
  elsif auth.role() = 'service_role' then
    -- Somente worker confiável com service_role pode indicar explicitamente empresa/operador.
    v_caller_empresa_id := p_empresa_id;
  else
    raise insufficient_privilege using message = 'Papel não autorizado para obter leads.';
  end if;

  -- Falha fechada: nunca retorna leads sem tenant.
  if v_caller_empresa_id is null then
    raise insufficient_privilege using message = 'Tenant não informado; acesso negado.';
  end if;

  -- 2. Busca e bloqueia com SKIP LOCKED apenas dentro da empresa garantida
  select l.* into v_lead
  from public.leads l
  where l.status = 'pendente'
    and l.empresa_id = v_caller_empresa_id
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
        operador_id = p_operador_id,
        updated_at = now()
    where id = v_lead.id
      and empresa_id = v_caller_empresa_id
    returning * into v_lead;

    return next v_lead;
  end if;

  return;
end;
$$;

-- Revoga acesso público e de usuários anônimos (Crítico de Segurança)
revoke all on function public.obter_proximo_lead_disponivel(bigint, text, uuid) from public;
revoke all on function public.obter_proximo_lead_disponivel(bigint, text, uuid) from anon;
grant execute on function public.obter_proximo_lead_disponivel(bigint, text, uuid) to authenticated;
