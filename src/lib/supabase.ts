import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !rawAnonKey) {
  throw new Error(
    "[Supabase Fatal Error] Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são estritamente obrigatórias. Configure-as no .env.local ou na Vercel."
  );
}

const supabaseUrl: string = rawUrl;
const supabaseAnonKey: string = rawAnonKey;

// Cliente público com RLS (Row Level Security) aplicado
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Chave administrativa com privilégios de service_role (bypasses RLS para webhooks e tarefas de sistema)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!serviceRoleKey && typeof window === "undefined" && process.env.NODE_ENV === "production") {
  console.warn("[Supabase Security Warning] SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente de produção.");
}

/**
 * Retorna o cliente administrativo do Supabase garantindo que a chave de serviço exista.
 * Lança exceção caso chamada em operações que exigem privilégios elevados sem a chave configurada.
 */
export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error("[Supabase Security Error] Operação administrativa rejeitada: SUPABASE_SERVICE_ROLE_KEY ausente no servidor.");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

// Não degradar silenciosamente para o cliente público: rotas administrativas
// devem falhar explicitamente se a chave service_role não estiver configurada.
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;
