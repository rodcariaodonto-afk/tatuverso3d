import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Coffee, Package as PackageIcon, Sparkles, Truck, CheckCircle2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/private-label")({
  head: () => ({
    meta: [
      { title: "Café com sua marca · Private Label — TatuVerso3D" },
      {
        name: "description",
        content:
          "Crie cafés especiais com a sua marca. Embalagem personalizada, branding e curadoria de grãos para presentes corporativos e empresas.",
      },
      { property: "og:title", content: "Private Label TatuVerso3D — Café com sua marca" },
      {
        property: "og:description",
        content:
          "Cafés 100% arábica da Mantiqueira com sua marca, embalagem e identidade. Solução completa para empresas.",
      },
    ],
  }),
  component: PrivateLabelPage,
});

const CASES = [
  { name: "Inatel", desc: "Brindes para parceiros institucionais." },
  { name: "DBlack", desc: "Linha exclusiva para presentear clientes." },
  { name: "Allcubo", desc: "Café da empresa com identidade própria." },
  { name: "Deep", desc: "Lançamento de marca com pouch black matte." },
  { name: "Bio Exp", desc: "Kits sustentáveis para eventos." },
  { name: "Town", desc: "Brindes para hóspedes e parceiros." },
  { name: "Tent", desc: "Café corporativo com embalagem premium." },
];

const STEPS = [
  { n: "01", title: "Você solicita", desc: "Preenche o formulário com finalidade, quantidade e prazo." },
  { n: "02", title: "Marca & embalagem", desc: "Envia sua marca ou criamos uma exclusiva para você." },
  { n: "03", title: "Curadoria do café", desc: "Selecionamos o grão 100% arábica ideal para o seu projeto." },
  { n: "04", title: "Proposta & produção", desc: "Aprovação, produção artesanal e entrega no prazo combinado." },
];

const schema = z.object({
  company_name: z.string().trim().min(2, "Informe a empresa").max(120),
  contact_name: z.string().trim().min(2, "Informe o responsável").max(120),
  email: z.string().trim().email("E-mail inválido").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  estimated_quantity: z.string().trim().max(80).optional().or(z.literal("")),
  purpose: z.string().trim().max(300).optional().or(z.literal("")),
  desired_deadline: z.string().trim().max(80).optional().or(z.literal("")),
  has_brand: z.boolean(),
  packaging_preference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1500).optional().or(z.literal("")),
});

