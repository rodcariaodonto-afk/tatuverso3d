import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, type ProductCardData } from "@/components/catalog/ProductCard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz Sensorial — Cafe EX" },
      {
        name: "description",
        content: "Descubra qual perfil de café especial combina com você em 5 perguntas rápidas.",
      },
      { property: "og:title", content: "Quiz Sensorial Cafe EX" },
      { property: "og:description", content: "Encontre seu café ideal." },
    ],
  }),
  component: QuizPage,
});

type Step = {
  id: string;
  title: string;
  question: string;
  options: { value: string; label: string; desc?: string }[];
};

const STEPS: Step[] = [
  {
    id: "method",
    title: "Modo de preparo",
    question: "Como você costuma preparar seu café?",
    options: [
      { value: "espresso", label: "Espresso" },
      { value: "filter", label: "Coado / V60" },
      { value: "french_press", label: "Prensa francesa" },
      { value: "moka", label: "Moka italiana" },
    ],
  },
  {
    id: "intensity",
    title: "Intensidade",
    question: "Você prefere um café...",
    options: [
      { value: "light", label: "Leve e delicado" },
      { value: "balanced", label: "Equilibrado" },
      { value: "bold", label: "Encorpado e intenso" },
    ],
  },
  {
    id: "flavor",
    title: "Perfil de sabor",
    question: "Qual perfil te atrai mais?",
    options: [
      { value: "fruity", label: "Frutado e doce", desc: "Frutas vermelhas, cítricos" },
      { value: "chocolate", label: "Chocolate e nozes", desc: "Cremoso, achocolatado" },
      { value: "floral", label: "Floral e cítrico", desc: "Jasmim, bergamota" },
      { value: "caramel", label: "Caramelo e açúcar mascavo", desc: "Doce, melado" },
    ],
  },
  {
    id: "experience",
    title: "Sua jornada",
    question: "Quão familiar você é com cafés especiais?",
    options: [
      { value: "beginner", label: "Estou começando agora" },
      { value: "explorer", label: "Já experimentei alguns" },
      { value: "expert", label: "Sou apaixonado e exigente" },
    ],
  },
  {
    id: "frequency",
    title: "Consumo",
    question: "Quantas xícaras você toma por dia?",
    options: [
      { value: "1", label: "1 xícara" },
      { value: "2-3", label: "2-3 xícaras" },
      { value: "4+", label: "4 ou mais" },
    ],
  },
];

function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const { user } = useAuth();

  const { data: recommendations } = useQuery({
    queryKey: ["quiz-recs", answers],
    enabled: done,
    queryFn: async () => {
      const intensityMin = answers.intensity === "light" ? 1 : answers.intensity === "bold" ? 4 : 2;
      const intensityMax = answers.intensity === "light" ? 3 : answers.intensity === "bold" ? 5 : 4;
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, slug, name, short_description, price, compare_at_price, cover_url, score, badges, origin_region, origin_country, intensity, producers(name)",
        )
        .eq("status", "active")
        .gte("intensity", intensityMin)
        .lte("intensity", intensityMax)
        .limit(4);
      if (error) throw error;
      return data as unknown as ProductCardData[];
    },
  });

  const current = STEPS[step];
  const progress = ((step + (done ? 1 : 0)) / STEPS.length) * 100;

  const choose = (value: string) => {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    if (step + 1 >= STEPS.length) {
      setDone(true);
      // save (best-effort)
      supabase.from("quiz_responses").insert({
        user_id: user?.id ?? null,
        answers: next,
        recommended_product_ids: [],
      });
    } else {
      setStep(step + 1);
    }
  };

  if (done) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 md:px-6">
        <div className="text-center">
          <Sparkles className="mx-auto h-10 w-10 text-[var(--gold)]" />
          <p className="eyebrow mt-4">Seu perfil sensorial</p>
          <h1 className="mt-2 font-display text-4xl text-primary md:text-5xl">
            Selecionamos cafés perfeitos para você
          </h1>
          <div className="gold-divider mx-auto mt-3" />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Com base nas suas respostas, estes são os microlotes mais alinhados ao seu paladar.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(recommendations ?? []).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/catalogo" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground">
            Ver catálogo completo
          </Link>
          <button
            onClick={() => {
              setStep(0);
              setAnswers({});
              setDone(false);
            }}
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold uppercase tracking-wider text-primary"
          >
            Refazer quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 md:px-6">
      <div className="mb-8">
        <p className="eyebrow text-center">Quiz sensorial</p>
        <div className="mt-4 h-1 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Passo {step + 1} de {STEPS.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">{current.title}</p>
          <h2 className="mt-3 text-center font-display text-3xl text-primary md:text-4xl">{current.question}</h2>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {current.options.map((o) => (
              <button
                key={o.value}
                onClick={() => choose(o.value)}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition hover:border-[var(--gold)] hover:bg-[var(--sand)]"
              >
                <div>
                  <p className="font-display text-lg text-primary">{o.label}</p>
                  {o.desc && <p className="mt-1 text-xs text-muted-foreground">{o.desc}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-[var(--gold)]" />
              </button>
            ))}
          </div>

          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="mt-6 block w-full text-center text-xs text-muted-foreground hover:text-primary"
            >
              ← Voltar
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
