import { createFileRoute } from "@tanstack/react-router";
import { Check, Target } from "lucide-react";

import { flattenActivities, useStudentActivities } from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/objectifs")({
  head: () => ({
    meta: [
      { title: "Mes objectifs EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Objectifs de l'élève en EPS : prochains paliers de niveau à atteindre pour chaque compétence évaluée.",
      },
      { property: "og:title", content: "Mes objectifs EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Prochains paliers de niveau à atteindre, compétence par compétence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentObjectives,
});

function StudentObjectives() {
  const activities = useStudentActivities();
  const marks = flattenActivities(activities.data ?? []);
  const done = marks.filter((m) => m.levelPosition >= m.levelMax).length;

  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">
          {done} / {marks.length} compétences au niveau maximum
        </p>
        <h1 className="display-title text-4xl">Mes objectifs</h1>
      </header>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!activities.isLoading && marks.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Target className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Aucun objectif pour le moment.</p>
          <p className="text-sm text-muted-foreground">
            Tes objectifs se construisent à partir des niveaux attribués par ton professeur.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {marks.map((mark) => {
          const complete = mark.levelPosition >= mark.levelMax;
          return (
            <article
              key={mark.competencyId}
              className={`flex items-center gap-4 rounded-3xl border p-5 ${
                complete ? "border-primary/40 bg-primary/10" : "border-border bg-surface"
              }`}
            >
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                  complete
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {complete ? (
                  <Check className="size-5" />
                ) : (
                  <span className="font-mono text-xs">{mark.levelPosition + 1}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="mono-label text-muted-foreground">{mark.activityName}</p>
                <p className="truncate text-sm font-bold">{mark.competencyLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {complete
                    ? `Niveau maximum atteint — ${mark.levelLabel}`
                    : `Niveau ${mark.levelPosition}/${mark.levelMax} — viser le niveau ${
                        mark.levelPosition + 1
                      }`}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
