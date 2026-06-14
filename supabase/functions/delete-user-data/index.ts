import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function hashEmail(email: string): string {
  // Deterministic pseudonymization (not reversible without the full email)
  const encoded = new TextEncoder().encode(email);
  let hash = 0n;
  for (const b of encoded) hash = (hash * 31n + BigInt(b)) % (2n ** 32n);
  return `removido-${hash.toString(16)}@excluido.local`;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Requer JWT válido
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return err("Autenticação necessária", 401);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return err("Token inválido ou expirado", 401);

  try {
    const body = await req.json().catch(() => ({}));
    const confirmed = body.confirmed === true;

    if (!confirmed) {
      return err("Confirmação obrigatória. Envie { confirmed: true } para prosseguir.", 400);
    }

    const userId = user.id;

    // 1. Registra solicitação de exclusão
    await supabase.from("data_deletion_requests" as any).insert({
      user_id: userId,
      status: "processing",
    });

    // 2. Cancela assinaturas ativas no Mercado Pago
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("id, mp_preapproval_id")
      .eq("customer_id", userId)
      .in("status", ["active", "pending"]);

    if ((activeSubs ?? []).length > 0) {
      const { data: settings } = await supabase
        .from("tenant_credentials")
        .select("mp_access_token")
        .eq("tenant_id", "default")
        .single();

      for (const sub of activeSubs ?? []) {
        if (sub.mp_preapproval_id && settings?.mp_access_token) {
          await fetch(`https://api.mercadopago.com/preapproval/${sub.mp_preapproval_id}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${settings.mp_access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "cancelled" }),
          }).catch(() => null);
        }
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() } as any)
          .eq("id", sub.id);
      }
    }

    // 3. Anonimiza perfil
    await supabase
      .from("profiles")
      .update({
        full_name: "Usuário Removido",
        phone: null,
        document: null,
        avatar_url: null,
        birth_date: null,
        preferences: {},
      })
      .eq("id", userId);

    // 4. Anonimiza campos LGPD sensíveis em pedidos guest
    await supabase
      .from("orders")
      .update({ guest_name: null, guest_cpf: null })
      .eq("customer_id", userId);

    // 5. Anonimiza avaliações (mantém rating, apaga texto)
    await supabase
      .from("product_reviews")
      .update({ comment: null } as any)
      .eq("customer_id", userId);

    // 6. Atualiza e-mail e metadados na auth (pseudonimiza)
    const anonEmail = hashEmail(user.email ?? userId);
    await supabase.auth.admin.updateUserById(userId, {
      email: anonEmail,
      user_metadata: { deleted: true, deleted_at: new Date().toISOString() },
    });

    // 7. Marca solicitação como concluída
    await supabase
      .from("data_deletion_requests" as any)
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "processing");

    // 8. Invalida sessões (força logout)
    await supabase.auth.admin.signOut(token, "global").catch(() => null);

    return json({
      success: true,
      message:
        "Seus dados pessoais foram anonimizados. O histórico de pedidos é mantido por obrigação fiscal.",
    });
  } catch (e: any) {
    console.error("delete-user-data error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
