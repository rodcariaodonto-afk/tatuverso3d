import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { CheckCircle2, Loader2, Copy, QrCode, ChevronRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, useCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

// ── Route ─────────────────────────────────────────────────────────────────────

const searchSchema = z.object({
  status: fallback(z.enum(["success", "failure", "pending"]).nullable(), null).default(null),
  order_id: fallback(z.string().nullable(), null).default(null),
});

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Café EX" }] }),
  validateSearch: zodValidator(searchSchema),
  component: CheckoutPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "identity" | "address" | "shipping" | "review";

type Identity =
  | { type: "user"; email: string }
  | { type: "guest"; name: string; email: string; cpf?: string };

type Address = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ShippingOption = {
  id: string;
  name: string;
  company: string;
  company_logo: string | null;
  price: number;
  delivery_time: number;
};

type PixResult = {
  order_id: string;
  payment_id: string | number;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_expiration: string | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────

function CheckoutPage() {
  const search = Route.useSearch();
  const { user, loading } = useAuth();
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [pixResult, setPixResult] = useState<PixResult | null>(null);
  const [paying, setPaying] = useState(false);

  // Auto-advance de identity se já logado
  useEffect(() => {
    if (!loading && user && step === "identity") {
      setIdentity({ type: "user", email: user.email ?? "" });
      setStep("address");
    }
  }, [loading, user, step]);

  // Retorno do Mercado Pago após pagamento
  if (search.status === "success" && search.order_id) {
    return <SuccessScreen orderId={search.order_id} onClear={clear} />;
  }
  if (search.status === "failure" && search.order_id) {
    return <FailureScreen orderId={search.order_id} />;
  }
  if (search.status === "pending" && search.order_id) {
    return <PendingScreen orderId={search.order_id} />;
  }

  // PIX QR code
  if (pixResult) {
    return <PixScreen result={pixResult} onClear={clear} />;
  }

  if (items.length === 0 && !paying) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-3xl text-primary">Carrinho vazio</h1>
        <Link
          to="/catalogo"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Ver catálogo
        </Link>
      </div>
    );
  }

  const total = subtotal + (selectedShipping?.price ?? 0);

  const onIdentityConfirmed = (id: Identity) => {
    setIdentity(id);
    setStep("address");
  };

  const onAddressConfirmed = async (addr: Address, options: ShippingOption[]) => {
    setAddress(addr);
    setShippingOptions(options);
    setStep("shipping");
  };

  const onShippingConfirmed = (opt: ShippingOption) => {
    setSelectedShipping(opt);
    setStep("review");
  };

  const handlePay = async (method: "checkout_pro" | "pix") => {
    if (!identity || !address || !selectedShipping) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment-preference", {
        body: {
          tenant_id: "default",
          method,
          customer_id: identity.type === "user" ? user?.id : undefined,
          guest_email: identity.type === "guest" ? identity.email : undefined,
          guest_name: identity.type === "guest" ? identity.name : undefined,
          guest_cpf: identity.type === "guest" ? identity.cpf : undefined,
          items: items.map((i) => ({
            variant_id: i.variant_id,
            product_id: i.product_id,
            producer_id: i.producer_id ?? null,
            product_name: i.name,
            unit_price: i.unit_price,
            quantity: i.quantity,
            grind_option: i.grind_option,
            weight_grams: i.weight_grams ?? 250,
            variant_label: i.variant_label,
          })),
          subtotal,
          shipping_total: selectedShipping.price,
          discount_total: 0,
          total,
          shipping_address: address,
          shipping_service: selectedShipping,
          back_url: window.location.origin,
        },
      });

      if (error) throw new Error(error.message);

      if (method === "pix") {
        setPixResult(data as PixResult);
        clear();
      } else {
        const initPoint: string = data.init_point;
        if (!initPoint) throw new Error("init_point não retornado");
        window.location.href = initPoint;
      }
    } catch (e: any) {
      toast.error("Erro ao processar pagamento", { description: e.message });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl text-primary md:text-5xl">Checkout</h1>
        <div className="gold-divider mt-3" />

        <StepIndicator step={step} />

        <div className="mt-8">
          {step === "identity" && (
            <IdentityStep onConfirm={onIdentityConfirmed} />
          )}
          {step === "address" && (
            <AddressStep
              cartItems={items}
              onConfirm={onAddressConfirmed}
              onBack={() => setStep("identity")}
            />
          )}
          {step === "shipping" && address && (
            <ShippingStep
              options={shippingOptions}
              selected={selectedShipping}
              onSelect={setSelectedShipping}
              onConfirm={onShippingConfirmed}
              onBack={() => setStep("address")}
            />
          )}
          {step === "review" && identity && address && selectedShipping && (
            <ReviewStep
              items={items}
              subtotal={subtotal}
              identity={identity}
              address={address}
              shipping={selectedShipping}
              total={total}
              paying={paying}
              onPay={handlePay}
              onBack={() => setStep("shipping")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "identity", label: "Identificação" },
  { key: "address", label: "Endereço" },
  { key: "shipping", label: "Frete" },
  { key: "review", label: "Revisão" },
];

function StepIndicator({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.key === step);
  return (
    <div className="mt-6 flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
              i < idx
                ? "bg-[var(--farm)] text-white"
                : i === idx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={`ml-1.5 hidden text-xs font-semibold sm:block ${
              i === idx ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`ml-1.5 h-0.5 flex-1 ${i < idx ? "bg-[var(--farm)]" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Identificação ─────────────────────────────────────────────────────

function IdentityStep({ onConfirm }: { onConfirm: (id: Identity) => void }) {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"waiting" | "login" | "guest">("waiting");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  if (user) {
    return (
      <StepCard>
        <p className="text-sm text-muted-foreground">Você está identificado como</p>
        <p className="mt-1 font-semibold text-primary">{user.email}</p>
        <button
          onClick={() => onConfirm({ type: "user", email: user.email ?? "" })}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
        >
          Continuar para endereço <ChevronRight className="h-4 w-4" />
        </button>
      </StepCard>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    }
    // Se ok, o useEffect no pai detecta user e avança
  };

  const handleGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    onConfirm({ type: "guest", name: name.trim(), email: email.trim(), cpf: cpf.trim() || undefined });
  };

  return (
    <StepCard>
      {mode === "waiting" && (
        <div className="space-y-3">
          <button
            onClick={() => setMode("login")}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary"
          >
            <div className="text-left">
              <p className="font-semibold text-primary">Entrar na minha conta</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Acesse histórico de pedidos e endereços salvos</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setMode("guest")}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:border-primary"
          >
            <div className="text-left">
              <p className="font-semibold text-primary">Continuar como convidado</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Sem criar conta — informe nome e e-mail</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {mode === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <h2 className="font-display text-xl text-primary">Entrar na conta</h2>
          <InputField label="E-mail" type="email" value={email} onChange={setEmail} required />
          <div>
            <label className="block text-xs font-medium text-foreground/70">Senha</label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 text-sm focus:border-accent focus:outline-none"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
          <button type="button" onClick={() => setMode("waiting")} className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
            Voltar
          </button>
        </form>
      )}

      {mode === "guest" && (
        <form onSubmit={handleGuest} className="space-y-4">
          <h2 className="font-display text-xl text-primary">Dados para entrega</h2>
          <InputField label="Nome completo *" value={name} onChange={setName} required />
          <InputField label="E-mail *" type="email" value={email} onChange={setEmail} required hint="Para receber a confirmação do pedido" />
          <InputField label="CPF (opcional — obrigatório para PIX nativo)" value={cpf} onChange={setCpf} placeholder="000.000.000-00" />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Continuar <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setMode("waiting")} className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
            Voltar
          </button>
        </form>
      )}
    </StepCard>
  );
}

// ── Step 2: Endereço ───────────────────────────────────────────────────────────

type CartItemMin = { variant_id: string; weight_grams: number | null; unit_price: number; quantity: number };

function AddressStep({
  cartItems,
  onConfirm,
  onBack,
}: {
  cartItems: CartItemMin[];
  onConfirm: (addr: Address, shippingOptions: ShippingOption[]) => void;
  onBack: () => void;
}) {
  const [addr, setAddr] = useState<Address>({
    cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const setField = (k: keyof Address) => (v: string) =>
    setAddr((a) => ({ ...a, [k]: v }));

  const lookupCep = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    setCepLoading(true);
    setCepError("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setAddr((a) => ({
          ...a,
          street: data.logradouro ?? a.street,
          neighborhood: data.bairro ?? a.neighborhood,
          city: data.localidade ?? a.city,
          state: data.uf ?? a.state,
        }));
      }
    } catch {
      setCepError("Erro ao buscar CEP");
    }
    setCepLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addr.cep || !addr.street || !addr.number || !addr.city || !addr.state) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-shipping", {
        body: {
          tenant_id: "default",
          cep_destino: addr.cep,
          items: cartItems.map((i) => ({
            variant_id: i.variant_id,
            weight_grams: i.weight_grams ?? 250,
            unit_price: i.unit_price,
            quantity: i.quantity,
          })),
        },
      });
      if (error) throw new Error(error.message);
      onConfirm(addr, (data.options ?? []) as ShippingOption[]);
    } catch (e: any) {
      toast.error("Erro ao calcular frete", { description: e.message });
    }
    setCalculating(false);
  };

  return (
    <StepCard>
      <h2 className="font-display text-xl text-primary">Endereço de entrega</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground/70">CEP *</label>
          <div className="relative mt-1">
            <input
              value={addr.cep}
              onChange={(e) => setField("cep")(e.target.value)}
              onBlur={(e) => lookupCep(e.target.value)}
              placeholder="00000-000"
              required
              maxLength={9}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {cepError && <p className="mt-1 text-xs text-destructive">{cepError}</p>}
        </div>

        <InputField label="Rua / Logradouro *" value={addr.street} onChange={setField("street")} required />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Número *" value={addr.number} onChange={setField("number")} required />
          <InputField label="Complemento" value={addr.complement} onChange={setField("complement")} />
        </div>
        <InputField label="Bairro" value={addr.neighborhood} onChange={setField("neighborhood")} />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Cidade *" value={addr.city} onChange={setField("city")} required />
          <InputField label="Estado *" value={addr.state} onChange={setField("state")} required maxLength={2} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary">
            Voltar
          </button>
          <button
            type="submit"
            disabled={calculating}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {calculating ? "Calculando frete..." : "Calcular frete →"}
          </button>
        </div>
      </form>
    </StepCard>
  );
}

