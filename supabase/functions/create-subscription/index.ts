import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface CreateSubBody {
  tenant_id?: string;
  plan_id: string;
  // Identity (authenticated user or guest)
  customer_id?: string;
  payer_email: string;
  back_url: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: CreateSubBody = await req.json();
    const tenantId = body.tenant_id ?? "default";

    if (!body.plan_id) return err("plan_id é obrigatório", 400);
    if (!body.payer_email?.includes("@")) return err("Email inválido", 400);

    // 1. Busca credenciais do tenant
    const { data: settings } = await supabase
      .from("tenant_credentials")
      .select("mp_access_token, mp_environment, store_name")
      .eq("tenant_id", tenantId)
      .single();

    if (!settings?.mp_access_token) {
      return err("Credenciais do Mercado Pago não configuradas", 400);
    }

    // 2. Busca plano de assinatura
    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("id", body.plan_id)
      .single();

    if (!plan) return err("Plano não encontrado", 404);

    const { mp_access_token, mp_environment, store_name } = settings;
    const mpBase = "https://api.mercadopago.com";

    // 3. Cria registro de assinatura (pending)
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        customer_id: body.customer_id ?? null,
        plan_id: body.plan_id,
        status: "pending",
        mp_payment_status: "pending",
      })
      .select("id")
      .single();

    if (subErr || !sub) return err(`Erro ao criar assinatura: ${subErr?.message}`, 500);

    // 4. Cria preapproval no Mercado Pago
    const backUrl = body.back_url.replace(/\/$/, "");
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-subscription-webhook?tenant_id=${tenantId}`;

    const preapprovalBody: Record<string, unknown> = {
      reason: `${store_name ?? "Clube do Café"} — ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.monthly_price),
        currency_id: "BRL",
      },
      payer_email: body.payer_email,
      back_url: `${backUrl}/clube?status=success&sub_id=${sub.id}`,
      external_reference: sub.id,
      notification_url: webhookUrl,
      status: "pending",
    };

    // Usa preapproval_plan_id do MP se configurado no plano
    if ((plan as any).mp_preapproval_plan_id) {
      preapprovalBody.preapproval_plan_id = (plan as any).mp_preapproval_plan_id;
    }

    const mpRes = await fetch(`${mpBase}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mp_access_token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": sub.id,
      },
      body: JSON.stringify(preapprovalBody),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      // Cleanup the pending subscription
      await supabase.from("subscriptions").delete().eq("id", sub.id);
      return err(`Erro Mercado Pago: ${mpData.message ?? mpRes.statusText}`, 502);
    }

    // 5. Salva o preapproval ID
    await supabase
      .from("subscriptions")
      .update({ mp_preapproval_id: mpData.id })
      .eq("id", sub.id);

    // Usa sandbox init point em ambiente de testes
    const approvalUrl = mp_environment === "sandbox"
      ? (mpData.init_point ?? mpData.sandbox_init_point)
      : mpData.init_point;

    return json({
      subscription_id: sub.id,
      approval_url: approvalUrl,
      mp_preapproval_id: mpData.id,
    });
  } catch (e: any) {
    console.error("create-subscription error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