function PrivateLabelPage() {
  const { data: packagingOptions } = useQuery({
    queryKey: ["packaging-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packaging_options")
        .select("id, slug, name, description, min_quantity")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      company_name: String(fd.get("company_name") ?? ""),
      contact_name: String(fd.get("contact_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      estimated_quantity: String(fd.get("estimated_quantity") ?? ""),
      purpose: String(fd.get("purpose") ?? ""),
      desired_deadline: String(fd.get("desired_deadline") ?? ""),
      has_brand: fd.get("has_brand") === "on",
      packaging_preference: String(fd.get("packaging_preference") ?? ""),
      notes: String(fd.get("notes") ?? ""),
    };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados");
      return;
    }

    setLoading(true);
    try {
      let logo_url: string | null = null;
      if (logoFile) {
        if (logoFile.size > 5 * 1024 * 1024) {
          toast.error("Logo deve ter até 5MB");
          setLoading(false);
          return;
        }
        const ext = logoFile.name.split(".").pop() ?? "png";
        const path = `leads/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("b2b-files").upload(path, logoFile, {
          contentType: logoFile.type,
        });
        if (upErr) throw upErr;
        logo_url = path;
      }

      const { error } = await supabase.from("b2b_leads").insert({
        ...parsed.data,
        phone: parsed.data.phone || null,
        estimated_quantity: parsed.data.estimated_quantity || null,
        purpose: parsed.data.purpose || null,
        desired_deadline: parsed.data.desired_deadline || null,
        packaging_preference: parsed.data.packaging_preference || null,
        notes: parsed.data.notes || null,
        logo_url,
      });
      if (error) throw error;

      setSubmitted(true);
      toast.success("Recebemos seu briefing! Entraremos em contato em breve.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[oklch(0.16_0.03_45)] text-[oklch(0.95_0.02_80)]">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1442550528053-c431ecb55509?auto=format&fit=crop&w=1800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.13_0.03_45)]/95 via-[oklch(0.16_0.03_45)]/85 to-[oklch(0.22_0.045_45)]/70" />
        <div className="container mx-auto px-4 py-24 md:px-6 md:py-32">
          <div className="max-w-2xl">
            <p className="eyebrow !text-[var(--brand-accent)]">Private Label · B2B</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] md:text-6xl">
              Café especial <em className="text-[var(--brand-accent)] not-italic">com a sua marca</em>.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
              Criamos cafés corporativos sob medida: grão 100% arábica da Serra da Mantiqueira,
              embalagem personalizada, design de marca e produção artesanal. Para presentear
              clientes, equipes e parceiros.
            </p>
            <a
              href="#briefing"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand-dark)] hover:brightness-110"
            >
              Solicitar orçamento <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="border-b border-border bg-[var(--surface-soft)]">
        <div className="container mx-auto grid gap-8 px-4 py-14 md:grid-cols-4 md:px-6">
          {[
            { icon: Coffee, title: "Curadoria de grãos", desc: "Microlotes 100% arábica selecionados para o seu perfil." },
            { icon: PackageIcon, title: "Embalagem premium", desc: "Pouch, lata, drip coffee ou kit de degustação." },
            { icon: Sparkles, title: "Branding exclusivo", desc: "Criamos sua marca caso ainda não tenha." },
            { icon: Truck, title: "Produção & entrega", desc: "Torra fresca, prazo combinado, entrega cuidadosa." },
          ].map((b) => (
            <div key={b.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-primary">{b.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Como funciona</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Do briefing à entrega</h2>
          <div className="brand-divider mx-auto mt-3" />
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg border border-border bg-card p-6">
              <p className="font-display text-3xl text-[var(--brand-accent)]">{s.n}</p>
              <p className="mt-3 font-display text-lg text-primary">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PACKAGING OPTIONS */}
      <section className="bg-[var(--surface-highlight)]">
        <div className="container mx-auto px-4 py-20 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Opções de embalagem</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl">Escolha o formato ideal</h2>
              <div className="brand-divider mt-3" />
            </div>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(packagingOptions ?? []).map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-6">
                <PackageIcon className="h-6 w-6 text-[var(--brand-accent)]" />
                <p className="mt-3 font-display text-lg text-primary">{p.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-[var(--brand-primary)]">
                  Mín. {p.min_quantity} unid.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASES */}
      <section className="container mx-auto px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="eyebrow">Cases</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Marcas que já confiaram</h2>
          <div className="brand-divider mx-auto mt-3" />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Empresas que escolheram a TatuVerso3D para criar cafés corporativos com identidade própria.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CASES.map((c) => (
            <div key={c.name} className="rounded-lg border border-border bg-card p-5 text-center">
              <p className="font-display text-xl text-primary">{c.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section id="briefing" className="bg-[oklch(0.22_0.045_45)] py-20 text-[oklch(0.95_0.02_80)]">
        <div className="container mx-auto grid gap-12 px-4 md:grid-cols-[1fr_1.3fr] md:px-6">
          <div>
            <p className="eyebrow !text-[var(--brand-accent)]">Briefing</p>
            <h2 className="mt-2 font-display text-3xl md:text-5xl">
              Vamos criar o café da sua marca.
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Preencha o briefing e nossa equipe entra em contato em até 1 dia útil com uma
              proposta personalizada.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" /> Resposta em até 1 dia útil</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" /> Mockup digital antes da produção</li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" /> A partir de 30 unidades</li>
            </ul>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-white/15 bg-white/5 p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-[var(--brand-accent)]" />
              <p className="mt-4 font-display text-2xl">Briefing recebido!</p>
              <p className="mt-2 max-w-sm text-sm text-white/70">
                Em breve nossa equipe entra em contato no e-mail informado para alinhar os próximos
                passos.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="rounded-lg border border-white/15 bg-white/5 p-6 backdrop-blur md:p-8">
              <div className="grid gap-4 md:grid-cols-2">
                <Field name="company_name" label="Empresa *" required />
                <Field name="contact_name" label="Responsável *" required />
                <Field name="email" type="email" label="E-mail *" required />
                <Field name="phone" label="WhatsApp / Telefone" />
                <Field name="estimated_quantity" label="Quantidade estimada (un.)" placeholder="Ex: 100" />
                <Field name="desired_deadline" label="Prazo desejado" placeholder="Ex: 30 dias" />
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wider text-white/70">Finalidade</label>
                <input name="purpose" placeholder="Brindes, evento, café da empresa..." className={inputClass} />
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wider text-white/70">Embalagem desejada</label>
                <select name="packaging_preference" className={inputClass} defaultValue="">
                  <option value="">Sem preferência / preciso de orientação</option>
                  {(packagingOptions ?? []).map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
                <input type="checkbox" name="has_brand" className="h-4 w-4 accent-[var(--brand-accent)]" />
                Já tenho marca/logotipo
              </label>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wider text-white/70">
                  Logo (opcional, até 5MB)
                </label>
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/30 bg-white/5 px-3 py-3 text-sm text-white/70 hover:bg-white/10">
                  <Upload className="h-4 w-4" />
                  {logoFile ? logoFile.name : "Selecionar arquivo"}
                  <input
                    type="file"
                    accept="image/*,.pdf,.ai,.eps,.svg"
                    className="hidden"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wider text-white/70">Observações</label>
                <textarea name="notes" rows={4} className={inputClass} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand-dark)] hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar briefing"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[var(--brand-accent)] focus:outline-none";

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-white/70">{label}</label>
      <input name={name} type={type} placeholder={placeholder} required={required} className={inputClass} />
    </div>
  );
}
