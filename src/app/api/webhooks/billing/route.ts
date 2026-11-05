import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";

/**
 * Ativação unificada de faturas e planos SaaS
 */
async function activatePaidSubscription(
  clientDb: any,
  cobrancaId: string | number,
  gateway: string,
  paidAmount?: number,
  extraMeta?: Record<string, any>
) {
  const nowIso = new Date().toISOString();
  await clientDb
    .from("cobrancas_saas")
    .update({
      status: "paga",
      pago_em: nowIso,
      metodo: gateway,
      gateway: gateway
    })
    .eq("id", cobrancaId);

  const { data: cob } = await clientDb
    .from("cobrancas_saas")
    .select("empresa_id")
    .eq("id", cobrancaId)
    .maybeSingle();

  if (cob?.empresa_id) {
    await clientDb
      .from("empresas")
      .update({ status: "ativa", updated_at: nowIso })
      .eq("id", cob.empresa_id);

    logAuditEvent({
      action: gateway === "manual" ? "BILLING_CONFIRMED_MANUAL" : "BILLING_CONFIRMED_WEBHOOK",
      resource: "cobrancas_saas",
      resourceId: String(cobrancaId),
      empresaId: cob.empresa_id,
      metadata: { gateway, valor: paidAmount, cobranca_id: cobrancaId, ...extraMeta }
    });
  }
}

