import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/produtos/$id/editar")({
  head: () => ({ meta: [{ title: "Editar café — Admin Café EX" }] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [producerId, setProducerId] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("producer_id").eq("id", id).maybeSingle();
      if (data) setProducerId(data.producer_id);
    })();
  }, [id]);

  if (!user) return null;

  return (
    <AdminShell><div className="mx-auto max-w-5xl">
      <Link to="/admin/produtos" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <h1 className="mt-4 font-display text-4xl text-primary md:text-5xl">Editar café</h1>
      <div className="gold-divider mt-3 mb-8" />

      {producerId && <ProductForm productId={id} producerId={producerId} />}
    </div></AdminShell>
  );
}
