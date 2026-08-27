/** Painel de integrações: status das credenciais do servidor + preferências salvas no banco. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

const SETTING_KEYS = [
  "integrations.mp_environment",
  "integrations.me_environment",
  "integrations.email_from_name",
  "integrations.email_from_address",
  "integrations.email_reply_to",
] as const;

export const getIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("key, value")
      .in("key", SETTING_KEYS as unknown as string[]);
    if (error) throw new Error(error.message);

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      const v = (row as any).value;
      settings[(row as any).key] = typeof v === "string" ? v : (v?.value ?? "");
    }

    const has = (name: string) => !!process.env[name]?.trim();

    return {
      settings,
      credentials: {
        mp_access_token: has("MERCADOPAGO_ACCESS_TOKEN"),
        mp_public_key: has("MERCADOPAGO_PUBLIC_KEY"),
        mp_webhook_secret: has("MERCADOPAGO_WEBHOOK_SECRET"),
        melhor_envio_token: has("MELHOR_ENVIO_TOKEN"),
        resend_api_key: has("RESEND_API_KEY"),
      },
    };
  });

export const saveIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        settings: z.record(z.enum(SETTING_KEYS), z.string().max(200)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = Object.entries(data.settings).map(([key, value]) => ({
      key,
      value: value as unknown as any,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("platform_settings").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_logs").insert({
      actor_user_id: context.userId,
      action: "settings.integrations_updated",
      entity_type: "platform_settings",
      details: { keys: rows.map((r) => r.key) },
    });

    return { ok: true };
  });

export const testMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"]?.trim();
    if (!token) return { ok: false, message: "Credencial MERCADOPAGO_ACCESS_TOKEN não configurada." };

    const meRes = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meBody = await meRes.json().catch(() => ({}) as any);
    if (!meRes.ok) {
      return { ok: false, message: `Mercado Pago [${meRes.status}]: ${(meBody as any).message ?? "token inválido"}` };
    }

    // Verifica ambiente usando o endpoint de pagamentos.
    const paymentsRes = await fetch("https://api.mercadopago.com/v1/payments/search?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const paymentsBody = await paymentsRes.json().catch(() => ({}) as any);
    const liveMode = (paymentsBody as any).live_mode;
    const envLabel = liveMode === true ? "Produção" : liveMode === false ? "Sandbox" : "Ambiente não identificado";

    return {
      ok: true,
      message: `Conectado como ${(meBody as any).nickname ?? (meBody as any).email ?? "conta MP"} (${(meBody as any).site_id ?? "?"}) — ${envLabel}`,
      live_mode: liveMode,
    };
  });

/** Debug temporário: retorna metadados da resposta de payments/search sem expor dados. */
export const debugMpEnvironment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"]?.trim();
    if (!token) return { ok: false, status: null, live_mode: null, keys: [] };

    const res = await fetch("https://api.mercadopago.com/v1/payments/search?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}) as any);
    return {
      ok: res.ok,
      status: res.status,
      live_mode: body.live_mode ?? null,
      keys: Object.keys(body).slice(0, 10),
    };
  });

export const testMelhorEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ environment: z.enum(["sandbox", "production"]).default("sandbox") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const token = process.env["MELHOR_ENVIO_TOKEN"]?.trim();
    if (!token) return { ok: false, message: "Credencial MELHOR_ENVIO_TOKEN não configurada." };

    const base =
      data.environment === "production" ? "https://melhorenvio.com.br" : "https://sandbox.melhorenvio.com.br";
    const res = await fetch(`${base}/api/v2/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}) as any);
    if (!res.ok) {
      return { ok: false, message: `Melhor Envio [${res.status}]: ${(body as any).message ?? "token inválido"}` };
    }
    return { ok: true, message: `Conectado como ${(body as any).firstname ?? "usuário"} ${(body as any).lastname ?? ""}`.trim() };
  });
