-- =========================================================================
-- MIGRAÇÃO DE SUPORTE: SCHEMA PRIVATE, AUTENTICAÇÃO E RPC SYNC_MINED_LEAD
-- Resolve pendências arquiteturais SEC-01 e SEC-06 apontadas na auditoria.
-- =========================================================================

BEGIN;

-- 1. Criação do schema privado para funções de autorização seguras
CREATE SCHEMA IF NOT EXISTS private;

-- 1.1. Extrai o papel/role do operador a partir do app_metadata do JWT
CREATE OR REPLACE FUNCTION private.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    nullif(auth.jwt() ->> 'role', ''),
    'OPERADOR'
  );
$$;

-- 1.2. Extrai o ID do operador a partir de app_metadata.operador_id
CREATE OR REPLACE FUNCTION private.current_operator_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT nullif(auth.jwt() -> 'app_metadata' ->> 'operador_id', '')::bigint;
$$;

-- 1.3. Verifica se o usuário autenticado possui perfil de gestor ou administrador
CREATE OR REPLACE FUNCTION private.current_operator_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    private.current_role() IN ('DONO', 'GESTOR', 'ADMIN', 'admin', 'proprietario'),
    false
  );
$$;

-- 1.4. Valida se a sessão do operador está ativa
CREATE OR REPLACE FUNCTION private.current_operator_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- 2. Stored Procedure RPC sync_mined_lead (Ingestão Landing Page e Sofia IA)
CREATE OR REPLACE FUNCTION public.sync_mined_lead(
  p_client_phone text,
  p_client_name text DEFAULT NULL,
  p_produto text DEFAULT 'FGTS / Consignado',
  p_banco text DEFAULT 'Banco Parceiro',
  p_margem text DEFAULT 'R$ 0,00',
  p_etapa text DEFAULT 'Interessado',
  p_tabulacao text DEFAULT '[Mineração] Capturado',
  p_resumo text DEFAULT NULL,
  p_sugestao text DEFAULT NULL,
  p_temperatura text DEFAULT 'Morno',
  p_empresa_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_lead_id bigint;
  v_lead record;
  v_target_empresa_id uuid := p_empresa_id;
  v_clean_phone text;
BEGIN
  -- Sanitização básica de telefone
  v_clean_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  IF v_clean_phone IS NULL OR length(v_clean_phone) < 8 THEN
    RAISE EXCEPTION 'Telefone inválido para persistência de lead';
  END IF;

  -- Se o telefone não possuir DDI brasileiro, adiciona
  IF length(v_clean_phone) IN (10, 11) AND NOT v_clean_phone LIKE '55%' THEN
    v_clean_phone := '55' || v_clean_phone;
  END IF;

  -- Resolve empresa padrão se não informada (empresa interna master)
  IF v_target_empresa_id IS NULL THEN
    SELECT id INTO v_target_empresa_id FROM public.empresas WHERE interna = true LIMIT 1;
  END IF;

  -- Localiza lead pré-existente
  SELECT id, status, etapa_crm INTO v_lead
  FROM public.leads
  WHERE telefone = v_clean_phone
    AND (v_target_empresa_id IS NULL OR empresa_id = v_target_empresa_id)
  ORDER BY id DESC
  LIMIT 1;

  IF v_lead.id IS NOT NULL THEN
    UPDATE public.leads
    SET 
      nome = coalesce(nullif(p_client_name, ''), nome),
      produto = coalesce(nullif(p_produto, ''), produto),
      banco = coalesce(nullif(p_banco, ''), banco),
      margem_disponivel = coalesce(nullif(p_margem, ''), margem_disponivel),
      etapa_crm = coalesce(nullif(p_etapa, ''), etapa_crm),
      ultima_tabulacao = coalesce(nullif(p_tabulacao, ''), ultima_tabulacao),
      observacoes = CASE 
        WHEN p_resumo IS NOT NULL AND p_resumo <> '' THEN 
          coalesce(observacoes, '') || E'\n' || '[' || to_char(now(), 'YYYY-MM-DD HH24:MI') || '] ' || p_resumo
        ELSE observacoes 
      END,
      updated_at = now()
    WHERE id = v_lead.id;
    v_lead_id := v_lead.id;
  ELSE
    INSERT INTO public.leads (
      nome, telefone, produto, banco, margem_disponivel,
      etapa_crm, status, ultima_tabulacao, observacoes,
      empresa_id, created_at, updated_at
    ) VALUES (
      coalesce(nullif(p_client_name, ''), 'Lead Comercial'),
      v_clean_phone,
      coalesce(p_produto, 'FGTS / Consignado'),
      coalesce(p_banco, 'Banco Parceiro'),
      coalesce(p_margem, 'R$ 0,00'),
      coalesce(p_etapa, 'Interessado'),
      'pendente',
      coalesce(p_tabulacao, '[Mineração] Capturado'),
      p_resumo,
      v_target_empresa_id,
      now(),
      now()
    )
    RETURNING id INTO v_lead_id;
  END IF;

  RETURN jsonb_build_object('lead_id', v_lead_id, 'phone', v_clean_phone);
END;
$$;

-- Permissões estritas da RPC
REVOKE ALL ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_mined_lead(text, text, text, text, text, text, text, text, text, text, uuid) TO service_role;

-- 3. Políticas complementares para tabelas utilizadas pelo frontend
-- Scripts de Ligação
ALTER TABLE IF EXISTS public.scripts_ligacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scripts_operator_read ON public.scripts_ligacao;
CREATE POLICY scripts_operator_read ON public.scripts_ligacao
  FOR SELECT TO authenticated USING (private.current_operator_active());
DROP POLICY IF EXISTS scripts_admin_write ON public.scripts_ligacao;
CREATE POLICY scripts_admin_write ON public.scripts_ligacao
  FOR ALL TO authenticated
  USING (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin())
  WITH CHECK (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin());

-- Planos
ALTER TABLE IF EXISTS public.planos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planos_operator_read ON public.planos;
CREATE POLICY planos_operator_read ON public.planos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS planos_admin_write ON public.planos;
CREATE POLICY planos_admin_write ON public.planos
  FOR ALL TO authenticated
  USING (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin())
  WITH CHECK (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin());

-- Histórico de Ligações (compatibilidade nominal com frontend)
ALTER TABLE IF EXISTS public.historico_ligacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS historico_ligacoes_operator_read ON public.historico_ligacoes;
CREATE POLICY historico_ligacoes_operator_read ON public.historico_ligacoes
  FOR SELECT TO authenticated
  USING (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin() OR operador_id = (SELECT private.current_operator_id()));
DROP POLICY IF EXISTS historico_ligacoes_operator_insert ON public.historico_ligacoes;
CREATE POLICY historico_ligacoes_operator_insert ON public.historico_ligacoes
  FOR INSERT TO authenticated
  WITH CHECK (operador_id = (SELECT private.current_operator_id()) OR private.current_operator_is_admin());

-- Tasks (compatibilidade nominal com frontend)
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_operator_access ON public.tasks;
CREATE POLICY tasks_operator_access ON public.tasks
  FOR ALL TO authenticated
  USING (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin() OR operador_id = (SELECT private.current_operator_id()))
  WITH CHECK (private.current_role() IN ('DONO','GESTOR') OR private.current_operator_is_admin() OR operador_id = (SELECT private.current_operator_id()));

COMMIT;
