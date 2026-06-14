import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, json, err } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface SubmitBody {
  responsible_name: string;
  email: string;
  brand_name: string;
  phone?: string;
  city?: string;
  state?: string;
  operation_type?: string;
  monthly_volume_kg?: number;
  message?: string;
  links?: Record<string, string>;
  applicant_user_id?: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: SubmitBody = await req.json();

    if (!body.responsible_name?.trim()) return err("Nome é obrigatório", 400);
    if (!body.email?.includes("@")) return err("Email inválido", 400);
    if (!body.brand_name?.trim()) return err("Nome da marca é obrigatório", 400);

    // Check for duplicate pending application from same email
    const { data: existing } = await supabase
      .from("producer_applications")
      .select("id, status")
      .eq("email", body.email.trim().toLowerCase())
      .in("status", ["pending", "reviewing"])
      .maybeSingle();

    if (existing) {
      return json({ id: existing.id, status: existing.status, duplicate: true });
    }

    const { data, error } = await supabase
      .from("producer_applications")
      .insert({
        responsible_name: body.responsible_name.trim(),
        email: body.email.trim().toLowerCase(),
        brand_name: body.brand_name.trim(),
        phone: body.phone?.trim() ?? null,
        city: body.city?.trim() ?? null,
        state: body.state?.trim() ?? null,
        operation_type: body.operation_type ?? null,
        monthly_volume_kg: body.monthly_volume_kg ? Number(body.monthly_volume_kg) : null,
        message: body.message?.trim() ?? null,
        links: body.links ?? {},
        applicant_user_id: body.applicant_user_id ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return err(error.message, 500);

    return json({ id: data.id, status: "pending" });
  } catch (e: any) {
    console.error("submit-producer-application error:", e.message);
    return err(e.message ?? "Erro interno", 500);
  }
});
