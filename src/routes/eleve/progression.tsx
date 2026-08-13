import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";

import {
  averageProgress,
  flattenActivities,
  useStudentActivities,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/progression")({
  head: () => ({
    meta: [
      { title: "Ma progression — EPS Progress" },
      {
        name: "description",
        content:
          "Progression de l'élève en EPS : niveau atteint par activité et par compétence évaluée.",
      },
      { property: "og:title", content: "Ma progression — EPS Progress" },
      {
        property: "og:description",
        content: "Niveau atteint par activité et par compétence évaluée.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProgress,
});

function StudentProgress() {
  const activities = useStudentActivities();
  const data = activities.data ?? [];
  const marks = flattenActivities(data);
  const global = averageProgress(marks);

  const perActivity = data.map((activity) => {
    const rows = flattenActivities([activity]);
    return { name: activity.activity_name, value: averageProgress(rows) ?? 0 };
  });

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Niveaux réellement attribués</p>
        <h1 className="display-title text-4xl">Ma progression</h1>
      </header>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!activities.isLoading && marks.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Flame className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Pas encore de progression à afficher.</p>
          <p className="text-sm text-muted-foreground">
            Elle apparaîtra dès la première évaluation de ton professeur.
          </p>
        </div>
      )}

      {marks.length > 0 && (
        <>
          <section className="rounded-3xl border border-border bg-surface p-6 text-center">
            <p className="mono-label text-muted-foreground">Progression globale</p>
            <p className="display-title text-5xl text-primary">{global}%</p>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-5">
            <div className="flex h-44 items-end gap-3">
              {perActivity.map((a) => (
                <div key={a.name} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[10px] text-primary">{a.value}%</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-primary/80"
                      style={{ height: `${a.value}%` }}
                    />
                  </div>
                  <span className="mono-label truncate text-muted-foreground">{a.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="display-title text-xl italic">Détail par compétence</h2>
            <div className="space-y-3">
              {marks.map((mark) => (
                <div
                  key={mark.competencyId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="mono-label text-muted-foreground">{mark.activityName}</p>
                    <p className="truncate text-sm font-semibold">{mark.competencyLabel}</p>
                  </div>
                  <span className="mono-label shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                    Niveau {mark.levelPosition}/{mark.levelMax} — {mark.levelLabel}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
