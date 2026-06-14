import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { application_id, commission_rate = 12 } = await req.json();

    if (!application_id) return err("application_id é obrigatório", 400);

    // 1. Fetch application
    const { data: app, error: appErr } = await supabase
      .from("producer_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appErr || !app) return err("Candidatura não encontrada", 404);
    if (app.status === "approved") return err("Candidatura já aprovada", 409);

    // 2. Build unique slug
    const baseSlug = slugify(app.brand_name);
    const { data: existing } = await supabase
      .from("producers")
      .select("slug")
      .like("slug", `${baseSlug}%`);
    const slug =
      (existing ?? []).length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    // 3. Create producer record
    const { data: producer, error: prodErr } = await supabase
      .from("producers")
      .insert({
        name: app.brand_name,
        slug,
        contact_email: app.email,
        contact_phone: app.phone ?? null,
        city: app.city ?? null,
        state: app.state ?? null,
        description: app.message ?? null,
        status: "active",
        commission_rate: Number(commission_rate),
        owner_user_id: app.applicant_user_id ?? null,
      })
      .select("id")
      .single();

    if (prodErr || !producer) {
      return err(`Erro ao criar produtor: ${prodErr?.message}`, 500);
    }

    // 4. Assign producer role (if user already has an account)
    if (app.applicant_user_id) {
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: app.applicant_user_id, role: "producer" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (roleErr) console.warn("role upsert error:", roleErr.message);
    } else {
      // Invite user by email so they can set a password and access the panel
      const siteUrl = Deno.env.get("SITE_URL") ?? Deno.env.get("SUPABASE_URL")!;
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
        app.email,
        {
          data: {
            full_name: app.responsible_name,
            invited_as_producer: true,
            producer_id: producer.id,
          },
          redirectTo: `${siteUrl}/produtor`,
        },
      );
      if (inviteErr) {
        console.warn("Email invite failed (non-fatal):", inviteErr.message);
      }
    }

    // 5. Mark application approved
    await supabase
      .from("producer_applications")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", application_id);

    return json({ producer_id: producer.id, slug });
  } catch (e: any) {
    console.error("approve-producer error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
