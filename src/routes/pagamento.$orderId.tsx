import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getPaymentConfig, getPaymentStatus, startPayment } from "@/lib/payments.functions";
import { formatBRL } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/pagamento/$orderId")({
  head: () => ({
    meta: [
      { title: "Pagamento do pedido — TatuVerso3D" },
      {
        name: "description",
        content: "Pague seu pedido TatuVerso3D com Pix ou cartão de crédito em ambiente seguro.",
      },
      { property: "og:title", content: "Pagamento do pedido — TatuVerso3D" },
      { property: "og:description", content: "Pix instantâneo ou cartão de crédito." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentPage,
});

type Method = "pix" | "card";

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

function useMercadoPagoSdk(publicKey: string | null) {
  const [mp, setMp] = useState<any>(null);
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.MercadoPago) return;
      setMp(new window.MercadoPago(publicKey, { locale: "pt-BR" }));
    };
    if (window.MercadoPago) return init();
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
    if (existing) {
      existing.addEventListener("load", init);
      return () => existing.removeEventListener("load", init);
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset["mpSdk"] = "1";
    script.onload = init;
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [publicKey]);
  return mp;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");

function PaymentPage() {
  const { orderId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const configFn = useServerFn(getPaymentConfig);
  const statusFn = useServerFn(getPaymentStatus);
  const startFn = useServerFn(startPayment);

  const [method, setMethod] = useState<Method>("pix");
  const [pix, setPix] = useState<{
    qr_code: string | null;
    qr_code_base64: string | null;
    ticket_url: string | null;
    expires_at: string | null;
  } | null>(null);

  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => configFn({ data: undefined as never }),
  });

  const statusQuery = useQuery({
    queryKey: ["payment-status", orderId],
    queryFn: () => statusFn({ data: { order_id: orderId } }),
    enabled: !!user,
    refetchInterval: (q) => {
      const st = (q.state.data as any)?.order?.payment_status;
      return st === "paid" || st === "refunded" ? false : 6000;
    },
  });

  const order = statusQuery.data?.order ?? null;
  const payment = statusQuery.data?.payment ?? null;
  const paid = order?.payment_status === "paid";

  useEffect(() => {
    if (!pix && payment?.method === "pix" && payment.qr_code) {
      setPix({
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64,
        ticket_url: payment.ticket_url,
        expires_at: payment.expires_at,
      });
      setMethod("pix");
    }
  }, [payment, pix]);

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
        <h1 className="font-display text-3xl text-primary">Entre para pagar</h1>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (statusQuery.isLoading) {
    return (
      <div className="container mx-auto flex justify-center px-4 py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (statusQuery.isError || !order) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center md:px-6">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-display text-2xl text-primary">Pedido não encontrado</h1>
        <Link to="/minha-conta" className="mt-6 inline-flex text-sm font-semibold text-accent">
          Ver meus pedidos
        </Link>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-20 text-center md:px-6">
        <CheckCircle2 className="mx-auto h-14 w-14 text-accent" />
        <h1 className="mt-4 font-display text-3xl text-primary">Pagamento aprovado!</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pedido <strong>#{orderId.slice(0, 8)}</strong> confirmado no valor de{" "}
          <strong>{formatBRL(Number(order.total))}</strong>. A produção começa agora
          {order.production_days ? ` (${order.production_days} dia(s) de produção)` : ""}.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate({ to: "/minha-conta" })}
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Acompanhar pedido
          </button>
          <Link
            to="/catalogo"
            search={{ q: "" } as never}
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold text-primary"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    );
  }

  const disabled = configQuery.data && !configQuery.data.enabled;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl text-primary md:text-4xl">Pagamento</h1>
      <div className="brand-divider mt-3" />
      <p className="mt-3 text-sm text-muted-foreground">
        Pedido <strong>#{orderId.slice(0, 8)}</strong> — total{" "}
        <strong className="text-foreground">{formatBRL(Number(order.total))}</strong>
      </p>

      {order.status === "cancelled" && (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Este pedido foi cancelado. Refaça a compra no catálogo.
        </p>
      )}

      {disabled && (
        <p className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          O provedor de pagamento ainda não está configurado. Seu pedido ficou salvo como aguardando
          pagamento.
        </p>
      )}

      {!disabled && order.status !== "cancelled" && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="flex gap-3">
              <MethodTab
                active={method === "pix"}
                onClick={() => setMethod("pix")}
                icon={<QrCode className="h-4 w-4" />}
                label="Pix"
                hint="Aprovação em segundos"
              />
              <MethodTab
                active={method === "card"}
                onClick={() => setMethod("card")}
                icon={<CreditCard className="h-4 w-4" />}
                label="Cartão de crédito"
                hint="Em até 12x"
              />
            </div>

            <div className="mt-6 rounded-3xl border border-border bg-card p-5 md:p-6">
              {method === "pix" ? (
                <PixPanel
                  orderId={orderId}
                  pix={pix}
                  setPix={setPix}
                  startFn={startFn}
                  onChanged={() => statusQuery.refetch()}
                  failureReason={payment?.failure_reason ?? null}
                />
              ) : (
                <CardPanel
                  orderId={orderId}
                  publicKey={configQuery.data?.public_key ?? null}
                  amount={Number(order.total)}
                  startFn={startFn}
                  onChanged={() => statusQuery.refetch()}
                />
              )}
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-card p-5">
            <h2 className="font-display text-lg text-primary">Resumo</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total do pedido</dt>
                <dd className="font-semibold text-foreground">{formatBRL(Number(order.total))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">{statusLabel(order.payment_status)}</dd>
              </div>
            </dl>
            <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Dados do cartão são enviados diretamente ao provedor de pagamento. A loja nunca
              armazena o número do cartão.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: string | null | undefined) {
  switch (s) {
    case "paid":
      return "Pago";
    case "authorized":
      return "Em análise";
    case "failed":
      return "Recusado";
    case "refunded":
      return "Estornado";
    default:
      return "Aguardando pagamento";
  }
}

function MethodTab({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl border p-4 text-left transition ${
        active ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/50"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-primary">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

/* ── Pix ─────────────────────────────────────────────────────────────────── */

function PixPanel({
  orderId,
  pix,
  setPix,
  startFn,
  onChanged,
  failureReason,
}: {
  orderId: string;
  pix: any;
  setPix: (v: any) => void;
  startFn: any;
  onChanged: () => void;
  failureReason: string | null;
}) {
  const [doc, setDoc] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const [first, ...rest] = name.trim().split(" ");
      return startFn({
        data: {
          method: "pix",
          order_id: orderId,
          payer: {
            email: email.trim(),
            first_name: first || "Cliente",
            last_name: rest.join(" ") || "TatuVerso",
            document: onlyDigits(doc),
          },
        },
      });
    },
    onSuccess: (data: any) => {
      setPix({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        ticket_url: data.ticket_url,
        expires_at: data.expires_at,
      });
      onChanged();
    },
    onError: (e: any) => toast.error("Não foi possível gerar o Pix", { description: e.message }),
  });

  if (pix?.qr_code) {
    return <PixQr pix={pix} onRefresh={onChanged} />;
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (onlyDigits(doc).length !== 11) return toast.error("Informe um CPF válido");
        if (!email.includes("@")) return toast.error("Informe um e-mail válido");
        mutation.mutate();
      }}
    >
      <h2 className="font-display text-xl text-primary">Pagar com Pix</h2>
      <p className="text-sm text-muted-foreground">
        Geramos um QR Code válido por 30 minutos. O estoque da sua peça fica reservado nesse período.
      </p>
      {failureReason && (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          Última tentativa recusada: {failureReason}
        </p>
      )}
      <Field label="Nome completo" value={name} onChange={setName} placeholder="Maria Silva" />
      <Field label="E-mail" value={email} onChange={setEmail} placeholder="voce@email.com" />
      <Field
        label="CPF"
        value={doc}
        onChange={(v) => setDoc(onlyDigits(v).slice(0, 11))}
        placeholder="000.000.000-00"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {mutation.isPending ? "Gerando Pix…" : "Gerar QR Code Pix"}
      </button>
    </form>
  );
}

