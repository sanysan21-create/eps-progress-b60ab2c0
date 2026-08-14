import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Flame } from "lucide-react";

import { ActivityEmoji } from "@/components/eps/ActivityEmoji";
import { RankJourney } from "@/components/eps/RankJourney";
import { computeProgression } from "@/lib/progression";
import { goal as goalByCode } from "@/lib/engagement";
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

type SubTab = "competences" | "objectifs";

function StudentProgress() {
  const activities = useStudentActivities();
  const engagement = useStudentEngagement();
  const strengths = useMyStrengths();
  const goal = useMyGoal();

  const data = activities.data ?? [];
  const marks = flattenActivities(data);
  const global = averageProgress(marks);

  const [activityId, setActivityId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("competences");

  const selected = data.find((a) => a.activity_id === activityId) ?? data[0] ?? null;
  const selectedMarks = selected ? flattenActivities([selected]) : [];
  const selectedProgress = selected ? (averageProgress(selectedMarks) ?? 0) : 0;
  const myGoal = goal.data ? goalByCode(goal.data) : undefined;

  const journey = computeProgression({
    marks,
    engagement: engagement.data ?? [],
    strengths: strengths.data ?? [],
    goal: goal.data ?? null,
  });

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

          {/* Choix de l'activité, puis sous-onglets Compétences / Objectifs */}
          <Section title="🏅 Mes activités">
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
              {data.map((activity) => {
                const active = selected?.activity_id === activity.activity_id;
                return (
                  <button
                    key={activity.activity_id}
                    type="button"
                    onClick={() => setActivityId(activity.activity_id)}
                    aria-pressed={active}
                    className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-surface text-foreground/80 hover:border-primary/50"
                    }`}
                  >
                    <ActivityEmoji name={activity.activity_name} className="text-2xl" />
                    {activity.activity_name}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  <ActivityEmoji name={selected.activity_name} className="text-4xl" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{selected.activity_name}</p>
                    <p className="mono-label text-muted-foreground">
                      Progression {selectedProgress}% · {selectedMarks.length} compétence
                      {selectedMarks.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Sous-onglets simples */}
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
                  {(
                    [
                      ["competences", "Compétences"],
                      ["objectifs", "Objectifs & conseils"],
                    ] as [SubTab, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSubTab(key)}
                      aria-pressed={subTab === key}
                      className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-tight transition-colors ${
                        subTab === key
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {subTab === "competences" && (
                  <div className="space-y-4">
                    <p className="mono-label text-primary">Mes compétences travaillées</p>
                    {selected.competencies.map((c) => (
                      <div key={c.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold">{c.label}</span>
                          <span className="shrink-0 font-mono text-muted-foreground">
                            Niveau {c.level_position}/{c.level_max} · {c.level_label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: c.level_max }).map((_, index) => (
                            <span
                              key={index}
                              className={`h-2 flex-1 rounded-full ${
                                index < c.level_position ? "bg-primary" : "bg-surface-2"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {subTab === "objectifs" && (
                  <div className="space-y-4">
                    {myGoal && (
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                        <p className="mono-label text-primary">🎯 Mon objectif</p>
                        <p className="mt-1 text-sm font-bold">
                          {myGoal.emoji} {myGoal.label}
                        </p>
                      </div>
                    )}

                    {selectedMarks.map((mark) => {
                      const complete = mark.levelPosition >= mark.levelMax;
                      return (
                        <article key={mark.competencyId} className="flex items-start gap-3">
                          <span
                            className={`grid size-9 shrink-0 place-items-center rounded-2xl ${
                              complete
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface-2 text-muted-foreground"
                            }`}
                          >
                            {complete ? (
                              <Check className="size-4" />
                            ) : (
                              <span className="font-mono text-xs">{mark.levelPosition + 1}</span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
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
                                <p className="mono-label text-primary">
                                  💬 Conseil de ton enseignant
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                                  {mark.levelTip}
                                </p>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}

                    {!myGoal && selectedMarks.every((m) => !m.progressTip && !m.levelTip) && (
                      <p className="text-xs text-muted-foreground">
                        Aucun conseil pour cette activité pour l'instant.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
