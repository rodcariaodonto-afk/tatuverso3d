import { createClient } from "npm:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// MP preapproval status → internal subscription_status
const PREAPPROVAL_STATUS: Record<string, string> = {
  pending: "pending",
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
  expired: "cancelled",
};

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id") ?? "default";
    const body = await req.json();

    // MP envia eventos de preapproval e de pagamentos recorrentes
    const eventType = body.type as string;

    if (eventType === "subscription_preapproval") {
      await handlePreapproval(body, tenantId);
    } else if (eventType === "subscription_authorized_payment") {
      await handleAuthorizedPayment(body, tenantId);
    }

    // Retorna 200 sempre para evitar reenvios
    return json({ received: true });
  } catch (e: any) {
    console.error("mp-subscription-webhook error:", e.message);
    return json({ received: true, error: e.message });
  }
});

async function handlePreapproval(body: any, tenantId: string) {
  const preapprovalId = String(body.data?.id ?? "");
  if (!preapprovalId) return;

  // Busca credenciais
  const { data: settings } = await supabase
    .from("tenant_credentials")
    .select("mp_access_token")
    .eq("tenant_id", tenantId)
    .single();
  if (!settings?.mp_access_token) return;

  // Busca preapproval no MP
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${settings.mp_access_token}` },
  });
  if (!res.ok) return;

  const preapproval = await res.json();
  const mpStatus: string = preapproval.status ?? "pending";
  const internalStatus = PREAPPROVAL_STATUS[mpStatus] ?? "pending";
  const externalRef: string | null = preapproval.external_reference ?? null;

  if (!externalRef) {
    console.warn("mp-subscription-webhook: external_reference ausente no preapproval", preapprovalId);
    return;
  }

  const updates: Record<string, unknown> = {
    status: internalStatus,
    mp_preapproval_id: preapprovalId,
    updated_at: new Date().toISOString(),
  };

  if (internalStatus === "active") {
    updates.started_at = new Date().toISOString();
  }
  if (internalStatus === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
  }

  await supabase.from("subscriptions").update(updates as any).eq("id", externalRef);

  console.log(`mp-subscription-webhook: sub ${externalRef} → ${internalStatus}`);
}

async function handleAuthorizedPayment(body: any, tenantId: string) {
  const paymentId = String(body.data?.id ?? "");
  if (!paymentId) return;

  // Busca credenciais
  const { data: settings } = await supabase
    .from("tenant_credentials")
    .select("mp_access_token")
    .eq("tenant_id", tenantId)
    .single();
  if (!settings?.mp_access_token) return;

  // Busca pagamento
  const res = await fetch(
    `https://api.mercadopago.com/authorized_payments/${paymentId}`,
    { headers: { Authorization: `Bearer ${settings.mp_access_token}` } },
  );
  if (!res.ok) return;

  const payment = await res.json();
  const preapprovalId: string | null = payment.preapproval_id ?? null;
  const paymentStatus: string = payment.status ?? "unknown";
  if (!preapprovalId) return;

  // Atualiza payment_status na assinatura
  await supabase
    .from("subscriptions")
    .update({ mp_payment_status: paymentStatus, updated_at: new Date().toISOString() } as any)
    .eq("mp_preapproval_id", preapprovalId);

  console.log(`mp-subscription-webhook: payment ${paymentId} → ${paymentStatus}`);
}