function PixQr({ pix, onRefresh }: { pix: any; onRefresh: () => void }) {
  const [left, setLeft] = useState<number>(() => remaining(pix.expires_at));
  useEffect(() => {
    const t = setInterval(() => setLeft(remaining(pix.expires_at)), 1000);
    return () => clearInterval(t);
  }, [pix.expires_at]);

  return (
    <div className="space-y-4 text-center">
      <h2 className="font-display text-xl text-primary">Escaneie o QR Code</h2>
      {pix.qr_code_base64 && (
        <img
          src={`data:image/png;base64,${pix.qr_code_base64}`}
          alt="QR Code Pix do pedido TatuVerso3D"
          className="mx-auto h-56 w-56 rounded-2xl border border-border bg-white p-2"
        />
      )}
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {left > 0 ? `Expira em ${formatLeft(left)}` : "QR Code expirado"}
      </p>
      <div className="rounded-xl border border-border bg-muted/40 p-3 text-left">
        <p className="break-all text-[11px] leading-relaxed text-muted-foreground">{pix.qr_code}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(pix.qr_code);
          toast.success("Código Pix copiado");
        }}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        <Copy className="h-4 w-4" /> Copiar código Pix
      </button>
      <button
        type="button"
        onClick={onRefresh}
        className="text-xs font-semibold text-accent underline"
      >
        Já paguei, verificar agora
      </button>
      <p className="text-xs text-muted-foreground">
        A confirmação é automática assim que o banco liquidar o Pix.
      </p>
    </div>
  );
}

