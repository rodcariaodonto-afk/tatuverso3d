import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import {
  createOrder,
  listAddresses,
  quoteShipping,
  saveAddress,
} from "@/lib/checkout.functions";
import {
  BR_STATES,
  formatCEP,
  isValidPhoneBR,
  type ShippingQuoteOption,
} from "@/lib/shipping.shared";
import { formatBRL, useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TatuVerso3D" },
      {
        name: "description",
        content:
          "Finalize seu pedido de peças 3D da TatuVerso3D com entrega para todo o Brasil.",
      },
      { property: "og:title", content: "Checkout — TatuVerso3D" },
      {
        property: "og:description",
        content: "Endereço, frete e revisão do pedido em poucos passos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type Step = "address" | "shipping" | "review";

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "address", label: "Endereço" },
  { key: "shipping", label: "Entrega" },
  { key: "review", label: "Revisão" },
];

type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  postal_code: string;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  phone: string | null;
};

function CheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("address");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingQuoteOption[]>([]);
  const [selected, setSelected] = useState<ShippingQuoteOption | null>(null);

  const listAddressesFn = useServerFn(listAddresses);
  const quoteShippingFn = useServerFn(quoteShipping);
  const createOrderFn = useServerFn(createOrder);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: () => listAddressesFn({ data: undefined as never }) as Promise<AddressRow[]>,
    enabled: !!user,
  });

  const addresses = addressesQuery.data ?? [];
  const address = addresses.find((a) => a.id === addressId) ?? null;

  useEffect(() => {
    if (!addressId && addresses.length) setAddressId(addresses[0].id);
  }, [addresses, addressId]);

  const cartPayload = useMemo(
    () => ({
      items: items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
        customizations: i.customizations.map((c) => ({ field_id: c.field_id, value: c.value })),
      })),
    }),
    [items],
  );

  // Cotação inválida sempre que o carrinho ou o endereço mudam.
  useEffect(() => {
    setOptions([]);
    setSelected(null);
    if (step === "shipping" || step === "review") setStep("address");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cartPayload), addressId]);

  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Escolha um endereço de entrega");
      return quoteShippingFn({
        data: {
          postal_code: address.postal_code,
          state: address.state,
          items: cartPayload.items,
        },
      });
    },
    onSuccess: (data) => {
      setOptions(data.options);
      setSelected(data.options[0] ?? null);
      setStep("shipping");
      if (!data.options.length) {
        toast.error("Nenhuma opção de entrega disponível para este CEP.");
      }
    },
    onError: (e: any) => toast.error("Não foi possível calcular o frete", { description: e.message }),
  });

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!address || !selected) throw new Error("Dados de entrega incompletos");
      return createOrderFn({
        data: {
          items: cartPayload.items,
          address_id: address.id,
          quote_id: selected.quote_id,
        },
      });
    },
    onSuccess: (data) => {
      clear();
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      navigate({ to: "/pagamento/$orderId", params: { orderId: data.order_id } });
    },
    onError: (e: any) =>
      toast.error("Não foi possível concluir o pedido", { description: e.message }),
  });

  if (loading) {
    return (
      <div className="container mx-auto flex justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-3xl text-primary">Entre para finalizar</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Para acompanhar produção, envio e pagamento do seu pedido, faça login ou crie sua conta.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/login"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Entrar
          </Link>
          <Link
            to="/cadastro"
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-primary"
          >
            Criar conta
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-3xl text-primary">Carrinho vazio</h1>
        <Link
          to="/catalogo"
          search={{ q: "" } as never}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl text-primary md:text-4xl">Checkout</h1>
      <div className="brand-divider mt-3" />
      <StepIndicator step={step} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {step === "address" && (
            <AddressStep
              addresses={addresses}
              loading={addressesQuery.isLoading}
              selectedId={addressId}
              onSelect={setAddressId}
              onSaved={async (id) => {
                await addressesQuery.refetch();
                setAddressId(id);
              }}
              onContinue={() => quoteMutation.mutate()}
              continuing={quoteMutation.isPending}
            />
          )}

          {step === "shipping" && (
            <ShippingStep
              options={options}
              selected={selected}
              onSelect={setSelected}
              onBack={() => setStep("address")}
              onContinue={() => setStep("review")}
            />
          )}

          {step === "review" && selected && address && (
            <ReviewStep
              address={address}
              shipping={selected}
              onBack={() => setStep("shipping")}
              onConfirm={() => orderMutation.mutate()}
              submitting={orderMutation.isPending}
            />
          )}
        </div>

        <OrderSummary subtotal={subtotal} shipping={selected} />
      </div>
    </div>
  );
}

