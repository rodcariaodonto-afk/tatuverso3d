import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/conteudo")({
  head: () => ({ meta: [{ title: "Conteúdo do site — Admin Cafe EX" }] }),
  component: ContentAdminPage,
});

type Section = {
  title: string;
  description: string;
  slots: { key: string; label: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Home · Assinatura Cafe EX",
    description: "Três imagens exibidas ao lado do bloco da assinatura na home.",
    slots: [
      { key: "home_assinatura_1", label: "Imagem 1" },
      { key: "home_assinatura_2", label: "Imagem 2 (deslocada)" },
      { key: "home_assinatura_3", label: "Imagem 3" },
    ],
  },
  {
    title: "Home · Private Label B2B",
    description: "Quatro imagens da grade ao lado do bloco Café com sua marca.",
    slots: [
      { key: "home_private_label_1", label: "Imagem 1 (topo esquerda)" },
      { key: "home_private_label_2", label: "Imagem 2 (topo direita)" },
      { key: "home_private_label_3", label: "Imagem 3 (base esquerda)" },
      { key: "home_private_label_4", label: "Imagem 4 (base direita)" },
    ],
  },
];

function ContentAdminPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site_images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_images").select("key, url, alt");
      if (error) throw error;
      return data as { key: string; url: string; alt: string }[];
    },
  });

  const map = new Map<string, { url: string; alt: string }>();
  (data ?? []).forEach((r) => map.set(r.key, { url: r.url, alt: r.alt }));

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Administração</p>
        <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">Conteúdo do site</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Gerencie as imagens das principais seções da home. Faça upload de uma nova imagem ou cole uma URL externa, depois salve.
        </p>

        <div className="mt-10 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-primary">{section.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {section.slots.map((slot) => (
                  <SlotCard
                    key={slot.key}
                    slotKey={slot.key}
                    label={slot.label}
                    initial={map.get(slot.key)}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["site_images"] })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

function SlotCard({
  slotKey,
  label,
  initial,
  onSaved,
}: {
  slotKey: string;
  label: string;
  initial?: { url: string; alt: string };
  onSaved: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrl(initial?.url ?? "");
    setAlt(initial?.alt ?? "");
  }, [initial?.url, initial?.alt]);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${slotKey}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
      setUrl(pub.publicUrl);
      toast.success("Upload concluído");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!url) return toast.error("Informe ou faça upload de uma imagem");
    setBusy(true);
    const { error } = await supabase
      .from("site_images")
      .upsert({ key: slotKey, url, alt }, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Imagem salva");
    onSaved();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 aspect-[3/4] overflow-hidden rounded-md bg-muted">
        {url ? (
          <img src={url} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background py-1.5 text-xs font-semibold text-primary hover:border-primary disabled:opacity-50"
      >
        <Upload className="h-3 w-3" /> Enviar imagem
      </button>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="ou cole uma URL"
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Texto alternativo"
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      />
      <button
        onClick={save}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <Save className="h-3 w-3" /> Salvar
      </button>
    </div>
  );
}
