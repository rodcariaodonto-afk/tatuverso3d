import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { QUOTE_STATUS_LABELS, type QuoteRequest, type QuoteStatus } from "@/lib/quotes";

export const Route = createFileRoute("/admin/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos — Admin TatuVerso3D" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrcamentosPage,
});

const STATUS_STYLES: Record<QuoteStatus, string> = {
  new: "bg-accent/15 text-accent-foreground border-accent/40",
  in_review: "bg-primary/10 text-primary border-primary/30",
  quoted: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

function AdminOrcamentosPage() {
  return (
    <AdminShell>
      <OrcamentosContent />
    </AdminShell>
  );
}

function OrcamentosContent() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<QuoteStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["admin-quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as QuoteRequest[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const { error } = await supabase
        .from("quote_requests" as never)
        .update({ status } as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote-requests"] });
      toast.success("Status atualizado.");
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_requests" as never).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote-requests"] });
      toast.success("Solicitação removida.");
    },
    onError: (e) => toast.error(e.message),
  });

  const all = quotes ?? [];
  const filtered = filter === "all" ? all : all.filter((q) => q.status === filter);
  const counts = all.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-primary md:text-3xl">Orçamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitações de peças personalizadas enviadas pelo site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "new", "in_review", "quoted", "closed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
            >
              {s === "all" ? `Todos (${all.length})` : `${QUOTE_STATUS_LABELS[s]} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg text-primary">Nenhuma solicitação aqui ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando um cliente enviar o formulário de personalizados, o pedido aparece nesta lista.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((q) => {
            const open = expanded === q.id;
            return (
              <div key={q.id} className="rounded-2xl border border-border bg-card shadow-sm">
                <button
                  onClick={() => setExpanded(open ? null : q.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left"
                >
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[q.status]}`}
                  >
                    {QUOTE_STATUS_LABELS[q.status]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {q.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{q.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(q.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ideia do cliente
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {q.idea}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <a
                        href={`mailto:${q.email}?subject=${encodeURIComponent(
                          "Seu orçamento TatuVerso3D",
                        )}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110"
                      >
                        <Mail className="h-3.5 w-3.5" /> Responder por e-mail
                      </a>
                      {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[])
                        .filter((s) => s !== q.status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus.mutate({ id: q.id, status: s })}
                            className="rounded-full border border-border px-3 py-2 text-[11px] font-semibold text-foreground hover:border-primary/50"
                          >
                            Marcar como {QUOTE_STATUS_LABELS[s]}
                          </button>
                        ))}
                      <button
                        onClick={() => {
                          if (confirm("Remover esta solicitação?")) remove.mutate(q.id);
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
