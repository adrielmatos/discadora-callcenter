-- Migração: Versionamento de operadores_app e admin_criar_usuario_completo exatamente como existem no banco real

-- Tabela operadores_app
CREATE TABLE IF NOT EXISTS public.operadores_app (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    perfil TEXT DEFAULT 'operador',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    can_crm BOOLEAN DEFAULT true,
    can_export BOOLEAN DEFAULT false,
    can_reports BOOLEAN DEFAULT false,
    can_scripts BOOLEAN DEFAULT false,
    can_campanhas BOOLEAN DEFAULT false,
    can_dnd BOOLEAN DEFAULT false,
    empresa_id UUID REFERENCES public.empresas(id)
);

ALTER TABLE public.operadores_app ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'operadores_app' AND policyname = 'rls_empresas_operadores'
    ) THEN
        CREATE POLICY rls_empresas_operadores ON public.operadores_app
            FOR ALL
            USING (private.is_superadmin() OR (empresa_id = private.current_empresa_id()))
            WITH CHECK (private.is_superadmin() OR (empresa_id = private.current_empresa_id()));
    END IF;
END $$;

-- Função admin_criar_usuario_completo existente no banco
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
    updated_at
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
      'empresa_id', p_empresa_id
    ),
    now(),
    now()
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

  INSERT INTO public.operadores (
    id,
    nome,
    email,
    perfil,
    ativo,
    auth_user_id,
    empresa_id,
    permissoes
  ) VALUES (
    gen_random_uuid(),
    p_nome,
    v_email,
    v_perfil_operador,
    true,
    v_user_id,
    p_empresa_id,
    jsonb_build_object(
      'can_crm', p_can_crm,
      'can_export', p_can_export,
      'can_reports', p_can_reports,
      'can_scripts', p_can_scripts,
      'can_campanhas', p_can_campanhas,
      'can_dnd', p_can_dnd
    )
  );

  INSERT INTO public.operadores_app (
    nome,
    email,
    perfil,
    ativo,
    can_crm,
    can_export,
    can_reports,
    can_scripts,
    can_campanhas,
    can_dnd,
    empresa_id
  ) VALUES (
    p_nome,
    v_email,
    p_perfil,
    true,
    p_can_crm,
    p_can_export,
    p_can_reports,
    p_can_scripts,
    p_can_campanhas,
    p_can_dnd,
    p_empresa_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'nome', p_nome
  );
END;
$function$;