/**
 * Webhook de Cobrança Multi-Gateway (Mercado Pago, Asaas, EFI/Gerencianet, Manual)
 * Segurança Hardened:
 * 1. Todos os gateways exigem token/segredo de validação estrito.
 * 2. Prevenção contra falsificação de txid ou body.pix arbitrário.
 * 3. Idempotência e registro de auditoria em cada ativação.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido ou JSON malformado." },
      { status: 400 }
    );
  }

  try {
    // ─── 1. Confirmação Manual pelo Painel de Controle ─────────────
    if (body.action === "confirm_manual" && body.cobranca_id) {
      const authHeader = req.headers.get("authorization");
      const adminSecret = req.headers.get("x-admin-secret");
      const configuredSecret = process.env.ADMIN_WEBHOOK_SECRET;

      let isAuthorized = false;

      if (adminSecret && configuredSecret) {
        const a = Buffer.from(adminSecret);
        const b = Buffer.from(configuredSecret);
        if (a.length === b.length && timingSafeEqual(a, b)) {
          isAuthorized = true;
        }
      } else if (authHeader) {
        if (!supabaseAdmin) {
          return NextResponse.json({ error: "Processamento de cobrança indisponível." }, { status: 503 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: op } = await supabaseAdmin
            .from("operadores_app")
            .select("perfil")
            .eq("email", user.email)
            .maybeSingle();

          if (op && (op.perfil === "proprietario" || op.perfil === "admin")) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Acesso negado: operação restrita a administradores autenticados." },
          { status: 403 }
        );
      }

      if (!supabaseAdmin) {
        console.error("[Billing Webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
        return NextResponse.json({ error: "Processamento de cobrança temporariamente indisponível." }, { status: 503 });
      }
      const clientDb = supabaseAdmin;

      const { data: cobranca, error: findError } = await clientDb
        .from("cobrancas_saas")
        .select("*, empresas(*)")
        .eq("id", body.cobranca_id)
        .single();

      if (findError || !cobranca) {
        return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
      }

      // Evita reprocessamento se já paga
      if (cobranca.status === "paga") {
        return NextResponse.json({ success: true, message: "Cobrança já estava confirmada anteriormente." });
      }

      await activatePaidSubscription(clientDb, body.cobranca_id, "manual", Number(cobranca.valor || 0));

      return NextResponse.json({ success: true, message: "Pagamento confirmado e empresa ativada com sucesso!" });
    }

    // ─── 2. Webhook Mercado Pago ────────────────────────────────────
    if (body.type === "payment" || body.action === "payment.updated" || body.data?.id) {
      const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      const signatureHeader = req.headers.get("x-signature") || "";
      const requestId = req.headers.get("x-request-id") || "";
      const signatureParts = Object.fromEntries(signatureHeader.split(",").map((part) => {
        const [key, ...value] = part.trim().split("=");
        return [key, value.join("=")];
      }));
      const timestamp = signatureParts.ts;
      const suppliedSignature = signatureParts.v1;
      const dataId = String(body.data?.id || body.id || "").toLowerCase();

      if (!webhookSecret || !timestamp || !suppliedSignature || !requestId || !dataId) {
        return NextResponse.json({ error: "Assinatura do webhook Mercado Pago ausente ou não configurada." }, { status: 401 });
      }
      const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
      const expectedSignature = createHmac("sha256", webhookSecret).update(manifest).digest("hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");
      const suppliedBuffer = Buffer.from(suppliedSignature, "hex");
      if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
        return NextResponse.json({ error: "Assinatura do webhook Mercado Pago inválida." }, { status: 401 });
      }

      if (!supabaseAdmin) {
        console.error("[Billing Webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
        return NextResponse.json({ error: "Processamento de cobrança temporariamente indisponível." }, { status: 503 });
      }
      const clientDb = supabaseAdmin;

      const paymentId = body.data?.id || body.id;

      let mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!mpAccessToken) {
        const { data: config } = await clientDb
          .from("app_configuracoes")
          .select("mercadopago_access_token")
          .order("id", { ascending: true })
          .limit(1)
          .maybeSingle();
        mpAccessToken = config?.mercadopago_access_token;
      }

      if (!mpAccessToken) {
        return NextResponse.json({ error: "Mercado Pago não configurado na plataforma" }, { status: 400 });
      }

      if (paymentId) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              Authorization: `Bearer ${mpAccessToken}`
            }
          });

          if (mpRes.ok) {
            const paymentData = await mpRes.json();
            if (paymentData.status === "approved") {
              const externalReference = paymentData.external_reference;
              if (externalReference) {
                // Idempotência e validação de integridade da cobrança
                const { data: cob, error: cobError } = await clientDb
                  .from("cobrancas_saas")
                  .select("id, empresa_id, status, valor")
                  .eq("id", externalReference)
                  .maybeSingle();

                if (cobError || !cob) {
                  console.warn("[Billing MP] Cobrança não localizada:", externalReference);
                  return NextResponse.json({ error: "Cobrança de referência não encontrada." }, { status: 404 });
                }

                // Se já confirmada, encerra com idempotência sem duplicar
                if (cob.status === "paga") {
                  return NextResponse.json({ success: true, message: "Pagamento já confirmado anteriormente (idempotente)." });
                }

                // Validação de valor: montante pago deve ser maior ou igual ao valor da fatura
                const paidAmount = Number(paymentData.transaction_amount || 0);
                const expectedAmount = Number(cob.valor || 0);
                if (expectedAmount > 0 && paidAmount < expectedAmount) {
                  console.error(`[Billing MP] Divergência de valor: pago R$ ${paidAmount}, esperado R$ ${expectedAmount}`);
                  return NextResponse.json({ error: "Valor pago inferior ao montante da cobrança." }, { status: 400 });
                }

                await activatePaidSubscription(clientDb, externalReference, "mercadopago", paidAmount, { payment_id: paymentId });
              }
            }
          }
        } catch (mpErr) {
          console.error("Erro ao validar pagamento MP:", mpErr);
        }
      }
      return NextResponse.json({ success: true });
    }

    // ─── 3. Webhook Asaas ───────────────────────────────────────────
    if (body.event && body.payment) {
      const asaasToken = req.headers.get("asaas-access-token");
      const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
      
      // Validação obrigatória de segurança: rejeita se token não configurado ou inválido
      if (!expectedToken || asaasToken !== expectedToken) {
        console.warn("[Billing Webhook] Assinatura Asaas inválida ou não autorizada.");
        return NextResponse.json({ error: "Token de webhook Asaas não autorizado ou ausente" }, { status: 401 });
      }

      if (!supabaseAdmin) {
        console.error("[Billing Webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
        return NextResponse.json({ error: "Processamento de cobrança temporariamente indisponível." }, { status: 503 });
      }
      const clientDb = supabaseAdmin;

      const event = body.event;
      const payment = body.payment;
      const externalRef = payment.externalReference;

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        if (externalRef) {
          const { data: cob } = await clientDb
            .from("cobrancas_saas")
            .select("id, empresa_id, status")
            .eq("id", externalRef)
            .maybeSingle();

          if (cob && cob.status !== "paga") {
            await activatePaidSubscription(clientDb, externalRef, "asaas", Number(payment.value || 0), { event });
          }
        }
      } else if (event === "PAYMENT_OVERDUE") {
        if (externalRef) {
          const { data: cob } = await clientDb.from("cobrancas_saas").select("empresa_id").eq("id", externalRef).single();
          if (cob?.empresa_id) {
            await clientDb.from("empresas").update({ status: "bloqueada", updated_at: new Date().toISOString() }).eq("id", cob.empresa_id);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    // ─── 4. Webhook EFI / Gerencianet ───────────────────────────────
    if (body.pix && Array.isArray(body.pix)) {
      const efiSecret = req.headers.get("x-efi-secret") || req.headers.get("x-webhook-secret");
      const expectedEfiSecret = process.env.EFI_WEBHOOK_SECRET;

      if (!expectedEfiSecret || efiSecret !== expectedEfiSecret) {
        return NextResponse.json({ error: "Segredo de webhook EFI/Gerencianet inválido ou ausente." }, { status: 401 });
      }

      if (!supabaseAdmin) {
        console.error("[Billing Webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
        return NextResponse.json({ error: "Processamento de cobrança temporariamente indisponível." }, { status: 503 });
      }
      const clientDb = supabaseAdmin;

      for (const pix of body.pix) {
        const txid = pix.txid;
        if (txid) {
          const { data: cob } = await clientDb
            .from("cobrancas_saas")
            .select("id, empresa_id, status")
            .eq("id", txid)
            .maybeSingle();

          if (cob && cob.status !== "paga") {
            await activatePaidSubscription(clientDb, txid, "pix_efi", Number(pix.valor || 0), { txid });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Erro no processamento do webhook:", err);
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
