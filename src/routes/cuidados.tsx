import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/cuidados")({
  head: () => ({
    meta: [
      { title: "Cuidados com os produtos — TatuVerso3D" },
      { name: "description", content: "Como cuidar, limpar e conservar produtos impressos em 3D." },
      { property: "og:title", content: "Cuidados com os produtos — TatuVerso3D" },
      { property: "og:description", content: "Como cuidar, limpar e conservar produtos impressos em 3D." },
      { property: "og:url", content: "/cuidados" },
    ],
    links: [{ rel: "canonical", href: "/cuidados" }],
  }),
  component: Page,
});

function Page() {
  return <InfoPage slug="cuidados" />;
}
