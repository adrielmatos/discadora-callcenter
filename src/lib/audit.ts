/**
 * Audit Logging Engine - A&K One Platform Enterprise
 * Registra trilha de auditoria forense imutável para conformidade LGPD e segurança corporativa
 */
import { supabase } from "@/lib/supabase";

export type AuditAction =
  | "LEAD_EXPORT"
  | "LEAD_IMPORT"
  | "LEAD_DELETE"
  | "LEAD_UPDATE"
  | "LEAD_CREATE"
  | "LEAD_ANONYMIZE_LGPD"
  | "TASK_CREATE"
  | "TASK_COMPLETE"
  | "TENANT_UPDATE"
  | "TENANT_CREATE"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED";

export interface AuditEventParams {
  action: AuditAction;
  resource: string;
  resourceId?: string | number | null;
  metadata?: Record<string, any>;
  empresaId?: string | null;
  actorUserId?: string | null;
}

/**
 * Registra um evento de auditoria no Supabase com resiliência a falhas
 */
export async function logAuditEvent({
  action,
  resource,
  resourceId,
  metadata = {},
  empresaId,
  actorUserId
}: AuditEventParams): Promise<boolean> {
  try {
    // Tenta resolver o usuário logado caso não tenha sido explicitamente fornecido
    let finalUserId = actorUserId || null;
    let finalEmpresaId = empresaId || null;

    if (!finalUserId || !finalEmpresaId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (!finalUserId) finalUserId = session.user.id;
          if (!finalEmpresaId) {
            finalEmpresaId = (session.user.app_metadata?.empresa_id as string) || "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3";
          }
        }
      } catch {}
    }

    const payload = {
      action,
      resource,
      resource_id: resourceId ? String(resourceId) : null,
      actor_user_id: finalUserId,
      empresa_id: finalEmpresaId || "ebe1ab22-519e-4784-8f96-e7f0d7a8c0a3",
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        user_agent: typeof window !== "undefined" ? window.navigator.userAgent : "server-agent"
      }
    };

    const { error } = await supabase.from("audit_logs").insert(payload);
    if (error) {
      console.warn("[Audit] Aviso ao persistir log:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[Audit] Exceção capturada no log de auditoria:", err);
    return false;
  }
}
