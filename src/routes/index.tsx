import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EPS Progress — suivi des compétences en EPS" },
      {
        name: "description",
        content:
          "EPS Progress : le suivi visuel des compétences EPS. Espace élève mobile et espace enseignant pour évaluer sur 5 niveaux.",
      },
      { property: "og:title", content: "EPS Progress — suivi des compétences en EPS" },
      {
        property: "og:description",
        content:
          "Suivi visuel des compétences EPS : niveau sur 5, progression, objectifs et réussites.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
        <header className="space-y-4">
          <p className="mono-label text-muted-foreground">Éducation physique et sportive</p>
          <h1 className="display-title text-5xl italic leading-[0.9] text-primary sm:text-7xl">
            EPS Progress
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Le suivi des compétences EPS, enfin motivant. Cinq niveaux de maîtrise, une progression
            visible, des objectifs clairs — pour l'élève comme pour l'enseignant.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/eleve"
            className="group rounded-3xl border border-border bg-surface p-8 transition-colors hover:border-primary/60"
          >
            <p className="mono-label text-primary">Pensé pour le téléphone</p>
            <h2 className="display-title mt-3 text-3xl italic">Espace élève</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Profil, activités, compétences, niveau sur 5, historique, objectifs et réussites.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase text-primary">
              Entrer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/prof"
            className="group rounded-3xl bg-primary p-8 text-primary-foreground"
          >
            <p className="mono-label opacity-70">Poste de pilotage</p>
            <h2 className="display-title mt-3 text-3xl italic">Espace enseignant</h2>
            <p className="mt-3 text-sm opacity-80">
              Classes, élèves, activités, compétences, 5 niveaux, évaluation et progression.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase">
              Entrer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <p className="mono-label text-muted-foreground">
          Version de démonstration · données fictives
        </p>
      </div>
    </div>
  );
}
