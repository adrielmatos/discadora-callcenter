-- =========================================================================
-- MIGRAÇÃO DE HARDENING FORENSE: FILA ATÔMICA, ISOLAMENTO E ÍNDICES OTIMIZADOS
-- Data: 02/11/2026
-- =========================================================================

BEGIN;

-- 1. Remoção do índice composto ineficiente com OR e criação dos índices parciais específicos
DROP INDEX IF EXISTS public.idx_dnd_busca_rapida;

CREATE INDEX IF NOT EXISTS idx_dnd_telefone_ativo 
ON public.lista_nao_perturbe(telefone) 
WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_dnd_cpf_ativo 
ON public.lista_nao_perturbe(cpf) 
WHERE ativo = true AND cpf IS NOT NULL;

-- 2. Índice composto para aceleração de fila concorrente com isolamento de tenant e ordenação de tentativas
CREATE INDEX IF NOT EXISTS idx_leads_fila_tenant 
ON public.leads(empresa_id, status, tentativas, id) 
WHERE status = 'pendente';

-- 3. Função RPC Atômica para seleção e trava com FOR UPDATE SKIP LOCKED
-- Protege contra colisão de fila entre múltiplos operadores e impede bypass de tenant
CREATE OR REPLACE FUNCTION public.obter_proximo_lead_disponivel(
  p_operador_id bigint DEFAULT NULL,
  p_produto text DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_lead public.leads;
  v_jwt_empresa_id uuid;
  v_jwt_operador_id bigint;
  v_caller_empresa_id uuid;
  v_caller_operador_id bigint;
  v_user_email text;
BEGIN
  -- 1. Resolução segura de Tenant e Operador baseada na sessão criptográfica
  IF auth.role() = 'authenticated' THEN
    v_user_email := auth.jwt() ->> 'email';
    v_jwt_empresa_id := NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid;
    v_jwt_operador_id := NULLIF(auth.jwt() -> 'app_metadata' ->> 'operador_id', '')::bigint;

    -- Se não estiver no JWT, resolve dinamicamente via operadores_app
    IF v_jwt_empresa_id IS NULL OR v_jwt_operador_id IS NULL THEN
      IF v_user_email IS NOT NULL THEN
        SELECT op.empresa_id, op.id INTO v_caller_empresa_id, v_caller_operador_id
        FROM public.operadores_app op
        WHERE op.email = v_user_email AND op.ativo = true
        LIMIT 1;
      END IF;
      
      -- Coalesce com valores do JWT se existirem
      v_caller_empresa_id := coalesce(v_jwt_empresa_id, v_caller_empresa_id);
      v_caller_operador_id := coalesce(v_jwt_operador_id, v_caller_operador_id);
    ELSE
      v_caller_empresa_id := v_jwt_empresa_id;
      v_caller_operador_id := v_jwt_operador_id;
    END IF;

    -- Verificação anti-spoofing: impede que um operador consulte dados de outra empresa
    IF p_empresa_id IS NOT NULL AND p_empresa_id <> v_caller_empresa_id THEN
      RAISE INSUFFICIENT_PRIVILEGE USING MESSAGE = 'Tenant solicitado diverge da empresa autorizada do operador.';
    END IF;

    -- Se operador explicitamente informado, valida com o operador autenticado
    IF p_operador_id IS NOT NULL AND v_caller_operador_id IS NOT NULL AND p_operador_id <> v_caller_operador_id THEN
      RAISE INSUFFICIENT_PRIVILEGE USING MESSAGE = 'Operador solicitado diverge da identidade autenticada.';
    ELSIF v_caller_operador_id IS NULL AND p_operador_id IS NOT NULL THEN
      v_caller_operador_id := p_operador_id;
    END IF;

  ELSIF auth.role() = 'service_role' THEN
    -- Somente worker backend ou cron autorizado com service_role pode especificar tenant livremente
    v_caller_empresa_id := p_empresa_id;
    v_caller_operador_id := p_operador_id;
    IF v_caller_empresa_id IS NULL THEN
      SELECT id INTO v_caller_empresa_id FROM public.empresas WHERE interna = true LIMIT 1;
    END IF;
  ELSE
    RAISE INSUFFICIENT_PRIVILEGE USING MESSAGE = 'Papel não autorizado para requisição de leads da fila.';
  END IF;

  -- Falha fechada: rejeita qualquer consulta sem empresa associada
  IF v_caller_empresa_id IS NULL THEN
    RAISE INSUFFICIENT_PRIVILEGE USING MESSAGE = 'Tenant não identificado ou empresa inativa. Acesso negado.';
  END IF;

  -- 2. Busca e bloqueia com SKIP LOCKED apenas dentro da empresa garantida
  SELECT l.* INTO v_lead
  FROM public.leads l
  WHERE l.status = 'pendente'
    AND l.empresa_id = v_caller_empresa_id
    AND (p_produto IS NULL OR p_produto = 'all' OR l.produto ILIKE ('%' || p_produto || '%'))
    AND NOT EXISTS (
      SELECT 1 FROM public.lista_nao_perturbe dnd
      WHERE dnd.ativo = true
        AND (dnd.telefone = l.telefone OR (l.cpf IS NOT NULL AND dnd.cpf = l.cpf))
    )
  ORDER BY l.tentativas ASC NULLS FIRST, l.id ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    -- Marca o lead como em atendimento imediatamente e captura o registro atualizado
    UPDATE public.leads
    SET status = 'em_atendimento',
        operador_id = v_caller_operador_id,
        updated_at = now()
    WHERE id = v_lead.id
      AND empresa_id = v_caller_empresa_id
    RETURNING * INTO v_lead;

    RETURN NEXT v_lead;
  END IF;

  RETURN;
END;
$$;

-- Permissões mínimas
REVOKE ALL ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_proximo_lead_disponivel(bigint, text, uuid) TO service_role;

COMMIT;
