import { createFileRoute } from "@tanstack/react-router";
import { Check, Flame, Target } from "lucide-react";

import { RankJourney } from "@/components/eps/RankJourney";
import { computeProgression } from "@/lib/progression";
import {
  averageProgress,
  flattenActivities,
  useMyGoal,
  useMyStrengths,
  useStudentActivities,
  useStudentEngagement,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/progression")({
  head: () => ({
    meta: [
      { title: "Mes progrès — EPS Progress" },
      {
        name: "description",
        content:
          "Toute la progression de l'élève réunie : pourcentage global, parcours, activités, compétences et prochains objectifs.",
      },
      { property: "og:title", content: "Mes progrès — EPS Progress" },
      {
        property: "og:description",
        content: "Progression globale, activités travaillées, compétences et prochains objectifs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProgress,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function StudentProgress() {
  const activities = useStudentActivities();
  const engagement = useStudentEngagement();
  const strengths = useMyStrengths();
  const goal = useMyGoal();

  const data = activities.data ?? [];
  const marks = flattenActivities(data);
  const global = averageProgress(marks);
  const done = marks.filter((m) => m.levelPosition >= m.levelMax).length;

  const journey = computeProgression({
    marks,
    engagement: engagement.data ?? [],
    strengths: strengths.data ?? [],
    goal: goal.data ?? null,
  });

  const perActivity = data.map((activity) => ({
    name: activity.activity_name,
    value: averageProgress(flattenActivities([activity])) ?? 0,
  }));

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <p className="mono-label text-primary">Tout ton suivi au même endroit</p>
        <h1 className="display-title text-4xl">Mes progrès</h1>
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
          {/* Pourcentage de progression, calculé sur les niveaux réellement attribués */}
          <Section title="📈 Ma progression">
            <div className="rounded-3xl border border-border bg-surface p-6">
              <p className="display-title text-5xl text-primary">{global}%</p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                  style={{ width: `${global}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Moyenne de tes niveaux sur {marks.length} compétence{marks.length > 1 ? "s" : ""}{" "}
                évaluée{marks.length > 1 ? "s" : ""}. Ce repère ne concerne que toi.
              </p>
            </div>
          </Section>

          {/* Étape du parcours personnel (aucun classement) */}
          <Section title="🚀 Mon parcours">
            <RankJourney state={journey} />
          </Section>

          <Section title="🎯 Mes compétences travaillées">
            <div className="space-y-3">
              {data.map((activity) => (
                <ActivityPanel
                  key={activity.activity_id}
                  activity={activity}
                  progress={
                    perActivity.find((a) => a.name === activity.activity_name)?.value ?? 0
                  }
                  open={openActivity === activity.activity_id}
                  onToggle={() =>
                    setOpenActivity((current) =>
                      current === activity.activity_id ? null : activity.activity_id,
                    )
                  }
                />
              ))}
            </div>
          </Section>

          {/* Prochains paliers à atteindre, compétence par compétence */}
          <Section title="🧭 Mes objectifs">
            <p className="mono-label text-muted-foreground">
              {done} / {marks.length} compétences au niveau maximum
            </p>
            <div className="space-y-3">
              {marks.map((mark) => {
                const complete = mark.levelPosition >= mark.levelMax;
                return (
                  <article
                    key={mark.competencyId}
                    className={`flex items-start gap-4 rounded-3xl border p-5 ${
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
                      <p className="text-sm font-bold">{mark.competencyLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {complete
                          ? `Niveau maximum atteint — ${mark.levelLabel}`
                          : `Niveau ${mark.levelPosition}/${mark.levelMax} — viser le niveau ${
                              mark.levelPosition + 1
                            }`}
                      </p>
                      {mark.progressTip && (
                        <p className="mt-1 text-xs font-semibold text-primary">
                          {mark.progressTip}
                        </p>
                      )}
                      {mark.levelTip && (
                        <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                          <p className="mono-label text-primary">💡 Conseil de ton enseignant</p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                            {mark.levelTip}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>
        </>
      )}

      {marks.length === 0 && !activities.isLoading && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Target className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Aucun objectif pour le moment.</p>
          <p className="text-sm text-muted-foreground">
            Tes objectifs se construisent à partir des niveaux attribués par ton professeur.
          </p>
        </div>
      )}
    </div>
  );
}