/* ── Indicador de etapas ─────────────────────────────────────────────────── */

function StepIndicator({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="mt-6 flex items-center gap-1">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-1.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i < idx
                ? "bg-accent text-accent-foreground"
                : i === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </span>
          <span
            className={`hidden text-xs font-semibold sm:block ${
              i === idx ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <span className={`h-0.5 flex-1 ${i < idx ? "bg-accent" : "bg-border"}`} />
          )}
        </li>
      ))}
    </ol>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">{children}</div>
  );
}

/* ── Etapa 1 — Endereço ──────────────────────────────────────────────────── */

const emptyForm = {
  recipient: "",
  postal_code: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  phone: "",
};

function AddressStep({
  addresses,
  loading,
  selectedId,
  onSelect,
  onSaved,
  onContinue,
  continuing,
}: {
  addresses: AddressRow[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSaved: (id: string) => void;
  onContinue: () => void;
  continuing: boolean;
}) {
  const [form, setForm] = useState({ ...emptyForm });
  const [creating, setCreating] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNotice, setCepNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saveAddressFn = useServerFn(saveAddress);

  useEffect(() => {
    if (!loading && addresses.length === 0) setCreating(true);
  }, [loading, addresses.length]);

  const set = (k: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const lookupCep = async (raw: string) => {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    setCepNotice("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepNotice("CEP não encontrado — preencha o endereço manualmente.");
      } else {
        setForm((f) => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch {
      setCepNotice("Busca de CEP indisponível — preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.recipient.trim().length < 3) errs.recipient = "Informe o nome de quem vai receber";
    if (form.postal_code.replace(/\D/g, "").length !== 8) errs.postal_code = "CEP inválido";
    if (form.street.trim().length < 2) errs.street = "Informe a rua";
    if (form.city.trim().length < 2) errs.city = "Informe a cidade";
    if (!BR_STATES.includes(form.state.toUpperCase())) errs.state = "UF inválida";
    if (form.phone && !isValidPhoneBR(form.phone)) errs.phone = "Telefone inválido";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      const saved: any = await saveAddressFn({
        data: {
          recipient: form.recipient.trim(),
          postal_code: form.postal_code,
          street: form.street.trim(),
          number: form.number.trim(),
          complement: form.complement.trim(),
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.toUpperCase(),
          phone: form.phone.trim(),
          label: "Entrega",
        },
      });
      setForm({ ...emptyForm });
      setCreating(false);
      onSaved(saved.id);
      toast.success("Endereço salvo");
    } catch (e: any) {
      toast.error("Não foi possível salvar o endereço", { description: e.message });
    }
  };

  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-xl text-primary">
        <MapPin className="h-5 w-5" /> Endereço de entrega
      </h2>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando endereços…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {addresses.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={`flex w-full flex-col items-start rounded-xl border px-4 py-3 text-left transition ${
                selectedId === a.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-sm font-semibold text-foreground">{a.recipient}</span>
              <span className="text-xs text-muted-foreground">
                {a.street}
                {a.number ? `, ${a.number}` : ""}
                {a.complement ? ` — ${a.complement}` : ""} · {a.neighborhood} · {a.city}/{a.state} ·{" "}
                {formatCEP(a.postal_code)}
              </span>
            </button>
          ))}
        </div>
      )}

      {!creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          + Adicionar novo endereço
        </button>
      )}

      {creating && (
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            label="Quem vai receber *"
            value={form.recipient}
            onChange={set("recipient")}
            error={errors.recipient}
          />
          <Field
            label="CEP *"
            value={formatCEP(form.postal_code)}
            onChange={(v) => {
              set("postal_code")(v);
              void lookupCep(v);
            }}
            error={errors.postal_code}
            hint={cepLoading ? "Buscando endereço…" : cepNotice}
            inputMode="numeric"
          />
          <Field label="Telefone" value={form.phone} onChange={set("phone")} error={errors.phone} />
          <Field
            className="sm:col-span-2"
            label="Rua *"
            value={form.street}
            onChange={set("street")}
            error={errors.street}
          />
          <Field label="Número" value={form.number} onChange={set("number")} />
          <Field label="Complemento" value={form.complement} onChange={set("complement")} />
          <Field label="Bairro" value={form.neighborhood} onChange={set("neighborhood")} />
          <Field label="Cidade *" value={form.city} onChange={set("city")} error={errors.city} />
          <div>
            <label className="block text-xs font-medium text-foreground/70">UF *</label>
            <select
              value={form.state}
              onChange={(e) => set("state")(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">--</option>
              {BR_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state}</p>}
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              className="h-11 flex-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            >
              Salvar endereço
            </button>
            {!!addresses.length && (
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-11 rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <button
        type="button"
        disabled={!selectedId || continuing}
        onClick={onContinue}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {continuing && <Loader2 className="h-4 w-4 animate-spin" />}
        Calcular entrega <ChevronRight className="h-4 w-4" />
      </button>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  hint,
  className = "",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  className?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none"
      />
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Etapa 2 — Entrega ───────────────────────────────────────────────────── */

function ShippingStep({
  options,
  selected,
  onSelect,
  onBack,
  onContinue,
}: {
  options: ShippingQuoteOption[];
  selected: ShippingQuoteOption | null;
  onSelect: (o: ShippingQuoteOption) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-xl text-primary">
        <Truck className="h-5 w-5" /> Como você quer receber
      </h2>

      {options.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhuma opção de entrega disponível para este endereço no momento. Fale com a gente pelo
          contato para combinarmos o envio.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {options.map((o) => (
            <button
              key={o.quote_id}
              type="button"
              onClick={() => onSelect(o)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                selected?.quote_id === o.quote_id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {o.name}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {o.is_pickup ? "Retirada" : "Transporte"} em até {o.delivery_days} dias úteis
                  {o.production_days > 0 && ` · produção de ${o.production_days} dias`}
                </span>
              </span>
              <span className="shrink-0 font-display text-base font-semibold text-primary">
                {o.price === 0 ? "Grátis" : formatBRL(o.price)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center gap-1 rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Revisar pedido <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

/* ── Etapa 3 — Revisão ───────────────────────────────────────────────────── */

function ReviewStep({
  address,
  shipping,
  onBack,
  onConfirm,
  submitting,
}: {
  address: AddressRow;
  shipping: ShippingQuoteOption;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-xl text-primary">
        <Package className="h-5 w-5" /> Revisão do pedido
      </h2>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Entrega em
          </dt>
          <dd className="text-foreground">
            {address.recipient} — {address.street}
            {address.number ? `, ${address.number}` : ""} · {address.city}/{address.state} ·{" "}
            {formatCEP(address.postal_code)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Forma de entrega
          </dt>
          <dd className="text-foreground">
            {shipping.name} — {shipping.price === 0 ? "grátis" : formatBRL(shipping.price)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prazos
          </dt>
          <dd className="text-foreground">
            Produção em até {shipping.production_days || 1} dia(s) úteis + transporte de{" "}
            {shipping.delivery_days} dia(s) úteis
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl bg-surface-soft p-4 text-xs text-muted-foreground">
        O pagamento com Pix e cartão entra em operação na próxima etapa do projeto. Ao confirmar,
        seu pedido é registrado como <strong>aguardando pagamento</strong> e nossa equipe entra em
        contato para concluir.
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center gap-1 rounded-full border border-border px-5 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-accent-foreground disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Ir para o pagamento
        </button>
      </div>
    </Card>
  );
}

/* ── Resumo lateral ──────────────────────────────────────────────────────── */

function OrderSummary({
  subtotal,
  shipping,
}: {
  subtotal: number;
  shipping: ShippingQuoteOption | null;
}) {
  const items = useCart((s) => s.items);
  const production = useCart((s) => s.maxProductionDays());
  const total = subtotal + (shipping?.price ?? 0);

  return (
    <aside className="h-max rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
      <h2 className="font-display text-lg text-primary">Resumo do pedido</h2>
      <ul className="mt-4 space-y-4">
        {items.map((i) => (
          <li key={i.key} className="flex gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
              {i.cover_url && (
                <img src={i.cover_url} alt={i.name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{i.name}</p>
              {i.variant_label && (
                <p className="truncate text-xs text-muted-foreground">{i.variant_label}</p>
              )}
              {i.customizations.map((c) => (
                <p key={c.field_id} className="truncate text-xs text-muted-foreground">
                  {c.label}: {c.value}
                </p>
              ))}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {i.quantity} × {formatBRL(i.unit_price)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        <Row label="Subtotal" value={formatBRL(subtotal)} />
        <Row label="Descontos" value={formatBRL(0)} />
        <Row
          label="Frete"
          value={shipping ? (shipping.price === 0 ? "Grátis" : formatBRL(shipping.price)) : "—"}
        />
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-semibold text-foreground">Total</dt>
          <dd className="font-display text-xl font-semibold text-primary">{formatBRL(total)}</dd>
        </div>
      </dl>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        Produção em até {production || 1} dia(s) úteis
        {shipping ? ` + transporte de ${shipping.delivery_days} dia(s)` : ""}
      </p>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
