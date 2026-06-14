import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Trash2, AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/minha-conta/privacidade")({
  head: () => ({ meta: [{ title: "Privacidade & LGPD — Café EX" }] }),
  component: PrivacidadePage,
});

type DeleteStep = "idle" | "confirm1" | "confirm2" | "deleting" | "done";

function PrivacidadePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [confirmText, setConfirmText] = useState("");

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada, faça login novamente");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? "Erro ao exportar dados");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || confirmText.trim().toLowerCase() !== "excluir") return;
    setDeleteStep("deleting");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmed: true }),
        },
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as any).error ?? "Erro ao processar exclusão");

      setDeleteStep("done");
      // Faz logout após a exclusão
      setTimeout(async () => {
        await signOut();
        navigate({ to: "/" });
      }, 4000);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir dados");
      setDeleteStep("idle");
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Você precisa estar logado.</p>
        <Link to="/login" className="mt-4 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          Entrar
        </Link>
      </div>
    );
  }

  if (deleteStep === "done") {
    return (
      <div className="container mx-auto max-w-md py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 font-display text-3xl text-primary">Dados anonimizados</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Seus dados pessoais foram removidos. O histórico de pedidos é mantido por obrigação
          fiscal. Você será desconectado em instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 md:px-6">
      <Link
        to="/minha-conta"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Minha conta
      </Link>

      <header className="mt-6">
        <p className="eyebrow">LGPD</p>
        <h1 className="mt-2 font-display text-4xl text-primary">Privacidade e seus dados</h1>
        <div className="gold-divider mt-3" />
        <p className="mt-4 text-sm text-muted-foreground">
          De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem o direito de
          acessar, corrigir, exportar e solicitar a exclusão dos seus dados pessoais.
        </p>
      </header>

      {/* Exportar dados */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" />
          <div className="flex-1">
            <h2 className="font-display text-xl text-primary">Exportar meus dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Baixe um arquivo JSON com todos os seus dados: perfil, pedidos, assinaturas,
              avaliações e respostas do quiz.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:border-primary disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Gerando arquivo..." : "Baixar meus dados (JSON)"}
            </button>
          </div>
        </div>
      </section>

      {/* Solicitar exclusão */}
      <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <h2 className="font-display text-xl text-primary">Solicitar exclusão de dados</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seus dados pessoais (nome, e-mail, telefone, CPF) serão anonimizados. Assinaturas
              ativas serão canceladas. O histórico de pedidos é mantido por obrigação fiscal
              (art. 16, III da LGPD).
            </p>
            <p className="mt-2 text-xs font-semibold text-destructive">
              Esta ação é irreversível. Você perderá acesso à sua conta.
            </p>

            {deleteStep === "idle" && (
              <button
                onClick={() => setDeleteStep("confirm1")}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Solicitar exclusão
              </button>
            )}

            {deleteStep === "confirm1" && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-background p-4">
                <p className="text-sm font-semibold text-destructive">
                  Tem certeza? Esta ação não pode ser desfeita.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para confirmar, digite <strong>excluir</strong> abaixo:
                </p>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="excluir"
                  className="mt-3 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-destructive focus:outline-none"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={confirmText.trim().toLowerCase() !== "excluir" || deleteStep === "deleting"}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {deleteStep === "deleting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {deleteStep === "deleting" ? "Processando..." : "Confirmar exclusão"}
                  </button>
                  <button
                    onClick={() => { setDeleteStep("idle"); setConfirmText(""); }}
                    className="rounded-full border border-border px-5 py-2 text-sm text-foreground/80 hover:bg-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Informações legais */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Seus direitos (LGPD - Art. 18)</h2>
        <ul className="mt-3 space-y-1 list-disc pl-4">
          <li>Confirmar a existência de tratamento dos seus dados</li>
          <li>Acessar e exportar os seus dados</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a exclusão dos dados tratados com seu consentimento</li>
          <li>Revogar o consentimento a qualquer momento</li>
        </ul>
        <p className="mt-4">
          Dúvidas?{" "}
          <a href="mailto:privacidade@cafezeira.com" className="font-semibold text-primary hover:underline">
            privacidade@cafezeira.com
          </a>
        </p>
      </section>
    </div>
  );
}