// ── Step 3: Frete ─────────────────────────────────────────────────────────────

function ShippingStep({
  options,
  selected,
  onSelect,
  onConfirm,
  onBack,
}: {
  options: ShippingOption[];
  selected: ShippingOption | null;
  onSelect: (o: ShippingOption) => void;
  onConfirm: (o: ShippingOption) => void;
  onBack: () => void;
}) {
  return (
    <StepCard>
      <h2 className="font-display text-xl text-primary">Opções de frete</h2>
      {options.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhuma opção de frete disponível para este CEP.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                selected?.id === opt.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="shipping"
                checked={selected?.id === opt.id}
                onChange={() => onSelect(opt)}
                className="h-4 w-4 accent-[var(--gold)]"
              />
              <div className="flex-1">
                <p className="font-semibold text-primary">
                  {opt.company} — {opt.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Prazo estimado: {opt.delivery_time} dia{opt.delivery_time !== 1 ? "s" : ""} útil{opt.delivery_time !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="font-display text-lg font-semibold text-primary">
                {opt.price === 0 ? "Grátis" : formatBRL(opt.price)}
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onBack} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary">
          Voltar
        </button>
        <button
          onClick={() => selected && onConfirm(selected)}
          disabled={!selected}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Continuar →
        </button>
      </div>
    </StepCard>
  );
}

// ── Step 4: Revisão + Pagamento ───────────────────────────────────────────────

function ReviewStep({
  items,
  subtotal,
  identity,
  address,
  shipping,
  total,
  paying,
  onPay,
  onBack,
}: {
  items: ReturnType<typeof useCart>["items"];
  subtotal: number;
  identity: Identity;
  address: Address;
  shipping: ShippingOption;
  total: number;
  paying: boolean;
  onPay: (method: "checkout_pro" | "pix") => void;
  onBack: () => void;
}) {
  const hasCpf = identity.type === "guest" && !!identity.cpf?.trim();

  return (
    <div className="space-y-6">
      {/* Resumo do pedido */}
      <StepCard>
        <h2 className="font-display text-xl text-primary">Resumo do pedido</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((i) => (
            <li key={i.variant_id} className="flex items-start justify-between gap-3">
              <span className="text-foreground/80">
                {i.quantity}× {i.name}
                {i.variant_label && (
                  <span className="ml-1 text-xs text-muted-foreground">({i.variant_label})</span>
                )}
              </span>
              <span className="shrink-0 font-medium">{formatBRL(i.unit_price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Frete · {shipping.company} {shipping.name}
            </dt>
            <dd>{shipping.price === 0 ? "Grátis" : formatBRL(shipping.price)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-primary">Total</span>
          <span className="font-display text-2xl text-primary">{formatBRL(total)}</span>
        </div>
      </StepCard>

      {/* Dados de entrega */}
      <StepCard>
        <h2 className="font-display text-xl text-primary">Entrega</h2>
        <div className="mt-3 space-y-1 text-sm text-foreground/80">
          {identity.type === "guest" && (
            <p>
              <span className="font-medium">{identity.name}</span> · {identity.email}
            </p>
          )}
          <p>{address.street}, {address.number}{address.complement ? ` — ${address.complement}` : ""}</p>
          <p>{address.neighborhood && `${address.neighborhood} · `}{address.city}/{address.state} · CEP {address.cep}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Prazo estimado: {shipping.delivery_time} dia{shipping.delivery_time !== 1 ? "s" : ""} útil{shipping.delivery_time !== 1 ? "s" : ""} após o envio
          </p>
        </div>
      </StepCard>

      {/* Pagamento */}
      <StepCard>
        <h2 className="font-display text-xl text-primary">Pagamento</h2>
        <div className="mt-5 space-y-3">
          <button
            onClick={() => onPay("checkout_pro")}
            disabled={paying}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#009EE3] py-3 text-sm font-semibold text-white hover:bg-[#0087c4] disabled:opacity-60"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Pagar com Mercado Pago
          </button>

          {hasCpf && (
            <button
              onClick={() => onPay("pix")}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#32BCAD] py-3 text-sm font-semibold text-[#32BCAD] hover:bg-[#32BCAD]/10 disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />
              Pagar com PIX (QR Code)
            </button>
          )}

          {!hasCpf && (
            <p className="text-center text-xs text-muted-foreground">
              Para PIX nativo com QR Code, informe seu CPF na etapa de identificação.
            </p>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Pagamento processado com segurança pelo Mercado Pago.
        </p>
      </StepCard>

      <div className="flex justify-start">
        <button type="button" onClick={onBack} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary">
          ← Voltar ao frete
        </button>
      </div>
    </div>
  );
}

// ── Result Screens ─────────────────────────────────────────────────────────────

function SuccessScreen({ orderId, onClear }: { orderId: string; onClear: () => void }) {
  const clearedRef = useRef(false);
  useEffect(() => {
    if (!clearedRef.current) {
      onClear();
      clearedRef.current = true;
    }
  }, [onClear]);

  return (
    <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
      <CheckCircle2 className="mx-auto h-14 w-14 text-[var(--farm)]" />
      <h1 className="mt-4 font-display text-4xl text-primary">Pedido confirmado!</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Seu pedido <span className="font-mono text-primary">#{orderId.slice(0, 8)}</span> foi recebido e está sendo processado.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/minha-conta" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Meus pedidos
        </Link>
        <Link to="/catalogo" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-primary">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}

function FailureScreen({ orderId }: { orderId: string }) {
  return (
    <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
      <h1 className="font-display text-4xl text-primary">Pagamento recusado</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Não conseguimos processar o pagamento do pedido{" "}
        <span className="font-mono text-primary">#{orderId.slice(0, 8)}</span>.
        Tente novamente com outro método.
      </p>
      <Link to="/carrinho" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Tentar novamente
      </Link>
    </div>
  );
}

function PendingScreen({ orderId }: { orderId: string }) {
  return (
    <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--gold)]" />
      <h1 className="mt-4 font-display text-4xl text-primary">Pagamento pendente</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Seu pedido <span className="font-mono text-primary">#{orderId.slice(0, 8)}</span> está
        aguardando a confirmação do pagamento.
      </p>
      <Link to="/minha-conta" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Ver pedidos
      </Link>
    </div>
  );
}

function PixScreen({ result, onClear }: { result: PixResult; onClear: () => void }) {
  const clearedRef = useRef(false);
  useEffect(() => {
    if (!clearedRef.current) {
      onClear();
      clearedRef.current = true;
    }
  }, [onClear]);

  const copyCode = () => {
    if (!result.pix_qr_code) return;
    navigator.clipboard.writeText(result.pix_qr_code);
    toast.success("Código PIX copiado!");
  };

  const expiration = result.pix_expiration
    ? new Date(result.pix_expiration).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="container mx-auto max-w-md px-4 py-20 text-center md:px-6">
      <QrCode className="mx-auto h-10 w-10 text-[var(--gold)]" />
      <h1 className="mt-4 font-display text-3xl text-primary">Pague via PIX</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pedido <span className="font-mono text-primary">#{result.order_id.slice(0, 8)}</span>
        {expiration && ` · expira às ${expiration}`}
      </p>

      {result.pix_qr_code_base64 && (
        <div className="mx-auto mt-6 w-fit rounded-xl border border-border bg-card p-4">
          <img
            src={`data:image/png;base64,${result.pix_qr_code_base64}`}
            alt="QR Code PIX"
            className="h-52 w-52"
          />
        </div>
      )}

      {result.pix_qr_code && (
        <div className="mt-6">
          <p className="mb-2 text-xs text-muted-foreground">ou copie o código abaixo</p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
            <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-foreground/80">
              {result.pix_qr_code}
            </code>
            <button onClick={copyCode} className="shrink-0 text-muted-foreground hover:text-primary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Após o pagamento, o status do pedido será atualizado automaticamente.
        Você receberá uma confirmação por e-mail.
      </p>
      <Link to="/minha-conta" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        Ver pedidos
      </Link>
    </div>
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
  );
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
  hint,
  maxLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
