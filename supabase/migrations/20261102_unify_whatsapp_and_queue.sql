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

-- 3. Função RPC para verificação em lote de Não Perturbe (DND)
-- Permite checar até 1.000 números de uma vez direto no Postgres sem sobrecarregar a memória do Node.js
CREATE OR REPLACE FUNCTION public.verificar_dnd_em_lote(
  p_telefones text[]
)
RETURNS TABLE(telefone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT DISTINCT dnd.telefone
  FROM public.lista_nao_perturbe dnd
  WHERE dnd.ativo = true
    AND (
      dnd.telefone = ANY(p_telefones)
      OR regexp_replace(dnd.telefone, '^55', '') = ANY(p_telefones)
      OR ('55' || dnd.telefone) = ANY(p_telefones)
    );
$$;

COMMIT;
