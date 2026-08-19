import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/candidaturas")({
  head: () => ({ meta: [{ title: "Candidaturas — Admin TatuVerso3D" }] }),
  component: CandidaturasPage,
});

type AppStatus = "pending" | "reviewing" | "approved" | "rejected";

const STATUS_LABELS: Record<AppStatus, string> = {
  pending: "Pendente",
  reviewing: "Em análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_COLORS: Record<AppStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  reviewing: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

function CandidaturasPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState<Record<string, string>>({});

  const { data: apps, isLoading } = useQuery({
    queryKey: ["producer-applications", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("producer_applications" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = (q as any).eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const handleApprove = async (app: any) => {
    setApprovingId(app.id);
    try {
      const { data, error } = await supabase.functions.invoke("approve-producer", {
        body: {
          application_id: app.id,
          commission_rate: Number(commissionRate[app.id] ?? 12),
        },
      });
      if (error) throw error;
      toast.success(`Produtor aprovado! Slug: /${(data as any).slug}`);
      qc.invalidateQueries({ queryKey: ["producer-applications"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao aprovar");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    const { error } = await supabase
      .from("producer_applications" as any)
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setRejectingId(null);
    if (error) return toast.error(error.message);
    toast.success("Candidatura rejeitada");
    qc.invalidateQueries({ queryKey: ["producer-applications"] });
  };

  const { data: counts } = useQuery({
    queryKey: ["app-counts"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("producer_applications" as any)
        .select("status") as any);
      const all = (data ?? []) as any[];
      return {
        pending: all.filter((a) => a.status === "pending").length,
        reviewing: all.filter((a) => a.status === "reviewing").length,
      };
    },
  });

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="eyebrow">Marketplace</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">
            Candidaturas de produtores
          </h1>
          <div className="brand-divider mt-3" />
          <p className="mt-3 text-sm text-muted-foreground">
            {counts?.pending ?? 0} pendentes · {counts?.reviewing ?? 0} em análise
          </p>
        </header>

        {/* Filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", "pending", "reviewing", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground/70 hover:border-primary"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center p-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (apps ?? []).length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Nenhuma candidatura {statusFilter !== "all" ? `com status "${STATUS_LABELS[statusFilter as AppStatus]}"` : ""}.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(apps ?? []).map((app: any) => {
                const isExpanded = expandedId === app.id;
                const links = app.links ?? {};

                return (
                  <div key={app.id}>
                    {/* Row */}
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
                      <div className="grid gap-1 sm:grid-cols-[1fr_1fr_auto]">
                        <div>
                          <p className="font-semibold text-primary">{app.brand_name}</p>
                          <p className="text-xs text-muted-foreground">{app.responsible_name}</p>
                        </div>
                        <div>
                          <p className="text-sm">{app.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {[app.city, app.state].filter(Boolean).join(" / ")}
                            {app.monthly_volume_kg ? ` · ${app.monthly_volume_kg} kg/mês` : ""}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[app.status as AppStatus] ?? ""}`}
                          >
                            {STATUS_LABELS[app.status as AppStatus] ?? app.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(app.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="rounded-md p-2 hover:bg-muted"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 px-5 py-5">
                        {app.operation_type && (
                          <p className="text-sm">
                            <span className="font-medium">Operação:</span>{" "}
                            {app.operation_type}
                          </p>
                        )}
                        {app.phone && (
                          <p className="text-sm">
                            <span className="font-medium">Telefone:</span> {app.phone}
                          </p>
                        )}
                        {app.message && (
                          <p className="mt-2 text-sm text-foreground/80">{app.message}</p>
                        )}
                        {(links.instagram || links.website) && (
                          <div className="mt-3 flex flex-wrap gap-3">
                            {links.instagram && (
                              <a
                                href={`https://instagram.com/${links.instagram.replace("@", "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Instagram <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {links.website && (
                              <a
                                href={links.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                Site <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {app.status !== "approved" && app.status !== "rejected" && (
                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-muted-foreground">
                                Comissão (%)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={commissionRate[app.id] ?? "12"}
                                onChange={(e) =>
                                  setCommissionRate((r) => ({ ...r, [app.id]: e.target.value }))
                                }
                                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
                              />
                            </div>
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={approvingId === app.id}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              {approvingId === app.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(app.id)}
                              disabled={rejectingId === app.id}
                              className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                            >
                              {rejectingId === app.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
