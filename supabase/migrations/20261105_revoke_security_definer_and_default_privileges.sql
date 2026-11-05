-- Migration: 20261105_revoke_security_definer_and_default_privileges.sql
-- Objetivo: Versiona o REVOKE de execução pública em funções sensíveis SECURITY DEFINER,
-- concede execução estritamente a service_role, atualiza admin_criar_usuario_completo para
-- preencher tokens como strings vazias ('') prevenindo erros de scanner GoTrue no login,
-- e altera os privilégios padrão (ALTER DEFAULT PRIVILEGES) para proteger novas funções.

-- 1. Atualização da função admin_criar_usuario_completo para garantir tokens não-nulos
CREATE OR REPLACE FUNCTION public.admin_criar_usuario_completo(
    p_nome text,
    p_email text,
    p_password text,
    p_empresa_id uuid,
    p_perfil text DEFAULT 'operador'::text,
    p_can_crm boolean DEFAULT false,
    p_can_export boolean DEFAULT false,
    p_can_reports boolean DEFAULT false,
    p_can_scripts boolean DEFAULT false,
    p_can_campanhas boolean DEFAULT false,
    p_can_dnd boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_email text;
  v_perfil_operador text;
BEGIN
  v_email := lower(trim(p_email));
  
  -- Normaliza perfil para satisfazer operadores_perfil_check ('admin', 'gestor', 'operador')
  IF lower(trim(p_perfil)) IN ('proprietario', 'dono', 'admin') THEN
    v_perfil_operador := 'admin';
  ELSIF lower(trim(p_perfil)) = 'gestor' THEN
    v_perfil_operador := 'gestor';
  ELSE
    v_perfil_operador := 'operador';
  END IF;
  
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um usuário cadastrado com este e-mail (%)', v_email;
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Inserção no auth.users preenchendo todos os tokens como '' (evita Scan error do GoTrue)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token,
    phone_change,
    phone_change_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', array['email'],
      'role', v_perfil_operador,
      'empresa_id', p_empresa_id
    ),
    jsonb_build_object(
      'sub', v_user_id::text,
      'nome', p_nome,
      'email', v_email,
      'role', v_perfil_operador,
      'empresa_id', p_empresa_id,
      'needs_password_change', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'nome', p_nome,
      'email', v_email,
      'role', v_perfil_operador
    ),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.operadores_app (
    nome,
    email,
    perfil,
    ativo,
    empresa_id,
    can_crm,
    can_export,
    can_reports,
    can_scripts,
    can_campanhas,
    can_dnd
  ) VALUES (
    p_nome,
    v_email,
    p_perfil,
    true,
    p_empresa_id,
    p_can_crm,
    p_can_export,
    p_can_reports,
    p_can_scripts,
    p_can_campanhas,
    p_can_dnd
  );

  INSERT INTO public.operadores (
    nome,
    email,
    perfil,
    ativo,
    empresa_id,
    auth_user_id,
    permissoes
  ) VALUES (
    p_nome,
    v_email,
    v_perfil_operador,
    true,
    p_empresa_id,
    v_user_id,
    jsonb_build_object(
      'can_crm', p_can_crm,
      'can_export', p_can_export,
      'can_reports', p_can_reports,
      'can_scripts', p_can_scripts,
      'can_campanhas', p_can_campanhas,
      'can_dnd', p_can_dnd
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email
  );
END;
$function$;

-- 2. Revogação de privilégios públicos em todas as funções SECURITY DEFINER de public
REVOKE ALL ON FUNCTION public.admin_criar_usuario_completo(text, text, text, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_criar_usuario_completo(text, text, text, uuid, text, boolean, boolean, boolean, boolean, boolean, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.admin_redefinir_senha_usuario(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_redefinir_senha_usuario(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.auditoria_leads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auditoria_leads() TO service_role;

REVOKE ALL ON FUNCTION public.gerar_comissoes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_comissoes() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;

REVOKE ALL ON FUNCTION public.npd_global_aplicar() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.npd_global_aplicar() TO service_role;

REVOKE ALL ON FUNCTION public.npd_global_hit(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.npd_global_hit(text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.saas_alertas() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saas_alertas() TO service_role;

REVOKE ALL ON FUNCTION public.saas_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.saas_overview() TO service_role;

-- 3. Hardening dos privilégios padrão para quaisquer novas funções que venham a ser criadas no schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
