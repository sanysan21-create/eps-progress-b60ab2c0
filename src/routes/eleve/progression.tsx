import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flame } from "lucide-react";

import { ActivityEmoji } from "@/components/eps/ActivityEmoji";
import { RankJourney } from "@/components/eps/RankJourney";
import { computeProgression } from "@/lib/progression";
import { goal as goalByCode } from "@/lib/engagement";
import { AFL_HINTS, groupByAfl } from "@/lib/afl";

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

  /** Prochaine compétence à acquérir : niveau non maximal le moins avancé. */
  const nextCompetency =
    selectedMarks
      .filter((mark) => mark.levelPosition < mark.levelMax)
      .sort(
        (a, b) =>
          a.levelPosition / a.levelMax - b.levelPosition / b.levelMax ||
          a.levelPosition - b.levelPosition,
      )[0] ?? null;


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
                  <div className="space-y-5">
                    <p className="mono-label text-primary">Mes compétences travaillées</p>
                    {groupByAfl(selected.competencies, (c) => c.afl).map((group) => (
                      <div key={group.afl} className="space-y-3">
                        <div className="flex items-baseline gap-2">
                          <span className="rounded-lg bg-primary/15 px-2 py-1 font-mono text-[0.7rem] font-bold uppercase text-primary">
                            {group.afl}
                          </span>
                          <span className="text-[0.7rem] text-muted-foreground">
                            {AFL_HINTS[group.afl]}
                          </span>
                        </div>
                        {group.items.map((c) => (
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

                    {groupByAfl(selected.competencies, (c) => c.afl).map((group) => {
                      const done = group.items.filter(
                        (c) => c.level_position >= c.level_max,
                      ).length;
                      const groupProgress = Math.round(
                        (group.items.reduce(
                          (sum, c) =>
                            sum + (c.level_max > 0 ? (c.level_position / c.level_max) * 100 : 0),
                          0,
                        ) /
                          group.items.length) *
                          1,
                      );
                      return (
                        <details
                          key={group.afl}
                          open
                          className="group rounded-2xl border border-border bg-surface-2/40 px-4 py-3"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold">
                                🎯 {group.afl} — {AFL_HINTS[group.afl]}
                              </p>
                              <p className="mono-label text-muted-foreground">
                                {group.items.length} compétence
                                {group.items.length > 1 ? "s" : ""} · {done} acquise
                                {done > 1 ? "s" : ""} · {groupProgress}%
                              </p>
                            </div>
                            <span
                              className="shrink-0 text-xs text-muted-foreground transition-transform group-open:rotate-180"
                              aria-hidden
                            >
                              ▼
                            </span>
                          </summary>

                          <div className="mt-3 space-y-3">
                            {group.items.map((c) => {
                              const percent =
                                c.level_max > 0
                                  ? Math.round((c.level_position / c.level_max) * 100)
                                  : 0;
                              const mastered = c.level_position >= c.level_max;
                              const advice = c.next_level_tip ?? c.level_tip ?? c.progress_tip;
                              return (
                                <article
                                  key={c.id}
                                  className="space-y-2 rounded-xl border border-border bg-surface p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-bold">{c.label}</p>
                                    <span className="shrink-0 font-mono text-[0.7rem] text-muted-foreground">
                                      {percent}%
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Niveau {c.level_position}/{c.level_max} — {c.level_label}
                                  </p>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                                    <div
                                      className="h-full rounded-full bg-primary"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>

                                  {mastered ? (
                                    <p className="text-xs font-bold text-primary">
                                      🏆 Compétence acquise !
                                    </p>
                                  ) : (
                                    <p className="text-xs">
                                      <span className="mono-label text-primary">
                                        Prochain niveau
                                      </span>{" "}
                                      <span className="font-semibold">
                                        Niveau {c.level_position + 1}
                                        {c.next_level_label ? ` — ${c.next_level_label}` : ""}
                                      </span>
                                    </p>
                                  )}

                                  <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2">
                                    <p className="mono-label text-primary">
                                      💬 Conseil du professeur
                                    </p>
                                    {advice ? (
                                      <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                                        {advice}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-xs italic text-muted-foreground">
                                        Aucun conseil renseigné pour l'instant.
                                      </p>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
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
