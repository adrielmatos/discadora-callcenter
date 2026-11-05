-- ====================================================================
-- MIGRAÇÃO DE SEGURANÇA P0: HARDENING DE RLS, PADRONIZAÇÃO E SCHEMA PRIVATE
-- ====================================================================

-- 1. Garante a existência do schema private e proteção contra anon/public
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Helpers de Identidade e Tenant no schema private
CREATE OR REPLACE FUNCTION private.current_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT coalesce(
    nullif(current_setting('app.current_empresa_id', true), '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid,
    (SELECT empresa_id FROM public.operadores WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT empresa_id FROM public.operadores_app WHERE email = auth.jwt() ->> 'email' LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION private.current_operator_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT coalesce(
    (SELECT id FROM public.operadores WHERE auth_user_id = auth.uid() LIMIT 1),
    auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.current_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    (SELECT perfil FROM public.operadores WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT perfil FROM public.operadores_app WHERE email = auth.jwt() ->> 'email' LIMIT 1),
    'operador'
  );
$$;

CREATE OR REPLACE FUNCTION private.current_operator_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT (
    private.is_superadmin() OR
    lower(private.current_role()) IN ('admin', 'dono', 'proprietario', 'gestor')
  );
$$;

CREATE OR REPLACE FUNCTION private.current_operator_active()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT coalesce(
    (SELECT ativo FROM public.operadores WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT ativo FROM public.operadores_app WHERE email = auth.jwt() ->> 'email' LIMIT 1),
    true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'private', 'auth'
AS $$
  SELECT (
    EXISTS (SELECT 1 FROM public.superadmins WHERE auth_user_id = auth.uid()) OR
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'DONO'
  );
$$;

-- 3. Versionamento da RPC sync_mined_lead
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
SET search_path TO 'public', 'private', 'auth'
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

  -- Resolve empresa respeitando o tenant isolation
  v_jwt_empresa_id := private.current_empresa_id();
  v_target_empresa_id := coalesce(v_jwt_empresa_id, p_empresa_id);

  IF v_target_empresa_id IS NULL THEN
    SELECT id INTO v_target_empresa_id FROM public.empresas WHERE interna = true LIMIT 1;
  END IF;

  IF v_target_empresa_id IS NULL THEN
    SELECT id INTO v_target_empresa_id FROM public.empresas ORDER BY id ASC LIMIT 1;
  END IF;

  -- 1. Busca lead existente pertencente a este tenant
  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 8) = v_search_phone
    AND empresa_id = v_target_empresa_id
  ORDER BY id DESC
  LIMIT 1;

  -- 2. Atualiza ou Insere garantindo o isolamento da empresa
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.leads
    SET nome = v_clean_name,
        produto = coalesce(nullif(p_produto, ''), produto),
        banco = coalesce(nullif(p_banco, ''), banco),
        margem_disponivel = coalesce(nullif(p_margem, ''), margem_disponivel),
        etapa_crm = coalesce(nullif(p_etapa, ''), etapa_crm),
        ultima_tabulacao = p_tabulacao,
        empresa_id = v_target_empresa_id,
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

  -- 3. Registra no historico_ligacoes
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

-- 4. Padronização e Blindagem RLS em scripts_ligacao
ALTER TABLE public.scripts_ligacao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Remove políticas antigas caso existam
  DROP POLICY IF EXISTS rls_empresas_scripts ON public.scripts_ligacao;
  DROP POLICY IF EXISTS scripts_tenant_isolation ON public.scripts_ligacao;

  CREATE POLICY scripts_tenant_isolation ON public.scripts_ligacao
    FOR ALL
    USING (private.is_superadmin() OR (empresa_id = private.current_empresa_id()))
    WITH CHECK (private.is_superadmin() OR (empresa_id = private.current_empresa_id()));
END $$;

-- 5. Blindagem RLS em planos (elimina acesso público desgovernado)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS planos_select_all ON public.planos;
  DROP POLICY IF EXISTS planos_select_policy ON public.planos;

  CREATE POLICY planos_select_policy ON public.planos
    FOR SELECT
    USING (auth.role() = 'authenticated');
END $$;

-- 6. Padronização de tasks e crm_tarefas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS rls_tasks_tenant ON public.tasks;
  DROP POLICY IF EXISTS tasks_tenant_isolation ON public.tasks;

  CREATE POLICY tasks_tenant_isolation ON public.tasks
    FOR ALL
    USING (private.is_superadmin() OR (empresa_id = private.current_empresa_id()))
    WITH CHECK (private.is_superadmin() OR (empresa_id = private.current_empresa_id()));
END $$;

-- 7. Padronização de historico_ligacoes
ALTER TABLE public.historico_ligacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS rls_historico_ligacoes ON public.historico_ligacoes;
  DROP POLICY IF EXISTS historico_ligacoes_isolation ON public.historico_ligacoes;

  CREATE POLICY historico_ligacoes_isolation ON public.historico_ligacoes
    FOR ALL
    USING (private.is_superadmin() OR (empresa_id = private.current_empresa_id()))
    WITH CHECK (private.is_superadmin() OR (empresa_id = private.current_empresa_id()));
END $$;

-- 8. Blindagem em app_configuracoes
ALTER TABLE public.app_configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS rls_empresas_config ON public.app_configuracoes;
  DROP POLICY IF EXISTS app_config_isolation ON public.app_configuracoes;

  CREATE POLICY app_config_isolation ON public.app_configuracoes
    FOR ALL
    USING (private.is_superadmin() OR (empresa_id = private.current_empresa_id()))
    WITH CHECK (private.is_superadmin() OR (empresa_id = private.current_empresa_id()));
END $$;
