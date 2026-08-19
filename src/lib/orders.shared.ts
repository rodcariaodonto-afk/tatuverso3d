/** Constantes de operação de pedidos — seguras para o navegador. */

export type OrderStatus =
  | "pending"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  preparing: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Estornado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando",
  authorized: "Autorizado",
  paid: "Pago",
  failed: "Recusado",
  refunded: "Estornado",
};

/** Transições permitidas na operação. Qualquer outra é recusada no servidor. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["preparing", "shipped", "cancelled", "refunded"],
  preparing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** Linha do tempo mostrada ao cliente. */
export const ORDER_TIMELINE: OrderStatus[] = ["pending", "paid", "preparing", "shipped", "delivered"];

export const PRODUCTION_STATUSES = ["pending", "in_production", "done"] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_LABEL: Record<string, string> = {
  pending: "Na fila",
  in_production: "Em produção",
  done: "Pronto",
};

export const MOVEMENT_LABEL: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjust: "Ajuste",
  sale: "Venda",
  reservation_release: "Reserva liberada",
  return: "Devolução",
};

export function orderStatusTone(status: string) {
  if (status === "delivered" || status === "paid") return "bg-emerald-500/15 text-emerald-700";
  if (status === "cancelled" || status === "refunded") return "bg-destructive/15 text-destructive";
  if (status === "shipped") return "bg-sky-500/15 text-sky-700";
  if (status === "preparing") return "bg-amber-500/15 text-amber-700";
  return "bg-[var(--surface-soft)] text-primary";
}