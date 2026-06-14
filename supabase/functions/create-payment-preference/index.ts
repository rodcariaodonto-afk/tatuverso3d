import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  variant_id: string;
  product_id: string;
  producer_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  grind_option: string;
  weight_grams: number | null;
  variant_label?: string;
}

interface ShippingService {
  id: string;
  name: string;
  company: string;
  price: number;
  delivery_time: number;
}

interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CreatePaymentBody {
  tenant_id?: string;
  method: "checkout_pro" | "pix";
  // Identity
  customer_id?: string;
  guest_email?: string;
  guest_name?: string;
  guest_cpf?: string;
  // Items
  items: OrderItem[];
  subtotal: number;
  shipping_total: number;
  discount_total?: number;
  total: number;
  shipping_address: ShippingAddress;
  shipping_service: ShippingService;
  back_url: string;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: CreatePaymentBody = await req.json();
    const tenantId = body.tenant_id ?? "default";

    // 1. Busca credenciais do tenant
    const { data: settings, error: settingsErr } = await supabase
      .from("tenant_credentials")
      .select("mp_access_token, mp_environment, store_name, cep_origem")
      .eq("tenant_id", tenantId)
      .single();

    if (settingsErr || !settings) {
      return err("Configurações da plataforma não encontradas", 404);
    }
    if (!settings.mp_access_token) {
      return err("Access Token do Mercado Pago não configurado", 400);
    }

    const { mp_access_token, mp_environment } = settings;
    const mpBase = "https://api.mercadopago.com";

    // 2. Cria pedido no Supabase via service_role
    const payerEmail = body.customer_id
      ? await getCustomerEmail(body.customer_id)
      : (body.guest_email ?? "guest@cafezeira.com");

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: body.customer_id ?? null,
        guest_email: body.guest_email ?? null,
        guest_name: body.guest_name ?? null,
        guest_cpf: body.guest_cpf ?? null,
        status: "pending",
        payment_status: "pending",
        payment_provider: "mercado_pago",
        subtotal: body.subtotal,
        shipping_total: body.shipping_total,
        discount_total: body.discount_total ?? 0,
        total: body.total,
        shipping_address: body.shipping_address,
        shipping_service: body.shipping_service,
        notes: null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      return err(`Erro ao criar pedido: ${orderErr?.message}`, 500);
    }

    // 3. Cria order_items (tenta encontrar producer_id se não veio no carrinho)
    const producerMap = await fetchProducerMap(body.items.map((i) => i.product_id));

    const orderItemsPayload = body.items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      variant_id: i.variant_id || null,
      producer_id: i.producer_id ?? producerMap.get(i.product_id) ?? null,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.unit_price * i.quantity,
      grind_option: i.grind_option || null,
    }));

    const validItems = orderItemsPayload.filter((i) => i.producer_id !== null);
    if (validItems.length !== orderItemsPayload.length) {
      console.warn("Alguns itens sem producer_id foram ignorados");
    }

    if (validItems.length > 0) {
      const { error: itemsErr } = await supabase.from("order_items").insert(validItems);
      if (itemsErr) console.error("Erro ao inserir order_items:", itemsErr.message);
    }

    // 4. Chama a API do Mercado Pago
    const orderId = order.id;
    const backUrl = body.back_url.replace(/\/$/, "");
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook?tenant_id=${tenantId}`;

    if (body.method === "pix") {
      return await createPixPayment({
        mpBase,
        mp_access_token,
        orderId,
        total: body.total,
        payerEmail,
        cpf: body.guest_cpf,
        webhookUrl,
      });
    }

    // Default: Checkout Pro
    const preference = {
      items: body.items.map((i) => ({
        id: i.variant_id || i.product_id,
        title: i.variant_label ? `${i.product_name} — ${i.variant_label}` : i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        currency_id: "BRL",
      })),
      payer: { email: payerEmail },
      back_urls: {
        success: `${backUrl}/checkout?status=success&order_id=${orderId}`,
        failure: `${backUrl}/checkout?status=failure&order_id=${orderId}`,
        pending: `${backUrl}/checkout?status=pending&order_id=${orderId}`,
      },
      auto_approve: mp_environment === "sandbox",
      notification_url: webhookUrl,
      external_reference: orderId,
      payment_methods: { installments: 12 },
      shipments: {
        cost: body.shipping_total,
        mode: "not_specified",
      },
    };

    const mpRes = await fetch(`${mpBase}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mp_access_token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": orderId,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      return err(`Erro Mercado Pago: ${mpData.message ?? mpRes.statusText}`, 502);
    }

    return json({
      order_id: orderId,
      init_point: mp_environment === "sandbox" ? mpData.sandbox_init_point : mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
    });
  } catch (e: any) {
    console.error(e);
    return err(e.message ?? "Erro interno", 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createPixPayment(opts: {
  mpBase: string;
  mp_access_token: string;
  orderId: string;
  total: number;
  payerEmail: string;
  cpf?: string;
  webhookUrl: string;
}) {
  if (!opts.cpf) {
    return err("CPF é obrigatório para pagamento via PIX nativo", 400);
  }

  const pixBody: Record<string, unknown> = {
    transaction_amount: opts.total,
    payment_method_id: "pix",
    payer: {
      email: opts.payerEmail,
      identification: { type: "CPF", number: opts.cpf.replace(/\D/g, "") },
    },
    description: `Pedido ${opts.orderId.slice(0, 8)}`,
    external_reference: opts.orderId,
    notification_url: opts.webhookUrl,
    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };

  const res = await fetch(`${opts.mpBase}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.mp_access_token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pix-${opts.orderId}`,
    },
    body: JSON.stringify(pixBody),
  });

  const data = await res.json();
  if (!res.ok) {
    return err(`Erro PIX Mercado Pago: ${data.message ?? res.statusText}`, 502);
  }

  // Atualiza payment_reference no pedido
  await supabase
    .from("orders")
    .update({ payment_reference: String(data.id) })
    .eq("id", opts.orderId);

  const txn = data.point_of_interaction?.transaction_data ?? {};
  return json({
    order_id: opts.orderId,
    payment_id: data.id,
    pix_qr_code: txn.qr_code ?? null,
    pix_qr_code_base64: txn.qr_code_base64 ?? null,
    pix_expiration: data.date_of_expiration ?? null,
  });
}

async function getCustomerEmail(userId: string): Promise<string> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email ?? "cliente@cafezeira.com";
}

async function fetchProducerMap(productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const { data } = await supabase
    .from("products")
    .select("id, producer_id")
    .in("id", productIds);
  return new Map((data ?? []).map((p: any) => [p.id, p.producer_id]));
}
