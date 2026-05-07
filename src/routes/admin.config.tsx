import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/config")({
  head: () => ({ meta: [{ title: "Configurações — Admin Cafezeira" }] }),
  component: ConfigPage,
});

const KEYS = [
  { key: "site.tagline", label: "Tagline do site", placeholder: "Cafés especiais brasileiros" },
  { key: "site.contact_email", label: "Email de contato", placeholder: "contato@cafezeira.com.br" },
  { key: "site.whatsapp", label: "WhatsApp", placeholder: "+55 11 99999-9999" },
  { key: "shipping.free_threshold", label: "Frete grátis acima de (R$)", placeholder: "150" },
  { key: "shipping.flat_rate", label: "Frete fixo (R$)", placeholder: "19.90" },
  { key: "social.instagram", label: "Instagram URL", placeholder: "https://instagram.com/cafezeira" },
];

function ConfigPage() {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const v: Record<string, string> = {};
    (data ?? []).forEach((row: any) => {
      v[row.key] = typeof row.value === "string" ? row.value : (row.value?.value ?? "");
    });
    setValues(v);
  }, [data]);

  const save = async (key: string) => {
    const value = values[key] ?? "";
    const { error } = await supabase.from("platform_settings").upsert({ key, value: { value } }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["platform-settings"] });
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">Plataforma</p>
          <h1 className="mt-2 font-display text-4xl text-primary">Configurações</h1>
          <div className="gold-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">Ajustes gerais da Cafezeira. Cada campo é salvo individualmente.</p>
        </header>

        {isLoading ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="mt-8 space-y-6">
            {KEYS.map((k) => (
              <div key={k.key} className="rounded-lg border border-border bg-card p-5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</label>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{k.key}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    value={values[k.key] ?? ""}
                    onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}
                    placeholder={k.placeholder}
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button onClick={() => save(k.key)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
