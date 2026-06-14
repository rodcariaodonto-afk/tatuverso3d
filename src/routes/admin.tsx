import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

export function useAdminRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return data?.map((r) => r.role) ?? [];
    },
    staleTime: 60_000,
  });
}

function AdminLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: roles, isLoading: rolesLoading } = useAdminRoles();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const isAdmin =
    roles?.includes("admin" as any) || roles?.includes("support" as any);

  if (!user || loading || rolesLoading) return null;

  if (roles && !isAdmin) {
    return (
      <div className="container mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-3xl text-primary">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }

  return (
    <div>
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center gap-1 px-4 md:px-6">
          <Link
            to="/admin"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition hover:text-foreground [&.active]:font-semibold [&.active]:text-primary"
          >
            Dashboard
          </Link>
          <Link
            to="/admin/produtos"
            className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/70 transition hover:text-foreground [&.active]:font-semibold [&.active]:text-primary"
          >
            Produtos
          </Link>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
