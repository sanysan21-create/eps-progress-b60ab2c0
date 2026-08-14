import { createFileRoute } from "@tanstack/react-router";

import { ThemeSetting } from "@/components/eps/ThemeSetting";

export const Route = createFileRoute("/eleve/parametres")({
  head: () => ({
    meta: [
      { title: "Mes paramètres — EPS Progress" },
      {
        name: "description",
        content:
          "Réglages personnels de l'élève : choix de l'apparence claire, sombre ou automatique de EPS Progress.",
      },
      { property: "og:title", content: "Mes paramètres — EPS Progress" },
      {
        property: "og:description",
        content: "Choisis l'apparence de ton espace élève : sombre, claire ou automatique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentSettings,
});

function StudentSettings() {
  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <p className="mono-label text-primary">Réglages personnels</p>
        <h1 className="display-title text-3xl leading-tight">Paramètres</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🌗 Apparence
        </h2>
        <ThemeSetting />
      </section>
    </div>
  );
}
