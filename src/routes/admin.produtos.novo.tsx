import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — Admin TatuVerso3D" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (!user) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl">
        <Link to="/admin/produtos" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>
        <h1 className="mt-4 font-display text-4xl text-primary md:text-5xl">Novo produto</h1>
        <div className="brand-divider mt-3 mb-8" />
        <ProductForm />
      </div>
    </AdminShell>
  );
}
