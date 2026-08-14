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

const studentPills = ["5 niveaux", "Progression", "Objectifs", "Réussites"];
const teacherPills = ["Classes", "Élèves", "Évaluations", "Compétences", "Progression"];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
        <header className="space-y-5">
          <p className="mono-label text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Éducation physique et sportive
          </p>
          <h1 className="display-title text-6xl italic leading-[0.9] text-primary sm:text-8xl">
            EPS PROGRESS
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Le suivi des compétences EPS.
            <br className="hidden sm:block" />
            Une progression visible, des objectifs clairs — pour l'élève comme pour l'enseignant.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            to="/eleve"
            className="group flex flex-col rounded-3xl border border-border bg-surface p-8 transition-all hover:border-primary/60 hover:bg-surface-2"
          >
            <p className="mono-label text-xs font-semibold uppercase tracking-widest text-primary">
              Espace élève
            </p>
            <h2 className="display-title mt-3 text-3xl italic text-card-foreground sm:text-4xl">
              Ton parcours, tes progrès.
            </h2>
            <p className="mt-3 flex-grow text-sm leading-relaxed text-muted-foreground">
              Consulte tes compétences, ton niveau de maîtrise et ta progression. Retrouve ton
              historique, tes objectifs et tes réussites pour visualiser tes progrès au fil des
              activités.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {studentPills.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            <span className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase text-primary">
              Entrer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            to="/prof"
            className="group flex flex-col rounded-3xl bg-primary p-8 text-primary-foreground transition-all hover:bg-primary/95"
          >
            <p className="mono-label text-xs font-semibold uppercase tracking-widest opacity-70">
              Espace enseignant
            </p>
            <h2 className="display-title mt-3 text-3xl italic sm:text-4xl">
              Pilotez les progrès de vos élèves.
            </h2>
            <p className="mt-3 flex-grow text-sm leading-relaxed opacity-90">
              Créez vos classes, évaluez les compétences et suivez la progression de chaque élève.
              Une vision claire des niveaux, des évaluations et des évolutions pour faciliter le
              pilotage pédagogique.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {teacherPills.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            <span className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase">
              Entrer <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

      </div>
    </div>
  );
}
