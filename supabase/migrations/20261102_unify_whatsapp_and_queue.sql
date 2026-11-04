-- =========================================================================
-- MIGRAÇÃO: UNIFICAÇÃO DE CONFIGURAÇÕES DE WHATSAPP, DND E FUNIL CRM
-- Data: 02/11/2026
-- =========================================================================

BEGIN;

-- 1. Padronização de colunas de WhatsApp na tabela app_configuracoes
ALTER TABLE public.app_configuracoes 
  ADD COLUMN IF NOT EXISTS whatsapp_provider text DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS wa_api_url text,
  ADD COLUMN IF NOT EXISTS wa_api_token text,
  ADD COLUMN IF NOT EXISTS wa_instance_name text,
  ADD COLUMN IF NOT EXISTS wa_phone_number_id text,
  ADD COLUMN IF NOT EXISTS wa_client_token text,
  ADD COLUMN IF NOT EXISTS wa_webhook_secret text;

-- Sincroniza dados legados caso existam nas colunas antigas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'whatsapp_tipo') THEN
    UPDATE public.app_configuracoes 
    SET whatsapp_provider = CASE 
      WHEN whatsapp_tipo = 'zapi' THEN 'zapi'
      WHEN whatsapp_tipo = 'evolution' THEN 'evolution'
      WHEN whatsapp_tipo = 'meta' THEN 'meta_cloud'
      ELSE coalesce(whatsapp_provider, 'web')
    END
    WHERE whatsapp_provider IS NULL OR whatsapp_provider = 'web';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'wa_mode') THEN
    UPDATE public.app_configuracoes 
    SET whatsapp_provider = wa_mode 
    WHERE wa_mode IS NOT NULL AND (whatsapp_provider IS NULL OR whatsapp_provider = 'web');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'evolution_url') THEN
    UPDATE public.app_configuracoes 
    SET wa_api_url = coalesce(wa_api_url, evolution_url)
    WHERE evolution_url IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'evolution_api_key') THEN
    UPDATE public.app_configuracoes 
    SET wa_api_token = coalesce(wa_api_token, evolution_api_key)
    WHERE evolution_api_key IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'zapi_token') THEN
    UPDATE public.app_configuracoes 
    SET wa_api_token = coalesce(wa_api_token, zapi_token)
    WHERE zapi_token IS NOT NULL AND wa_api_token IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_configuracoes' AND column_name = 'zapi_instancia') THEN
    UPDATE public.app_configuracoes 
    SET wa_instance_name = coalesce(wa_instance_name, zapi_instancia)
    WHERE zapi_instancia IS NOT NULL;
  END IF;
END $$;

-- 2. Garantir índice multi-tenant para busca rápida de configurações por empresa
CREATE INDEX IF NOT EXISTS idx_app_configuracoes_empresa 
ON public.app_configuracoes(empresa_id);

