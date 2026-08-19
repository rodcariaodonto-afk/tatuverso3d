import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/envios")({
  head: () => ({
    meta: [
      { title: "Envios e entregas — TatuVerso3D" },
      { name: "description", content: "Como enviamos seus produtos impressos em 3D para todo o Brasil, prazos e rastreio." },
      { property: "og:title", content: "Envios e entregas — TatuVerso3D" },
      { property: "og:description", content: "Como enviamos seus produtos impressos em 3D para todo o Brasil, prazos e rastreio." },
      { property: "og:url", content: "/envios" },
    ],
    links: [{ rel: "canonical", href: "/envios" }],
  }),
  component: Page,
});

function Page() {
  return <InfoPage slug="envios" />;
}
