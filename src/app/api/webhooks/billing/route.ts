import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ─── 1. Confirmação Manual pelo Painel de Controle ─────────────
    if (body.action === "confirm_manual" && body.cobranca_id) {
      const { data: cobranca, error: findError } = await supabase
        .from("cobrancas_saas")
        .select("*, empresas(*)")
        .eq("id", body.cobranca_id)
        .single();

      if (findError || !cobranca) {
        return NextResponse.json({ error: "Cobrança não encontrada" }, { status: 404 });
      }

      // Atualiza cobrança como paga
      await supabase
        .from("cobrancas_saas")
        .update({
          status: "paga",
          pago_em: new Date().toISOString()
        })
        .eq("id", body.cobranca_id);

      // Reativa a empresa cliente e estende acesso por 30 dias
      if (cobranca.empresa_id) {
        await supabase
          .from("empresas")
          .update({
            status: "ativa",
            updated_at: new Date().toISOString()
          })
          .eq("id", cobranca.empresa_id);
      }

      return NextResponse.json({ success: true, message: "Pagamento confirmado e empresa ativada com sucesso!" });
    }

    // ─── 2. Webhook Mercado Pago ────────────────────────────────────
    if (body.type === "payment" || body.action === "payment.updated" || body.data?.id) {
      const paymentId = body.data?.id || body.id;

      // Busca credencial do Mercado Pago no banco
      const { data: config } = await supabase
        .from("app_configuracoes")
        .select("mercadopago_access_token")
        .eq("id", 1)
        .single();

      if (config?.mercadopago_access_token && paymentId) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              Authorization: `Bearer ${config.mercadopago_access_token}`
            }
          });
          const paymentData = await mpRes.json();

          if (paymentData.status === "approved") {
            const externalRef = paymentData.external_reference; // Contém o ID da cobranca ou empresa

            if (externalRef) {
              await supabase
                .from("cobrancas_saas")
                .update({ status: "paga", pago_em: new Date().toISOString(), gateway_cobranca_id: String(paymentId) })
                .eq("id", externalRef);

              // Ativa empresa
              const { data: cob } = await supabase.from("cobrancas_saas").select("empresa_id").eq("id", externalRef).single();
              if (cob?.empresa_id) {
                await supabase.from("empresas").update({ status: "ativa" }).eq("id", cob.empresa_id);
              }
            }
          }
        } catch (e) {
          console.warn("Aviso ao processar Mercado Pago:", e);
        }
      }

      return NextResponse.json({ success: true });
    }

    // ─── 3. Webhook Asaas ───────────────────────────────────────────
    if (body.event && body.payment) {
      const event = body.event;
      const payment = body.payment;
      const externalRef = payment.externalReference;

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        if (externalRef) {
          await supabase
            .from("cobrancas_saas")
            .update({ status: "paga", pago_em: new Date().toISOString() })
            .eq("id", externalRef);

          const { data: cob } = await supabase.from("cobrancas_saas").select("empresa_id").eq("id", externalRef).single();
          if (cob?.empresa_id) {
            await supabase.from("empresas").update({ status: "ativa" }).eq("id", cob.empresa_id);
          }
        }
      } else if (event === "PAYMENT_OVERDUE") {
        // Bloqueia empresa inadimplente
        if (externalRef) {
          const { data: cob } = await supabase.from("cobrancas_saas").select("empresa_id").eq("id", externalRef).single();
          if (cob?.empresa_id) {
            await supabase.from("empresas").update({ status: "bloqueada" }).eq("id", cob.empresa_id);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    // ─── 4. Webhook EFI / Gerencianet ───────────────────────────────
    if (body.pix && Array.isArray(body.pix)) {
      for (const pix of body.pix) {
        const txid = pix.txid;
        if (txid) {
          await supabase
            .from("cobrancas_saas")
            .update({ status: "paga", pago_em: new Date().toISOString() })
            .eq("id", txid);

          const { data: cob } = await supabase.from("cobrancas_saas").select("empresa_id").eq("id", txid).single();
          if (cob?.empresa_id) {
            await supabase.from("empresas").update({ status: "ativa" }).eq("id", cob.empresa_id);
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
