-- ====================================================================
-- MIGRAÇÃO DE SEGURANÇA: CORREÇÃO DE VAZAMENTO EM EMPRESAS E DEFAULTS DE TENANT
-- ====================================================================

-- 1. Corrige vazamento na tabela empresas: restringe a gestão de empresa
-- exclusivamente ao próprio tenant autenticado (id = private.current_empresa_id())
DROP POLICY IF EXISTS empresas_proprietario_manage ON public.empresas;
CREATE POLICY empresas_proprietario_manage ON public.empresas
  FOR ALL
  TO authenticated
  USING (
    private.is_superadmin() OR (
      id = private.current_empresa_id() AND
      EXISTS (
        SELECT 1 FROM public.operadores_app op
        WHERE op.empresa_id = empresas.id
          AND op.email = (auth.jwt() ->> 'email')
          AND (op.perfil = ANY (ARRAY['proprietario'::text, 'admin'::text, 'supervisor'::text]) OR op.can_crm = true)
      )
    )
  )
  WITH CHECK (
    private.is_superadmin() OR (
      id = private.current_empresa_id() AND
      EXISTS (
        SELECT 1 FROM public.operadores_app op
        WHERE op.empresa_id = empresas.id
          AND op.email = (auth.jwt() ->> 'email')
          AND (op.perfil = ANY (ARRAY['proprietario'::text, 'admin'::text, 'supervisor'::text]) OR op.can_crm = true)
      )
    )
  );

-- 2. Define empresa_id padrão para garantir defesa em profundidade
ALTER TABLE public.historico_ligacoes ALTER COLUMN empresa_id SET DEFAULT private.current_empresa_id();
ALTER TABLE public.retornos ALTER COLUMN empresa_id SET DEFAULT private.current_empresa_id();
