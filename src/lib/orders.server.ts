/** Montagem do detalhe de pedido. Somente servidor. */
import { CUSTOM_BUCKET } from "./cart-validation";

type AnyClient = any;

const FILE_FIELD_TYPES = new Set(["file", "image"]);

async function withSignedFiles(client: AnyClient, items: any[]) {
  const out: any[] = [];
  for (const item of items) {
    const raw = Array.isArray(item.customization_data) ? item.customization_data : [];
    const customizations = [];
    for (const c of raw) {
      let signed_url: string | null = null;
      if (FILE_FIELD_TYPES.has(String(c?.field_type)) && typeof c?.value === "string" && c.value) {
        const { data } = await client.storage.from(CUSTOM_BUCKET).createSignedUrl(c.value, 60 * 10);
        signed_url = data?.signedUrl ?? null;
      }
      customizations.push({ ...c, signed_url });
    }
    out.push({ ...item, customizations });
  }
  return out;
}

export async function buildOrderDetail(
  client: AnyClient,
  orderId: string,
  opts: { includeInternal?: boolean } = {},
) {
  const { data: order, error } = await client
    .from("orders")
    .select(
      "id, customer_id, status, payment_status, subtotal, discount_total, shipping_total, total, shipping_address, shipping_snapshot, production_days, payment_provider, payment_reference, notes, created_at, updated_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Pedido não encontrado.");

  const [{ data: rawItems }, { data: history }, { data: shipments }, { data: payments }] = await Promise.all([
    client
      .from("order_items")
      .select(
        "id, product_id, variant_id, product_name, variant_name_snapshot, sku_snapshot, quantity, unit_price, total_price, customization_data, production_status, production_notes",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("order_status_history")
      .select("id, from_status, to_status, notes, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("shipments")
      .select(
        "id, carrier, service, tracking_code, tracking_url, status, shipped_at, delivered_at, estimated_delivery_at, created_at",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: true }),
    client
      .from("payments")
      .select(
        "id, provider, provider_payment_id, status, provider_status, method, amount, created_at, failure_reason, refunded_amount, refund_reason, refunded_at",
      )
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
  ]);

  const items = await withSignedFiles(client, rawItems ?? []);

  const shipmentIds = (shipments ?? []).map((s: any) => s.id);
  const { data: events } = shipmentIds.length
    ? await client
        .from("tracking_events")
        .select("id, shipment_id, status, description, location, occurred_at")
        .in("shipment_id", shipmentIds)
        .order("occurred_at", { ascending: false })
    : { data: [] as any[] };

  const shipmentsWithEvents = (shipments ?? []).map((s: any) => ({
    ...s,
    events: (events ?? []).filter((e: any) => e.shipment_id === s.id),
  }));

  let customer: { id: string; full_name: string | null; email: string | null; phone: string | null } | null = null;
  let reservations: any[] = [];

  if (opts.includeInternal) {
    const { data: profile } = await client
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", order.customer_id)
      .maybeSingle();
    customer = profile ?? null;

    const { data: res } = await client
      .from("stock_reservations")
      .select("id, product_id, variant_id, quantity, status, expires_at, created_at")
      .eq("order_id", orderId);
    reservations = res ?? [];
  }

  return {
    order,
    items,
    history: history ?? [],
    shipments: shipmentsWithEvents,
    payments: payments ?? [],
    customer,
    reservations,
  };
}