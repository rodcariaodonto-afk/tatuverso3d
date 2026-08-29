/** Tipos e helpers de solicitações de orçamento (personalizados sob encomenda). */

export type QuoteStatus = "new" | "in_review" | "quoted" | "closed";

export type QuoteRequest = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  idea: string;
  status: QuoteStatus;
  notes: string | null;
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Novo",
  in_review: "Em análise",
  quoted: "Orçado",
  closed: "Encerrado",
};
