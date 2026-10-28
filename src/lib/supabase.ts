import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vtwyojpsrjyigsnnfawa.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY2FhZWVobnhsdWdpbnpuY2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDMwNzEsImV4cCI6MjEwNjQ3OTA3MX0.sesEcB-EF3yCGa0b84xQ-56kEchoryt4c5sNqm4sup0";

// Cliente público com RLS (Row Level Security) aplicado
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Chave administrativa com privilégios de service_role (bypasses RLS para webhooks e tarefas de sistema)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
