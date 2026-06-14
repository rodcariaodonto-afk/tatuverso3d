import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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
    const userId = user.id;

    // Busca todos os dados do usuário em paralelo
    const [
      profileRes,
      rolesRes,
      ordersRes,
      subsRes,
      reviewsRes,
      quizRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("user_roles").select("role, created_at").eq("user_id", userId),
      supabase
        .from("orders")
        .select("id, status, payment_status, subtotal, shipping_total, total, created_at, shipping_address, order_items(product_name, quantity, unit_price, total_price)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("id, status, mp_payment_status, started_at, cancelled_at, created_at, subscription_plans(name, monthly_price, cycle)")
        .eq("customer_id", userId),
      supabase
        .from("product_reviews")
        .select("id, rating, comment, created_at, products(name)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("quiz_responses")
        .select("answers, recommended_product_ids, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const exportData = {
      export_date: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      profile: profileRes.data ?? null,
      roles: rolesRes.data ?? [],
      orders: ordersRes.data ?? [],
      subscriptions: subsRes.data ?? [],
      reviews: reviewsRes.data ?? [],
      quiz_responses: quizRes.data ?? [],
    };

    const jsonStr = JSON.stringify(exportData, null, 2);

    return new Response(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    console.error("export-user-data error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
