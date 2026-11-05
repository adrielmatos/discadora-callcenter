-- Migration: 20261105_add_observacao_to_historico_ligacoes.sql
-- Objetivo: Adiciona a coluna 'observacao' na tabela 'historico_ligacoes'
-- permitindo registrar notas e detalhes de chamadas e tabulações no dialer e LeadDrawer.

ALTER TABLE public.historico_ligacoes 
  ADD COLUMN IF NOT EXISTS observacao text;

-- Recarrega o cache de schema do PostgREST para refletir a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
