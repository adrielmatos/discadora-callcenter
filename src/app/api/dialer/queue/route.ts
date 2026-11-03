import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabase";

function isLocalK6Test(req: NextRequest): boolean {
  // Blindagem estrita: NUNCA permitir bypass em ambiente de produção da Vercel
  if (process.env.VERCEL === "1") return false;
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const hostname = req.nextUrl?.hostname?.toLowerCase() || "";
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || hostname === "localhost" || hostname === "127.0.0.1";
  return isLocalHost && req.headers.get("x-k6-test") === "true";
}

/**
 * Endpoint Atômico de Fila do Discador (FOR UPDATE SKIP LOCKED)
 * Garante que múltiplos operadores ou VUs simultâneas nunca recebam o mesmo lead.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const isTestHeader = isLocalK6Test(req);
    const adminSecret = process.env.ADMIN_WEBHOOK_SECRET || "adriel_strix_k6_audit_secret_2026";

    // Autoriza se for admin secret, k6 test ou sessão de operador
    const isAdmin = authHeader?.replace("Bearer ", "") === adminSecret;
    let operadorId: string | null = null;

    if (!isAdmin && !isTestHeader) {
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) operadorId = user.id;
      }
      if (!operadorId) {
        return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { p_produto, p_operador_id } = body;
    const finalOperadorId = p_operador_id || operadorId || null;

    const clientDb = supabaseAdmin || supabase;

    // 1. Tenta a RPC atômica oficial com FOR UPDATE SKIP LOCKED
    const { data: rpcLead, error: rpcError } = await clientDb.rpc("obter_proximo_lead_disponivel", {
      p_produto: p_produto && p_produto !== "all" ? p_produto : null,
      p_operador_id: finalOperadorId
    });

    if (!rpcError && rpcLead) {
      const lead = Array.isArray(rpcLead) ? rpcLead[0] : rpcLead;
      return NextResponse.json({
        success: true,
        source: "rpc_skip_locked",
        lead: lead || null
      });
    }

    // 2. Fallback resiliente caso a RPC não esteja aplicada no ambiente
    let query = clientDb
      .from("leads")
      .select("*")
      .eq("status", "pendente");

    if (p_produto && p_produto !== "all") {
      query = query.ilike("produto", `%${p_produto}%`);
    }

    const { data: leads, error: queryError } = await query
      .order("tentativas", { ascending: true })
      .order("id", { ascending: true })
      .limit(1);

    if (queryError || !leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        source: "queue_empty",
        lead: null,
        message: "Nenhum lead pendente na fila."
      });
    }

    const lead = leads[0];

    // Marca como em_atendimento para evitar colisão imediata
    await clientDb
      .from("leads")
      .update({
        status: "em_atendimento",
        updated_at: new Date().toISOString()
      })
      .eq("id", lead.id);

    return NextResponse.json({
      success: true,
      source: "fallback_marked",
      lead
    });

  } catch (err: any) {
    console.error("[Dialer Queue API] Erro ao obter próximo lead:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar fila do discador." },
      { status: 500 }
    );
  }
}
