import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { teacherActivities } from "@/data/demo";

export const Route = createFileRoute("/_authenticated/prof/activites")({
  head: () => ({
    meta: [
      { title: "Activités et compétences — EPS Progress" },
      {
        name: "description",
        content:
          "Créez des activités EPS, définissez les compétences et rédigez les 5 niveaux de maîtrise attendus.",
      },
      { property: "og:title", content: "Activités et compétences — EPS Progress" },
      {
        property: "og:description",
        content: "Configurateur d'activités, de compétences et des 5 niveaux de maîtrise.",
      },
    ],
  }),
  component: TeacherActivities,
});

function TeacherActivities() {
  const [activeId, setActiveId] = useState(teacherActivities[0]!.id);
  const active = teacherActivities.find((a) => a.id === activeId)!;

  return (
    <div className="animate-slide-up space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-primary">Référentiel EPS</p>
          <h1 className="display-title text-3xl lg:text-4xl">Activités & compétences</h1>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground">
          <Plus className="size-3.5" /> Nouvelle activité
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {teacherActivities.map((a) => (
          <button
            key={a.id}
            onClick={() => setActiveId(a.id)}
            className={`rounded-full border px-4 py-2 text-xs font-bold uppercase ${
              a.id === activeId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="display-title text-xl italic">Compétences évaluées</h2>
        <div className="flex flex-wrap gap-3">
          {active.competencies.map((c) => (
            <span
              key={c}
              className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold"
            >
              {c}
            </span>
          ))}
          <button className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-primary">
            + Ajouter une compétence
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-2/40 p-6 lg:p-8">
        <h2 className="display-title mb-6 text-xl">
          Configurateur de niveaux : {active.name}
        </h2>
        <div className="space-y-4">
          {active.levels.map((l) => (
            <div key={l.level} className="flex items-center gap-4">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-primary"
                style={{ backgroundColor: `color-mix(in oklab, var(--primary) ${l.level * 16}%, transparent)` }}
              >
                {l.level}
              </span>
              <div className="flex-1 rounded-xl border border-border bg-background p-3">
                <p className="mono-label text-primary">{l.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l.descriptor}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
