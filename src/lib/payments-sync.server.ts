/** Reconciliação de pagamento → pedido → estoque. Somente servidor. */
import { getMpPayment, mapPaymentStatus, type MpPayment } from "./payments.server";

export type SyncResult = {
  order_id: string | null;
  payment_status: "pending" | "authorized" | "paid" | "failed" | "refunded";
  provider_status: string;
};

/**
 * Aplica o estado real do provedor no banco. Sempre reconsulta a API do
 * Mercado Pago: o corpo do webhook nunca é fonte de verdade.
 */
export async function syncPaymentFromProvider(
  providerPaymentId: string | number,
  known?: MpPayment,
): Promise<SyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mp = known ?? (await getMpPayment(providerPaymentId));
  const providerStatus = String(mp.status ?? "pending");
  const status = mapPaymentStatus(providerStatus);

  const { data: row } = await supabaseAdmin
    .from("payments")
    .select("id, order_id, status")
    .eq("provider", "mercadopago")
    .eq("provider_payment_id", String(mp.id))
    .maybeSingle();

  const orderId = (row?.order_id as string | undefined) ?? null;

  const td = mp.point_of_interaction?.transaction_data;
  const patch = {
    status,
    provider_status: providerStatus,
    method: (mp.payment_method_id as string | null) ?? null,
    installments: (mp.installments as number | null) ?? null,
    failure_reason: status === "failed" ? ((mp.status_detail as string | null) ?? null) : null,
    qr_code: td?.qr_code ?? null,
    qr_code_base64: td?.qr_code_base64 ?? null,
    ticket_url: td?.ticket_url ?? null,
    expires_at: (mp.date_of_expiration as string | null) ?? null,
    raw_payload: mp as unknown as Record<string, unknown>,
  };

  if (row?.id) {
    await supabaseAdmin.from("payments").update(patch).eq("id", row.id);
  }

  if (!orderId) return { order_id: null, payment_status: status, provider_status: providerStatus };

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, payment_status, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { order_id: orderId, payment_status: status, provider_status: providerStatus };

  if (status === "paid" && order.payment_status !== "paid") {
    await supabaseAdmin.rpc("commit_stock", { _order_id: orderId });
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", status: "paid", payment_reference: String(mp.id) })
      .eq("id", orderId);
  } else if (status === "failed" && order.payment_status !== "paid") {
    await supabaseAdmin.rpc("release_stock", { _order_id: orderId, _reason: providerStatus });
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", payment_reference: String(mp.id) })
      .eq("id", orderId);
  } else if (status === "refunded") {
    await supabaseAdmin.from("orders").update({ payment_status: "refunded" }).eq("id", orderId);
  } else if (order.payment_status === "pending" && status === "authorized") {
    await supabaseAdmin.from("orders").update({ payment_status: "authorized" }).eq("id", orderId);
  }

  return { order_id: orderId, payment_status: status, provider_status: providerStatus };
}
