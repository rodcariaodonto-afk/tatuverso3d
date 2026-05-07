import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo café — Admin Cafezeira" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [producerId, setProducerId] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  const { data: producers } = useQuery({
    queryKey: ["producers-active"],
    queryFn: async () => {
      const { data } = await supabase.from("producers").select("id, name").order("name");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!producerId && producers && producers.length > 0) {
      const cafezeira = producers.find((p: any) => p.name?.toLowerCase().includes("cafezeira"));
      setProducerId((cafezeira ?? producers[0]).id);
    }
  }, [producers, producerId]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <Link to="/admin/produtos" className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <h1 className="mt-4 font-display text-4xl text-primary md:text-5xl">Novo café</h1>
      <div className="gold-divider mt-3 mb-8" />

      {producers && producers.length > 0 && (
        <div className="mb-8 max-w-md">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produtor</label>
          <select value={producerId} onChange={(e) => setProducerId(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm">
            {producers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {producerId && <ProductForm producerId={producerId} />}
    </div>
  );
}
