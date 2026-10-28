import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

/**
 * Disparador em Massa de WhatsApp
 * Segurança Hardened:
 * 1. Autenticação obrigatória (GET e POST).
 * 2. Isolamento estrito por empresa_id do operador logado.
 * 3. Exclusão cruzada contra lista_nao_perturbe (DND).
 * 4. Validação de tenant na atualização de leads.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Autenticação obrigatória para consultar fila de disparos." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 50 : rawLimit, 1), 200);

    // Deriva a empresa do operador autenticado
    let userEmpresaId = user.app_metadata?.empresa_id || null;
    if (!userEmpresaId && user.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
      userEmpresaId = op?.empresa_id || null;
    }

    // Se o usuário não tiver empresa associada, bloqueia acesso (não expõe leads globais)
    if (!userEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa vinculada ao usuário logado." }, { status: 403 });
    }

    const clientDb = supabaseAdmin || supabase;

    // Busca números bloqueados no Não Perturbe
    const { data: dndList, error: dndError } = await clientDb
      .from("lista_nao_perturbe")
      .select("telefone")
      .eq("ativo", true);

    if (dndError) {
      console.error("[WhatsApp broadcast] Falha ao consultar lista Não Perturbe:", dndError);
      return NextResponse.json({ error: "Não foi possível validar a lista Não Perturbe." }, { status: 503 });
    }
    const blockedPhones = new Set((dndList || []).map(d => String(d.telefone || "").replace(/\D/g, "")));

    const { data: leads, error } = await clientDb
      .from("leads")
      .select("id, nome, telefone, banco, margem_disponivel, produto, etapa_crm, ultima_tabulacao")
      .eq("empresa_id", userEmpresaId)
      .neq("status", "bloqueado_dnd")
      .order("id", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filtra telefones no DND
    const validLeads = (leads || [])
      .map(l => {
        const clean = (l.telefone || "").replace(/\D/g, "");
        const formatted = clean.startsWith("55") ? clean : `55${clean}`;
        return {
          ...l,
          telefoneLimpo: formatted,
          primeiroNome: (l.nome || "Cliente").trim().split(" ")[0]
        };
      })
      .filter((l: any) => l.telefoneLimpo.length >= 12 && !blockedPhones.has(l.telefoneLimpo));

    return NextResponse.json({
      success: true,
      total: validLeads.length,
      leads: validLeads
    });

  } catch (error: any) {
    console.error("Erro na fila de disparos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Autenticação obrigatória para registrar disparo." }, { status: 401 });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    }

    // Deriva a empresa do operador autenticado
    let userEmpresaId = user.app_metadata?.empresa_id || null;
    if (!userEmpresaId && user.email) {
      const { data: op } = await supabase
        .from("operadores_app")
        .select("empresa_id")
        .eq("email", user.email)
        .maybeSingle();
      userEmpresaId = op?.empresa_id || null;
    }

    if (!userEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa vinculada ao usuário para registrar disparo." }, { status: 403 });
    }

    const { leadId, telefone, mensagemEnviada } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const clientDb = supabaseAdmin || supabase;

    // Atualiza status do lead no CRM garantindo o tenant do operador
    const { error: leadErr } = await clientDb
      .from("leads")
      .update({
        etapa_crm: "Interessado",
        ultima_tabulacao: "[Disparo WhatsApp Sofia] Enviado",
        updated_at: nowIso
      })
      .eq("id", leadId)
      .eq("empresa_id", userEmpresaId);

    if (leadErr) {
      return NextResponse.json({ error: leadErr.message }, { status: 500 });
    }

    // Registra a mensagem na ficha do lead
    await clientDb.from("historico_ligacoes").insert({
      lead_id: leadId,
      tabulacao: `[Disparo WhatsApp Sofia]: "${(mensagemEnviada || "Mensagem de reativação").slice(0, 300)}"`,
      duracao_segundos: 0
    });

    return NextResponse.json({
      success: true,
      message: `Disparo registrado para o lead #${leadId}`
    });

  } catch (error: any) {
    console.error("Erro ao registrar disparo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
