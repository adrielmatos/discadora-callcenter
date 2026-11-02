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
  | "URA_DTMF_INTERACTION"
  | "CHAT_MESSAGE_SENT"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | (string & {});

export interface AuditEventParams {
  action: AuditAction;
  resource?: string;
  entity?: string;
  resourceId?: string | number | null;
  entity_id?: string | number | null;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  empresaId?: string | null;
  empresa_id?: string | null;
  actorUserId?: string | null;
}

/**
 * Registra um evento de auditoria no Supabase com resiliência a falhas
 */
export async function logAuditEvent({
  action,
  resource,
  entity,
  resourceId,
  entity_id,
  metadata,
  details,
  empresaId,
  empresa_id,
  actorUserId
}: AuditEventParams): Promise<boolean> {
  try {
    const finalResource = resource || entity || "general";
    const rawResourceId = resourceId !== undefined ? resourceId : entity_id;
    const finalMetadata = metadata && Object.keys(metadata).length > 0 ? metadata : details || {};
    const finalEmp = empresaId || empresa_id;

    // Tenta resolver o usuário logado caso não tenha sido explicitamente fornecido
    let finalUserId = actorUserId || null;
    let finalEmpresaId = finalEmp || null;

    if (!finalUserId || !finalEmpresaId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (!finalUserId) finalUserId = session.user.id;
          if (!finalEmpresaId) {
            finalEmpresaId = (session.user.app_metadata?.empresa_id as string) || null;
          }
        }
      } catch {}
    }

    const payload = {
      action,
      resource: finalResource,
      resource_id: rawResourceId ? String(rawResourceId) : null,
      actor_user_id: finalUserId,
      empresa_id: finalEmpresaId || null,
      metadata: {
        ...finalMetadata,
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
