import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { flattenActivities, useStudentActivities } from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/reussites")({
  head: () => ({
    meta: [
      { title: "Mes réussites EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Réussites de l'élève en EPS : compétences dont le niveau maximum a été validé par l'enseignant.",
      },
      { property: "og:title", content: "Mes réussites EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Compétences dont le niveau maximum a été validé par l'enseignant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAchievements,
});

function StudentAchievements() {
  const activities = useStudentActivities();
  const marks = flattenActivities(activities.data ?? []);
  const unlocked = marks.filter((m) => m.levelPosition >= m.levelMax);

  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">{unlocked.length} réussite(s) validée(s)</p>
        <h1 className="display-title text-4xl">Mes réussites</h1>
      </header>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!activities.isLoading && unlocked.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Trophy className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Aucune réussite débloquée pour l'instant.</p>
          <p className="text-sm text-muted-foreground">
            Atteins le niveau maximum d'une compétence pour débloquer ta première réussite.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {unlocked.map((mark) => (
          <article
            key={mark.competencyId}
            className="flex items-center gap-4 rounded-3xl border border-primary/30 bg-primary/5 p-5"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <Trophy className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase italic">{mark.competencyLabel}</p>
              <p className="text-xs text-muted-foreground">{mark.activityName}</p>
              <p className="mono-label mt-1 text-primary">
                Niveau {mark.levelPosition}/{mark.levelMax} — {mark.levelLabel}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