function remaining(iso: string | null) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
function formatLeft(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/* ── Cartão ──────────────────────────────────────────────────────────────── */

function CardPanel({
  orderId,
  publicKey,
  amount,
  startFn,
  onChanged,
}: {
  orderId: string;
  publicKey: string | null;
  amount: number;
  startFn: any;
  onChanged: () => void;
}) {
  const mp = useMercadoPagoSdk(publicKey);
  const [form, setForm] = useState({
    number: "",
    holder: "",
    month: "",
    year: "",
    cvv: "",
    doc: "",
    email: "",
    installments: 1,
  });
  const [result, setResult] = useState<{ status: string; detail: string | null } | null>(null);
  const busy = useRef(false);

  const installmentOptions = useMemo(() => {
    const max = Math.min(12, Math.max(1, Math.floor(amount / 20)) || 1);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [amount]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!mp) throw new Error("Provedor de pagamento ainda carregando. Tente novamente.");
      const bin = onlyDigits(form.number).slice(0, 8);
      const methods = await mp.getPaymentMethods({ bin });
      const pm = methods?.results?.[0];
      if (!pm) throw new Error("Cartão não reconhecido. Confira o número.");

      const token = await mp.createCardToken({
        cardNumber: onlyDigits(form.number),
        cardholderName: form.holder.trim(),
        cardExpirationMonth: form.month,
        cardExpirationYear: form.year.length === 2 ? `20${form.year}` : form.year,
        securityCode: form.cvv,
        identificationType: "CPF",
        identificationNumber: onlyDigits(form.doc),
      });
      if (!token?.id) throw new Error("Não foi possível validar os dados do cartão.");

      const [first, ...rest] = form.holder.trim().split(" ");
      return startFn({
        data: {
          method: "card",
          order_id: orderId,
          token: token.id,
          installments: form.installments,
          payment_method_id: pm.id,
          issuer_id: pm.issuer?.id ? String(pm.issuer.id) : null,
          payer: {
            email: form.email.trim(),
            first_name: first || "Cliente",
            last_name: rest.join(" ") || "TatuVerso",
            document: onlyDigits(form.doc),
          },
        },
      });
    },
    onSuccess: (data: any) => {
      setResult({ status: data.status, detail: data.detail });
      onChanged();
      if (data.status === "failed") {
        toast.error("Pagamento recusado", { description: data.detail ?? undefined });
      } else if (data.status === "paid") {
        toast.success("Pagamento aprovado!");
      } else {
        toast.info("Pagamento em análise pelo emissor.");
      }
    },
    onError: (e: any) => toast.error("Falha no pagamento", { description: e.message }),
    onSettled: () => {
      busy.current = false;
    },
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy.current) return;
        if (onlyDigits(form.number).length < 13) return toast.error("Número do cartão inválido");
        if (!form.holder.trim()) return toast.error("Informe o nome impresso no cartão");
        if (!form.month || !form.year) return toast.error("Informe a validade");
        if (form.cvv.length < 3) return toast.error("CVV inválido");
        if (onlyDigits(form.doc).length !== 11) return toast.error("CPF inválido");
        if (!form.email.includes("@")) return toast.error("E-mail inválido");
        busy.current = true;
        mutation.mutate();
      }}
    >
      <h2 className="font-display text-xl text-primary">Cartão de crédito</h2>
      {result && result.status !== "paid" && (
        <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          Status: {statusLabel(result.status)}
          {result.detail ? ` — ${result.detail}` : ""}
        </p>
      )}
      <Field
        label="Número do cartão"
        value={form.number}
        onChange={(v) => set("number")(onlyDigits(v).slice(0, 19))}
        placeholder="0000 0000 0000 0000"
      />
      <Field label="Nome impresso no cartão" value={form.holder} onChange={set("holder")} placeholder="MARIA SILVA" />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Mês" value={form.month} onChange={(v) => set("month")(onlyDigits(v).slice(0, 2))} placeholder="12" />
        <Field label="Ano" value={form.year} onChange={(v) => set("year")(onlyDigits(v).slice(0, 4))} placeholder="2030" />
        <Field label="CVV" value={form.cvv} onChange={(v) => set("cvv")(onlyDigits(v).slice(0, 4))} placeholder="123" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="CPF do titular" value={form.doc} onChange={(v) => set("doc")(onlyDigits(v).slice(0, 11))} placeholder="000.000.000-00" />
        <Field label="E-mail" value={form.email} onChange={set("email")} placeholder="voce@email.com" />
      </div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Parcelas
        </span>
        <select
          value={form.installments}
          onChange={(e) => setForm((f) => ({ ...f, installments: Number(e.target.value) }))}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {installmentOptions.map((n) => (
            <option key={n} value={n}>
              {n}x de {formatBRL(amount / n)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={mutation.isPending || !mp}
        className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {mutation.isPending ? "Processando…" : `Pagar ${formatBRL(amount)}`}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
      />
    </label>
  );
}
