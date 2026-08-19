import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/trocas")({
  head: () => ({
    meta: [
      { title: "Trocas e devoluções — TatuVerso3D" },
      { name: "description", content: "Política de trocas e devoluções da TatuVerso3D." },
      { property: "og:title", content: "Trocas e devoluções — TatuVerso3D" },
      { property: "og:description", content: "Política de trocas e devoluções da TatuVerso3D." },
      { property: "og:url", content: "/trocas" },
    ],
    links: [{ rel: "canonical", href: "/trocas" }],
  }),
  component: Page,
});

function Page() {
  return <InfoPage slug="trocas" />;
}
