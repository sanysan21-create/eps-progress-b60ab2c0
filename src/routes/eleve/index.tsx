import { createFileRoute, Link } from "@tanstack/react-router";
import { LevelRing } from "@/components/eps/LevelRing";
import { LevelBars } from "@/components/eps/LevelBars";
import {
  student,
  studentActivities,
  studentObjectives,
  studentHistory,
  LEVEL_LABELS,
  type Level,
} from "@/data/demo";

export const Route = createFileRoute("/eleve/")({
  head: () => ({
    meta: [
      { title: "Profil élève — EPS Progress" },
      {
        name: "description",
        content:
          "Profil EPS de l'élève : niveau global sur 5, activités, compétences et objectifs du cycle.",
      },
      { property: "og:title", content: "Profil élève — EPS Progress" },
      {
        property: "og:description",
        content: "Niveau global sur 5, activités et objectifs de l'élève en EPS.",
      },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const top = studentActivities.slice(0, 2);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="mono-label inline-block rounded bg-surface-2 px-2 py-1 text-primary">
            Classe : {student.className}
          </div>
          <h1 className="display-title text-4xl">
            {student.firstName} {student.lastName}
          </h1>
        </div>
        <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2 ring-1 ring-border">
          <span className="display-title text-2xl text-primary">{student.initials}</span>
        </div>
      </header>

      <LevelRing level={student.globalLevel} score={student.globalScore} caption={student.trend} />

      <div className="grid grid-cols-3 gap-3 pt-4">
        {[
          { label: "Présence", value: `${student.attendance}%` },
          { label: "Évaluations", value: student.evaluations },
          { label: "Badges", value: student.badges },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 text-center">
            <div className="display-title text-2xl text-primary">{s.value}</div>
            <div className="mono-label mt-1 text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="display-title text-xl italic">Activités en cours</h2>
          <Link to="/eleve/activites" className="mono-label text-muted-foreground hover:text-primary">
            Voir tout
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {top.map((a) => (
            <article
              key={a.id}
              className="group rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="mono-label mb-1 text-primary">{a.cycle}</p>
                  <h3 className="display-title text-2xl italic">{a.name}</h3>
                </div>
                <LevelBars level={a.level} />
              </div>
              <div className="flex items-end justify-between">
                <p className="max-w-[200px] text-xs text-muted-foreground">{a.summary}</p>
                <span className="display-title text-4xl text-surface-2 transition-colors group-hover:text-primary">
                  {String(a.level).padStart(2, "0")}
                </span>
              </div>
              <p className="mono-label mt-3 text-muted-foreground">
                {LEVEL_LABELS[a.level as Level]}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-primary p-6 text-primary-foreground">
        <h2 className="display-title text-xl italic">Objectifs de la semaine</h2>
        <ul className="space-y-3">
          {studentObjectives.slice(0, 3).map((o) => (
            <li key={o.id} className="flex items-center gap-3 border-b border-background/10 pb-2">
              <div className="grid size-4 place-items-center rounded border-2 border-background">
                {o.done && <div className="size-2 rounded-full bg-background" />}
              </div>
              <span className="text-sm font-bold uppercase tracking-tight">{o.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="display-title text-xl italic">Dernière progression</h2>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <p className="mono-label text-primary">{studentHistory[0].date}</p>
          <p className="mt-2 font-bold">{studentHistory[0].title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{studentHistory[0].detail}</p>
          <Link
            to="/eleve/progression"
            className="mono-label mt-4 inline-block text-primary hover:underline"
          >
            Historique complet →
          </Link>
        </div>
      </section>
    </div>
  );
}
