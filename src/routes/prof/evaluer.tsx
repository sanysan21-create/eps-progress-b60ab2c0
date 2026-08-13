import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { classes, pupils, teacherActivities, LEVEL_LABELS, type Level } from "@/data/demo";

export const Route = createFileRoute("/prof/evaluer")({
  head: () => ({
    meta: [
      { title: "Évaluation rapide — EPS Progress" },
      {
        name: "description",
        content:
          "Évaluez toute une classe en quelques secondes : attribuez un niveau de 1 à 5 à chaque élève sur une compétence.",
      },
      { property: "og:title", content: "Évaluation rapide — EPS Progress" },
      {
        property: "og:description",
        content: "Attribuez un niveau de 1 à 5 à chaque élève, compétence par compétence.",
      },
    ],
  }),
  component: QuickEval,
});

function QuickEval() {
  const activity = teacherActivities[0]!;
  const [classId, setClassId] = useState(classes[0]!.id);
  const [competency, setCompetency] = useState(activity.competencies[0]!);
  const roster = pupils.filter((p) => p.classId === classId);
  const [marks, setMarks] = useState<Record<string, Level>>({});

  const evaluated = Object.keys(marks).length;

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Session du jour · {activity.name}</p>
        <h1 className="display-title text-3xl lg:text-4xl">Évaluation rapide</h1>
      </header>

      <div className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <p className="mono-label text-muted-foreground">Classe</p>
          <div className="flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClassId(c.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${
                  c.id === classId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="mono-label text-muted-foreground">Compétence</p>
          <div className="flex flex-wrap gap-2">
            {activity.competencies.map((c) => (
              <button
                key={c}
                onClick={() => setCompetency(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase ${
                  c === competency
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-bold uppercase">
          {evaluated} / {roster.length} élèves évalués
        </p>
        <button
          onClick={() => setMarks({})}
          className="mono-label text-muted-foreground hover:text-primary"
        >
          Réinitialiser
        </button>
      </div>

      <div className="space-y-3">
        {roster.map((p) => (
          <article
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-4">
              <div className="grid size-10 place-items-center rounded-xl bg-surface-2">
                {marks[p.id] ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <span className="display-title text-xs text-muted-foreground">
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold">{p.name}</p>
                <p className="mono-label text-muted-foreground">
                  {marks[p.id]
                    ? `${LEVEL_LABELS[marks[p.id] as Level]} · niveau ${marks[p.id]}`
                    : "Non évalué"}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {([1, 2, 3, 4, 5] as Level[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setMarks((m) => ({ ...m, [p.id]: l }))}
                  className={`size-9 rounded-lg text-xs font-bold transition-colors ${
                    marks[p.id] === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <button className="w-full rounded-2xl bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground">
        Enregistrer la session (démo)
      </button>
    </div>
  );
}
