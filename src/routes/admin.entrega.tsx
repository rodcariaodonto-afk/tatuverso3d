import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  deleteShippingMethod,
  getShippingConfig,
  saveShippingMethod,
  saveShippingSettings,
} from "@/lib/shipping-admin.functions";
import { BR_STATES } from "@/lib/shipping.shared";

export const Route = createFileRoute("/admin/entrega")({
  head: () => ({
    meta: [
      { title: "Entrega e frete — Admin TatuVerso3D" },
      { name: "description", content: "Configuração de origem, retirada e métodos de frete." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <ShippingAdmin />
    </AdminShell>
  ),
});

const emptyMethod = {
  code: "",
  name: "",
  description: "",
  kind: "flat" as "flat" | "free" | "pickup",
  price: 0,
  free_above_total: null as number | null,
  delivery_days: 5,
  regions: null as string[] | null,
  is_active: true,
  sort_order: 0,
};

function ShippingAdmin() {
  const qc = useQueryClient();
  const getConfig = useServerFn(getShippingConfig);
  const saveSettings = useServerFn(saveShippingSettings);
  const saveMethod = useServerFn(saveShippingMethod);
  const removeMethod = useServerFn(deleteShippingMethod);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shipping"],
    queryFn: () => getConfig({ data: undefined as never }) as Promise<any>,
  });

  const [settings, setSettings] = useState<any>(null);
  const [method, setMethod] = useState<any>({ ...emptyMethod });

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  const settingsMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          origin_postal_code: settings.origin_postal_code ?? "",
          origin_street: settings.origin_street ?? "",
          origin_number: settings.origin_number ?? "",
          origin_neighborhood: settings.origin_neighborhood ?? "",
          origin_city: settings.origin_city ?? "",
          origin_state: settings.origin_state ?? "",
          handling_days: Number(settings.handling_days ?? 1),
          free_shipping_min_total:
            settings.free_shipping_min_total === "" || settings.free_shipping_min_total == null
              ? null
              : Number(settings.free_shipping_min_total),
          shipping_markup_percent: Number(settings.shipping_markup_percent ?? 0),
          local_pickup_enabled: !!settings.local_pickup_enabled,
          local_pickup_label: settings.local_pickup_label ?? "",
          local_pickup_address: settings.local_pickup_address ?? "",
          local_pickup_instructions: settings.local_pickup_instructions ?? "",
          melhor_envio_enabled: !!settings.melhor_envio_enabled,
          melhor_envio_sandbox: settings.melhor_envio_sandbox !== false,
        },
      }),
    onSuccess: () => {
      toast.success("Configuração de entrega salva");
      qc.invalidateQueries({ queryKey: ["admin-shipping"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const methodMutation = useMutation({
    mutationFn: (m: any) =>
      saveMethod({
        data: {
          ...(m.id ? { id: m.id } : {}),
          code: m.code,
          name: m.name,
          description: m.description || null,
          kind: m.kind,
          price: Number(m.price ?? 0),
          free_above_total:
            m.free_above_total === "" || m.free_above_total == null
              ? null
              : Number(m.free_above_total),
          delivery_days: Number(m.delivery_days ?? 5),
          regions: m.regions?.length ? m.regions : null,
          is_active: !!m.is_active,
          sort_order: Number(m.sort_order ?? 0),
        },
      }),
    onSuccess: () => {
      toast.success("Método salvo");
      setMethod({ ...emptyMethod });
      qc.invalidateQueries({ queryKey: ["admin-shipping"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar método", { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeMethod({ data: { id } }),
    onSuccess: () => {
      toast.success("Método removido");
      qc.invalidateQueries({ queryKey: ["admin-shipping"] });
    },
    onError: (e: any) => toast.error("Erro ao remover", { description: e.message }),
  });

  if (isLoading || !settings) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const set = (k: string) => (v: any) => setSettings((s: any) => ({ ...s, [k]: v }));
  const setM = (k: string) => (v: any) => setMethod((m: any) => ({ ...m, [k]: v }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 font-display text-2xl text-primary md:text-3xl">
          <Truck className="h-6 w-6" /> Entrega e frete
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Origem dos envios, retirada no local, faixas manuais e integração de transportadora.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="font-display text-lg text-primary">Origem e prazos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="CEP de origem" value={settings.origin_postal_code ?? ""} onChange={set("origin_postal_code")} />
          <Input label="Rua" value={settings.origin_street ?? ""} onChange={set("origin_street")} />
          <Input label="Número" value={settings.origin_number ?? ""} onChange={set("origin_number")} />
          <Input label="Bairro" value={settings.origin_neighborhood ?? ""} onChange={set("origin_neighborhood")} />
          <Input label="Cidade" value={settings.origin_city ?? ""} onChange={set("origin_city")} />
          <Select
            label="UF"
            value={settings.origin_state ?? ""}
            onChange={set("origin_state")}
            options={["", ...BR_STATES]}
          />
          <Input
            label="Dias de manuseio"
            type="number"
            value={settings.handling_days ?? 1}
            onChange={set("handling_days")}
          />
          <Input
            label="Frete grátis acima de (R$)"
            type="number"
            value={settings.free_shipping_min_total ?? ""}
            onChange={set("free_shipping_min_total")}
          />
          <Input
            label="Acréscimo sobre o frete (%)"
            type="number"
            value={settings.shipping_markup_percent ?? 0}
            onChange={set("shipping_markup_percent")}
          />
        </div>

        <h2 className="mt-8 font-display text-lg text-primary">Retirada no local</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Toggle
            label="Permitir retirada"
            checked={!!settings.local_pickup_enabled}
            onChange={set("local_pickup_enabled")}
          />
          <Input label="Nome exibido" value={settings.local_pickup_label ?? ""} onChange={set("local_pickup_label")} />
          <Input
            className="sm:col-span-2"
            label="Endereço de retirada"
            value={settings.local_pickup_address ?? ""}
            onChange={set("local_pickup_address")}
          />
          <Input
            className="sm:col-span-2"
            label="Instruções"
            value={settings.local_pickup_instructions ?? ""}
            onChange={set("local_pickup_instructions")}
          />
        </div>

        <h2 className="mt-8 font-display text-lg text-primary">Melhor Envio</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Toggle
            label="Ativar cotação Melhor Envio"
            checked={!!settings.melhor_envio_enabled}
            onChange={set("melhor_envio_enabled")}
          />
          <Toggle
            label="Ambiente sandbox"
            checked={settings.melhor_envio_sandbox !== false}
            onChange={set("melhor_envio_sandbox")}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A cotação só é oferecida quando a credencial <code>MELHOR_ENVIO_TOKEN</code> estiver
          configurada no backend. Sem credencial, apenas os métodos manuais aparecem no checkout.
        </p>

        <button
          onClick={() => settingsMutation.mutate()}
          disabled={settingsMutation.isPending}
          className="mt-6 flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {settingsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar configuração
        </button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="font-display text-lg text-primary">Métodos manuais de frete</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Nome</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Preço</th>
                <th>Prazo</th>
                <th>Regiões</th>
                <th>Ativo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.methods.map((m: any) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-2 font-medium text-foreground">{m.name}</td>
                  <td className="text-muted-foreground">{m.code}</td>
                  <td className="text-muted-foreground">{m.kind}</td>
                  <td className="text-muted-foreground">R$ {Number(m.price ?? 0).toFixed(2)}</td>
                  <td className="text-muted-foreground">{m.delivery_days}d</td>
                  <td className="text-muted-foreground">{m.regions?.join(", ") || "Todas"}</td>
                  <td>
                    <button
                      onClick={() => methodMutation.mutate({ ...m, is_active: !m.is_active })}
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.is_active ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.is_active ? "ativo" : "inativo"}
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Remover ${m.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.methods.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    Nenhum método cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 flex items-center gap-2 font-display text-base text-primary">
          <Plus className="h-4 w-4" /> Novo método
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Nome *" value={method.name} onChange={setM("name")} />
          <Input label="Código *" value={method.code} onChange={setM("code")} />
          <Select
            label="Tipo"
            value={method.kind}
            onChange={setM("kind")}
            options={["flat", "free"]}
          />
          <Input label="Preço (R$)" type="number" value={method.price} onChange={setM("price")} />
          <Input
            label="Prazo (dias úteis)"
            type="number"
            value={method.delivery_days}
            onChange={setM("delivery_days")}
          />
          <Input
            label="Grátis acima de (R$)"
            type="number"
            value={method.free_above_total ?? ""}
            onChange={setM("free_above_total")}
          />
          <Input
            label="Ordem"
            type="number"
            value={method.sort_order}
            onChange={setM("sort_order")}
          />
          <Input
            label="Regiões (UF separadas por vírgula)"
            value={(method.regions ?? []).join(",")}
            onChange={(v: string) =>
              setM("regions")(
                v
                  .split(",")
                  .map((s) => s.trim().toUpperCase())
                  .filter((s) => BR_STATES.includes(s)),
              )
            }
          />
        </div>
        <button
          onClick={() => methodMutation.mutate(method)}
          disabled={methodMutation.isPending || !method.name || !method.code}
          className="mt-5 flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          {methodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Adicionar método
        </button>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  className = "",
}: {
  label: string;
  value: any;
  onChange: (v: any) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "--"}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex h-10 items-center gap-2 self-end text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      {label}
    </label>
  );
}