-- 3. Função RPC otimizada para verificação em lote de Não Perturbe (DND)
-- Utiliza expansão prévia do array em CTE para permitir Index Scan 100% no B-Tree
CREATE OR REPLACE FUNCTION public.verificar_dnd_em_lote(
  p_telefones text[]
)
RETURNS TABLE(telefone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH input_phones AS (
    SELECT DISTINCT unnest(p_telefones) AS raw_phone
  ),
  expanded_phones AS (
    SELECT raw_phone AS num FROM input_phones
    UNION
    SELECT regexp_replace(raw_phone, '^55', '') AS num FROM input_phones
    UNION
    SELECT '55' || regexp_replace(raw_phone, '^55', '') AS num FROM input_phones
  )
  SELECT DISTINCT dnd.telefone
  FROM public.lista_nao_perturbe dnd
  WHERE dnd.ativo = true
    AND dnd.telefone IN (SELECT num FROM expanded_phones WHERE num IS NOT NULL AND num <> '');
$$;

REVOKE ALL ON FUNCTION public.verificar_dnd_em_lote(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verificar_dnd_em_lote(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.verificar_dnd_em_lote(text[]) TO authenticated, service_role;

-- 4. Função RPC public.obter_proximo_lead_disponivel (Hardening de Concorrência & Tenant Isolation)
CREATE OR REPLACE FUNCTION public.obter_proximo_lead_disponivel(
  p_operador_id bigint DEFAULT NULL::bigint,
  p_produto text DEFAULT NULL::text,
  p_empresa_id uuid DEFAULT NULL::uuid
)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_lead public.leads;
  v_jwt_empresa_id uuid;
  v_caller_empresa_id uuid;
  v_operator_id bigint;
  v_user_email text;
begin
  -- Extrai a empresa do app_metadata do JWT
  v_jwt_empresa_id := nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
  v_user_email := auth.jwt() ->> 'email';

  -- Se for service_role, permite definir p_empresa_id explicitamente
  if auth.role() = 'service_role' then
    v_caller_empresa_id := coalesce(p_empresa_id, v_jwt_empresa_id);
  elsif v_jwt_empresa_id is not null then
    v_caller_empresa_id := v_jwt_empresa_id;
  elsif v_user_email is not null then
    -- Fallback: resolve a empresa consultando operadores_app pelo e-mail autenticado
    select op.empresa_id, op.id into v_caller_empresa_id, v_operator_id
    from public.operadores_app op
    where op.email = v_user_email
    limit 1;
  end if;

  -- Rejeita se nenhuma empresa vinculada foi autenticada
  if v_caller_empresa_id is null then
    return;
  end if;

  -- Se o operador não foi passado, tenta resolver pelo operador autenticado
  if v_operator_id is null and v_user_email is not null then
    select op.id into v_operator_id
    from public.operadores_app op
    where op.email = v_user_email
    limit 1;
  end if;

  -- Busca e bloqueia com SKIP LOCKED apenas dentro da empresa garantida
  select l.* into v_lead
  from public.leads l
  where l.status = 'pendente'
    and l.empresa_id = v_caller_empresa_id
    and (p_produto is null or p_produto = 'all' or l.produto ilike ('%' || p_produto || '%'))
    and not exists (
      select 1 from public.lista_nao_perturbe dnd
      where dnd.ativo = true
        and (
          dnd.telefone = l.telefone
          or dnd.telefone = ('55' || regexp_replace(l.telefone, '^55', ''))
          or dnd.telefone = regexp_replace(l.telefone, '^55', '')
          or (l.cpf is not null and dnd.cpf = l.cpf)
        )
    )
  order by l.id asc
  limit 1
  for update skip locked;

  if found then
    -- Marca o lead como em atendimento e atualiza com RETURNING * INTO v_lead
    update public.leads
    set status = 'em_atendimento',
        operador_id = coalesce(p_operador_id, v_operator_id, operador_id),
        updated_at = now()
    where id = v_lead.id 
      and empresa_id = v_caller_empresa_id
    returning * into v_lead;

    return next v_lead;
  end if;

  return;
end;
$function$;

REVOKE ALL ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) TO authenticated, service_role;

-- 5. Correção em public.sync_mined_lead para resolução dinâmica de tenant
CREATE OR REPLACE FUNCTION public.sync_mined_lead(
  p_client_phone text,
  p_client_name text,
  p_produto text DEFAULT 'FGTS Saque-Aniversário'::text,
  p_banco text DEFAULT 'Banco Parceiro'::text,
  p_margem text DEFAULT 'R$ 0,00'::text,
  p_etapa text DEFAULT 'Interessado'::text,
  p_tabulacao text DEFAULT '[Mineração WhatsApp]'::text,
  p_resumo text DEFAULT 'Lead prospectado no WhatsApp'::text,
  p_sugestao text DEFAULT 'Retomar contato para simulação'::text,
  p_temperatura text DEFAULT 'Morno'::text,
  p_empresa_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_clean_phone text;
  v_search_phone text;
  v_clean_name text;
  v_lead_id bigint;
  v_is_new boolean := false;
  v_note text;
  v_jwt_empresa_id uuid;
  v_target_empresa_id uuid;
BEGIN
  -- Sanitiza telefone
  v_clean_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  IF length(v_clean_phone) < 8 THEN
    v_clean_phone := '55119' || lpad(abs(hashtext(coalesce(p_client_name, 'lead')))::text, 8, '0');
  END IF;

  v_search_phone := right(v_clean_phone, 8);
  v_clean_name := coalesce(nullif(trim(p_client_name), ''), 'Cliente WhatsApp (' || right(v_clean_phone, 4) || ')');

  -- Resolve empresa de forma segura e dinâmica
  v_jwt_empresa_id := nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
  v_target_empresa_id := coalesce(v_jwt_empresa_id, p_empresa_id);
  IF v_target_empresa_id IS NULL THEN
    SELECT id INTO v_target_empresa_id FROM public.empresas WHERE interna = true LIMIT 1;
  END IF;
  IF v_target_empresa_id IS NULL THEN
    SELECT id INTO v_target_empresa_id FROM public.empresas ORDER BY id ASC LIMIT 1;
  END IF;

  -- 1. Busca lead existente
  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 8) = v_search_phone
    AND (empresa_id = v_target_empresa_id OR v_target_empresa_id IS NULL)
  ORDER BY id DESC
  LIMIT 1;

  -- 2. Atualiza ou Insere
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET nome = v_clean_name,
        produto = coalesce(nullif(p_produto, ''), produto),
        banco = coalesce(nullif(p_banco, ''), banco),
        margem_disponivel = coalesce(nullif(p_margem, ''), margem_disponivel),
        etapa_crm = coalesce(nullif(p_etapa, ''), etapa_crm),
        ultima_tabulacao = p_tabulacao,
        empresa_id = coalesce(v_target_empresa_id, empresa_id),
        updated_at = now()
    WHERE id = v_lead_id;
  ELSE
    INSERT INTO public.leads (
      nome,
      telefone,
      produto,
      banco,
      margem_disponivel,
      status,
      etapa_crm,
      ultima_tabulacao,
      empresa_id
    ) VALUES (
      v_clean_name,
      v_clean_phone,
      coalesce(nullif(p_produto, ''), 'FGTS Saque-Aniversário'),
      coalesce(nullif(p_banco, ''), 'Banco Parceiro'),
      coalesce(nullif(p_margem, ''), 'R$ 0,00'),
      'pendente',
      coalesce(nullif(p_etapa, ''), 'Interessado'),
      p_tabulacao,
      v_target_empresa_id
    ) RETURNING id INTO v_lead_id;

    v_is_new := true;
  END IF;

  -- 3. Registra no historico de ligacoes
  v_note := ('[Diagnóstico IA Sofia]: ' || coalesce(p_resumo, '') || ' | Sugestão: ' || coalesce(p_sugestao, ''));
  INSERT INTO public.historico_ligacoes (
    lead_id,
    tabulacao,
    duracao_segundos,
    empresa_id
  ) VALUES (
    v_lead_id,
    left(v_note, 450),
    0,
    v_target_empresa_id
  );

  -- 4. Se for quente, insere em retornos
  IF p_temperatura = 'Quente' THEN
    INSERT INTO public.retornos (
      lead_id,
      data_hora,
      observacao,
      concluido,
      empresa_id
    ) VALUES (
      v_lead_id,
      now(),
      left('[Oportunidade Quente Resgatada] ' || coalesce(p_produto, '') || ': ' || coalesce(p_resumo, ''), 250),
      false,
      v_target_empresa_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'lead_id', v_lead_id,
    'is_new', v_is_new,
    'nome', v_clean_name,
    'telefone', v_clean_phone
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) TO authenticated, service_role;

COMMIT;
