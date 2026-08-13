import { createFileRoute } from "@tanstack/react-router";
import { Info, Mail, Code2, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/prof/info")({
  head: () => ({
    meta: [
      { title: "Informations — EPS Progress" },
      {
        name: "description",
        content:
          "Informations sur l'application EPS Progress : version, créateur et contact.",
      },
      { property: "og:title", content: "Informations — EPS Progress" },
      {
        property: "og:description",
        content: "Version, créateur et contact de l'application EPS Progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherInfoPage,
});

function TeacherInfoPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-muted-foreground">À propos</p>
        <h1 className="display-title text-3xl lg:text-4xl">Informations</h1>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10">
            <Info className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="display-title text-2xl">EPS Progress</h2>
            <p className="mono-label text-muted-foreground">Application éducative EPS</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Code2 className="size-4" />
              <span className="mono-label text-xs font-bold uppercase">Version</span>
            </div>
            <p className="mt-3 text-2xl font-bold">1.0</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-4" />
              <span className="mono-label text-xs font-bold uppercase">Création</span>
            </div>
            <p className="mt-3 text-lg font-bold">Sany Mouhamad</p>
          </div>

          <a
            href="mailto:sanysan21@gmail.com"
            className="group rounded-2xl border border-border bg-surface-2 p-5 transition-colors hover:border-primary/50 hover:bg-surface"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" />
              <span className="mono-label text-xs font-bold uppercase">Contact</span>
            </div>
            <p className="mt-3 break-all text-sm font-semibold text-foreground group-hover:text-primary">
              sanysan21@gmail.com
            </p>
          </a>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6 lg:p-8">
        <h3 className="display-title text-xl">Mentions</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          EPS Progress est conçue pour accompagner les enseignants d'éducation physique et sportive
          et leurs élèves dans le suivi personnalisé des compétences, de l'implication et des
          réussites. Aucun classement n'est affiché : la progression reste individuelle et
          valorisante.
        </p>
      </section>
    </div>
  );
}
