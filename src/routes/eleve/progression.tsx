import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, ChevronLeft, Flame, Target } from "lucide-react";

import { ActivityIconBadge } from "@/components/eps/ActivityIcon";
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

type StudentActivity = ReturnType<typeof useStudentActivities>["data"] extends
  | (infer T)[]
  | undefined
  ? T
  : never;

/** Carte d'activité cliquable : ouvre le détail des niveaux de compétences. */
function ActivityPanel({
  activity,
  progress,
  open,
  onToggle,
}: {
  activity: StudentActivity;
  progress: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2/60"
      >
        <ActivityIconBadge name={activity.activity_name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{activity.activity_name}</span>
          <span className="mono-label text-muted-foreground">
            Progression {progress}% · {activity.competencies.length} compétence
            {activity.competencies.length > 1 ? "s" : ""}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-border/60 px-5 py-4">
            <p className="mono-label text-primary">Niveaux de compétences</p>
            {activity.competencies.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold">{c.label}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    Niveau {c.level_position}/{c.level_max} · {c.level_label}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                    style={{
                      width: `${c.level_max > 0 ? (c.level_position / c.level_max) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={onToggle}
              className="mono-label flex items-center gap-1.5 text-muted-foreground hover:text-primary"
            >
              <ChevronLeft className="size-3.5" /> Revenir à la liste des activités
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function StudentProgress() {
  const [openActivity, setOpenActivity] = useState<string | null>(null);
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
