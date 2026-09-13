import { createFileRoute } from "@tanstack/react-router";


import { RewardThemeSetting } from "@/components/eps/RewardThemeSetting";
import { ProfileTitlePicker } from "@/components/eps/ProfileTitlePicker";

export const Route = createFileRoute("/eleve/parametres")({
  head: () => ({
    meta: [
      { title: "Mes paramètres — EPS Progress" },
      {
        name: "description",
        content:
          "Réglages personnels de l'élève : apparence claire, sombre ou automatique, thèmes de récompense et titre de profil EPS Progress.",
      },
      { property: "og:title", content: "Mes paramètres — EPS Progress" },
      {
        property: "og:description",
        content: "Choisis ton apparence, tes thèmes de récompense et ton titre de profil.",
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
          🎨 Apparence débloquée
        </h2>
        <RewardThemeSetting />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          ✨ Mon titre de profil
        </h2>
        <ProfileTitlePicker />
      </section>

    </div>
  );
}
