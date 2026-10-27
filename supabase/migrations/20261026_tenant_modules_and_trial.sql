-- =========================================================================
-- MIGRAÇÃO: CONTROLE DE MÓDULOS POR EMPRESA E DIAS DE TESTE (TRIAL)
-- =========================================================================

-- 1. Adiciona coluna de módulos liberados e dias de teste na tabela empresas
alter table if exists public.empresas
  add column if not exists modulos_liberados text[] default array['dialer','conversas','crm','tasks','retornos','campanhas','omnichannel','scripts','dnd','resultados']::text[],
  add column if not exists dias_teste integer default 7,
  add column if not exists trial_expira_em timestamptz default null;

-- 2. Garantir RLS ativo
alter table if exists public.empresas enable row level security;
