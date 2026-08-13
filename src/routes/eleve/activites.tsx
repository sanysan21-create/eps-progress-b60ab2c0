import { createFileRoute } from "@tanstack/react-router";
import { LevelBars } from "@/components/eps/LevelBars";
import { studentActivities, LEVEL_LABELS, type Level } from "@/data/demo";

export const Route = createFileRoute("/eleve/activites")({
  head: () => ({
    meta: [
      { title: "Mes activités et compétences — EPS Progress" },
      {
        name: "description",
        content:
          "Détail des activités EPS de l'élève : compétences évaluées et niveau atteint sur 5 pour chacune.",
      },
      { property: "og:title", content: "Mes activités et compétences — EPS Progress" },
      {
        property: "og:description",
        content: "Compétences évaluées et niveau atteint sur 5 pour chaque activité EPS.",
      },
    ],
  }),
  component: StudentActivities,
});

function StudentActivities() {
  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">Cycle 2025 / 2026</p>
        <h1 className="display-title text-4xl">Mes activités</h1>
      </header>

      {studentActivities.map((a) => (
        <article key={a.id} className="rounded-3xl border border-border bg-surface p-5">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="mono-label mb-1 text-primary">{a.cycle}</p>
              <h2 className="display-title text-2xl italic">{a.name}</h2>
              <p className="mono-label mt-1 text-muted-foreground">
                Niveau {a.level} · {LEVEL_LABELS[a.level as Level]}
              </p>
            </div>
            <LevelBars level={a.level} />
          </div>

          <div className="space-y-4">
            {a.competencies.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono text-muted-foreground">Niv. {c.level}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
