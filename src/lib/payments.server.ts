/** Cliente Mercado Pago — executa somente no servidor. */

const MP_API = "https://api.mercadopago.com";

export type MpPayment = {
  id: number;
  status: string;
  status_detail?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  transaction_amount?: number;
  installments?: number | null;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
  [k: string]: unknown;
};

function accessToken() {
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento indisponível: credencial não configurada.");
  return token;
}

async function mpFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const { idempotencyKey, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${accessToken()}`);
  headers.set("Content-Type", "application/json");
  if (idempotencyKey) headers.set("X-Idempotency-Key", idempotencyKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${MP_API}${path}`, { ...rest, headers, signal: controller.signal });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const detail =
        body?.message || body?.cause?.[0]?.description || `Erro ${res.status} no provedor`;
      throw new Error(String(detail));
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

/** Status do provedor → payment_status do banco. */
export function mapPaymentStatus(
  status: string,
): "pending" | "authorized" | "paid" | "failed" | "refunded" {
  switch (status) {
    case "approved":
      return "paid";
    case "authorized":
    case "in_process":
    case "in_mediation":
      return "authorized";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "rejected":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

export type CreatePaymentInput = {
  amount: number;
  description: string;
  externalReference: string;
  idempotencyKey: string;
  notificationUrl: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
  };
  /** Pix */
  pix?: { expiresInMinutes: number };
  /** Cartão — token gerado no navegador pelo SDK oficial. */
  card?: {
    token: string;
    installments: number;
    payment_method_id: string;
    issuer_id?: string | null;
  };
};

export async function createMpPayment(input: CreatePaymentInput): Promise<MpPayment> {
  const base: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description,
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    payer: input.payer,
    statement_descriptor: "TATUVERSO3D",
  };

  if (input.pix) {
    base["payment_method_id"] = "pix";
    base["date_of_expiration"] = new Date(
      Date.now() + input.pix.expiresInMinutes * 60_000,
    ).toISOString();
  } else if (input.card) {
    base["token"] = input.card.token;
    base["installments"] = input.card.installments;
    base["payment_method_id"] = input.card.payment_method_id;
    if (input.card.issuer_id) base["issuer_id"] = input.card.issuer_id;
    base["capture"] = true;
  } else {
    throw new Error("Forma de pagamento inválida");
  }

  return (await mpFetch("/v1/payments", {
    method: "POST",
    body: JSON.stringify(base),
    idempotencyKey: input.idempotencyKey,
  })) as MpPayment;
}

export async function getMpPayment(id: string | number): Promise<MpPayment> {
  return (await mpFetch(`/v1/payments/${id}`)) as MpPayment;
}

export type MpRefund = {
  id: number;
  payment_id: number;
  amount: number;
  status?: string | null;
  [k: string]: unknown;
};

/**
 * Estorno no provedor. Sem `amount` o Mercado Pago devolve o valor total.
 * A chave de idempotência evita estorno duplicado em reenvio.
 */
export async function refundMpPayment(opts: {
  paymentId: string | number;
  amount?: number | null;
  idempotencyKey: string;
}): Promise<MpRefund> {
  const body =
    opts.amount != null && opts.amount > 0
      ? JSON.stringify({ amount: Number(opts.amount.toFixed(2)) })
      : JSON.stringify({});
  return (await mpFetch(`/v1/payments/${opts.paymentId}/refunds`, {
    method: "POST",
    body,
    idempotencyKey: opts.idempotencyKey,
  })) as MpRefund;
}

/**
 * Assinatura do webhook: manifest "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * assinado em HMAC-SHA256 com MERCADOPAGO_WEBHOOK_SECRET.
 */
export async function verifyMpSignature(opts: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
}): Promise<boolean> {
  const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
  if (!secret || !opts.signatureHeader || !opts.dataId) return false;

  const parts = Object.fromEntries(
    opts.signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  ) as Record<string, string>;
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${opts.dataId.toLowerCase()};request-id:${opts.requestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
