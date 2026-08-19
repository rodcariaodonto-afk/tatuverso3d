import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/marketing/InfoPage";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Perguntas frequentes — TatuVerso3D" },
      { name: "description", content: "Dúvidas sobre prazos de produção, personalização, envios e cuidados com produtos impressos em 3D." },
      { property: "og:title", content: "Perguntas frequentes — TatuVerso3D" },
      { property: "og:description", content: "Dúvidas sobre prazos de produção, personalização, envios e cuidados com produtos impressos em 3D." },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
  }),
  component: Page,
});

function Page() {
  return <InfoPage slug="faq" />;
}
