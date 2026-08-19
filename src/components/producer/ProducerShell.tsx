import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X,
  Sprout,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { to: "/produtor", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/produtor/produtos", label: "Meus cafés", icon: Package },
  { to: "/produtor/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/produtor/perfil", label: "Perfil da marca", icon: User },
];

export function ProducerShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: isProducer, isLoading: roleLoading } = useQuery({
    queryKey: ["is-producer", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const roles = data?.map((r) => r.role) ?? [];
      return roles.includes("producer" as any) || roles.includes("admin" as any);
    },
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  if (loading || (user && roleLoading)) {
    return (
      <div className="container mx-auto py-20 text-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <h1 className="font-display text-3xl text-primary">Entre na TatuVerso3D</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você precisa estar autenticado para acessar o painel do produtor.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (!isProducer) {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <Sprout className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-3xl text-primary">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para produtores cadastrados. Se você é produtor e ainda não tem
          acesso, envie sua candidatura.
        </p>
        <Link
          to="/vender-na-plataforma"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          Candidatar-se
        </Link>
      </div>
    );
  }

  const SidebarBody = (
    <div className="flex h-full flex-col">
      <Link to="/produtor" className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Sprout className="h-5 w-5 text-[var(--brand-accent)]" />
        <span className="font-display text-lg font-bold tracking-tight text-primary">
          Painel do Produtor
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        <button
          onClick={() => signOut()}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full bg-[var(--surface-soft)]/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        {SidebarBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 hover:bg-muted"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-base font-semibold text-primary">Produtor</span>
        </div>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}
