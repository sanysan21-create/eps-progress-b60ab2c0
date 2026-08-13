import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { studentObjectives } from "@/data/demo";

export const Route = createFileRoute("/eleve/objectifs")({
  head: () => ({
    meta: [
      { title: "Mes objectifs EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Objectifs personnalisés fixés par l'enseignant d'EPS : défis en cours et objectifs atteints.",
      },
      { property: "og:title", content: "Mes objectifs EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Défis en cours et objectifs atteints, activité par activité.",
      },
    ],
  }),
  component: StudentObjectives,
});

function StudentObjectives() {
  const done = studentObjectives.filter((o) => o.done).length;

  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">
          {done} / {studentObjectives.length} atteints
        </p>
        <h1 className="display-title text-4xl">Mes objectifs</h1>
      </header>

      <div className="space-y-3">
        {studentObjectives.map((o) => (
          <article
            key={o.id}
            className={`flex items-center gap-4 rounded-3xl border p-5 ${
              o.done ? "border-primary/40 bg-primary/10" : "border-border bg-surface"
            }`}
          >
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                o.done ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}
            >
              {o.done ? <Check className="size-5" /> : <span className="font-mono text-xs">···</span>}
            </div>
            <div>
              <p className="mono-label text-muted-foreground">{o.activity}</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-tight">{o.label}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
