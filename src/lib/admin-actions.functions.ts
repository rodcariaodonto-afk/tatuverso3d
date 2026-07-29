import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Informe o nome."),
        email: z.string().trim().email("Email inválido."),
        password: z.string().min(8, "A senha temporária precisa ter pelo menos 8 caracteres."),
        makeAdmin: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });

    if (roleError || !isAdmin) {
      throw new Error("Acesso restrito a administradores.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedEmail = data.email.toLowerCase();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        must_change_password: true,
      },
    });

    if (createError) {
      throw new Error(createError.message);
    }

    const createdUser = created.user;
    if (!createdUser) {
      throw new Error("Não foi possível criar o usuário.");
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("preferences")
      .eq("id", createdUser.id)
      .maybeSingle();

    const existingPreferences =
      existingProfile?.preferences &&
      typeof existingProfile.preferences === "object" &&
      !Array.isArray(existingProfile.preferences)
        ? (existingProfile.preferences as Record<string, Json | undefined>)
        : {};

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: createdUser.id,
      full_name: data.fullName,
      email: normalizedEmail,
      preferences: { ...existingPreferences, must_change_password: true },
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (data.makeAdmin) {
      const { error: roleInsertError } = await supabaseAdmin.from("user_roles").upsert(
        {
          user_id: createdUser.id,
          role: "admin",
        },
        { onConflict: "user_id,role" },
      );

      if (roleInsertError) {
        throw new Error(roleInsertError.message);
      }
    }

    return { id: createdUser.id, email: normalizedEmail };
  });

export const adminSetTemporaryPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        password: z.string().min(8, "A senha temporária precisa ter pelo menos 8 caracteres."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });

    if (roleError || !isAdmin) {
      throw new Error("Acesso restrito a administradores.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(data.userId);

    if (getUserError || !target.user) {
      throw new Error(getUserError?.message ?? "Usuário não encontrado.");
    }

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      user_metadata: {
        ...(target.user.user_metadata ?? {}),
        must_change_password: true,
      },
    });

    if (passwordError) {
      throw new Error(passwordError.message);
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("preferences")
      .eq("id", data.userId)
      .maybeSingle();

    const existingPreferences =
      existingProfile?.preferences &&
      typeof existingProfile.preferences === "object" &&
      !Array.isArray(existingProfile.preferences)
        ? (existingProfile.preferences as Record<string, Json | undefined>)
        : {};

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: data.userId,
      full_name: target.user.user_metadata?.full_name ?? target.user.email ?? null,
      email: target.user.email ?? null,
      preferences: { ...existingPreferences, must_change_password: true },
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    return { ok: true };
  });

export const adminPromoteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });

    if (roleError || !isAdmin) {
      throw new Error("Acesso restrito a administradores.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").upsert(
      {
        user_id: data.userId,
        role: "admin",
      },
      { onConflict: "user_id,role" },
    );

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });