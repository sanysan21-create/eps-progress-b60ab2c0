import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AchievementBadges } from "@/components/eps/AchievementBadges";
import { AchievementDetailDialog } from "@/components/eps/AchievementDetailDialog";
import { MedalBadge } from "@/components/eps/MedalBadge";
import { computeMedalProgress, highestMedal, MEDAL_ORDER } from "@/lib/medals";
import { useMyAchievements } from "@/hooks/use-student-profile";
import type { StudentAchievementView } from "@/lib/achievements.functions";

export const Route = createFileRoute("/eleve/reussites")({
  head: () => ({
    meta: [
      { title: "Mes réussites EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Parcours bronze, argent et or : suis les réussites obtenues et celles qu'il te reste à valider pour débloquer chaque médaille.",
      },
      { property: "og:title", content: "Mes réussites EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Chaque médaille se débloque avec 5 réussites de son parcours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAchievements,
});

function StudentAchievements() {
  const achievements = useMyAchievements();
  const list = achievements.data ?? [];

  const progress = computeMedalProgress(list);
  const best = highestMedal(progress);
  const unclassified = list.filter((item) => !item.medal_type);

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-3xl leading-tight">Mes réussites</h1>
        <p className="text-sm text-muted-foreground">
          Trois parcours, trois médailles : 5 réussites suffisent pour chaque médaille.
        </p>
      </header>

      {/* Médaille la plus élevée débloquée */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🎖️ Ma médaille
        </h2>
        <div className="flex items-center gap-4 rounded-3xl border border-primary/40 bg-primary/10 p-6">
          {best ? (
            <>
              <MedalBadge code={best} size={80} />
              <div>
                <p className="text-sm font-bold">
                  🎉 Médaille {progress.find((item) => item.code === best)?.label} obtenue !
                </p>
                <p className="text-xs text-muted-foreground">
                  Débloquée grâce aux réussites validées par ton enseignant.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune médaille débloquée pour le moment. Valide 5 réussites du parcours Bronze pour
              obtenir ta première médaille.
            </p>
          )}
        </div>
      </section>

      {achievements.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {/* Parcours Bronze → Argent → Or */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🏅 Mes parcours
        </h2>

        {MEDAL_ORDER.map((code) => {
          const step = progress.find((item) => item.code === code)!;
          const items = list.filter((item) => item.medal_type === code);
          const ratio = step.need > 0 ? Math.min(100, (step.earnedCount / step.need) * 100) : 0;
          const remaining = Math.max(0, step.need - step.earnedCount);

          return (
            <div key={code} className="space-y-3 rounded-3xl border border-border bg-surface p-5">
              <div className="flex items-center gap-3">
                <MedalBadge code={code} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base uppercase tracking-wide">
                    {step.emoji} {step.label}
                  </p>
                  <p className="mono-label text-muted-foreground">
                    {step.earnedCount} / {step.need} réussites
                  </p>
                </div>
                {step.obtained && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase text-primary">
                    Obtenue
                  </span>
                )}
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                  style={{ width: `${ratio}%` }}
                />
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ton enseignant n'a pas encore proposé de réussites pour ce parcours.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-start gap-2 text-sm ${
                        item.earned ? "" : "text-muted-foreground"
                      }`}
                    >
                      <span aria-hidden className="mt-0.5">
                        {item.earned ? "✓" : "○"}
                      </span>
                      <span className="min-w-0">
                        {item.is_required && <span aria-hidden>⭐ </span>}
                        {item.icon} {item.name}
                        {item.is_required && (
                          <span className="mono-label ml-1 text-primary">Obligatoire</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {step.obtained ? (
                <p className="text-sm font-semibold text-primary">
                  🎉 Médaille {step.label} obtenue !
                </p>
              ) : (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {remaining > 0 && (
                    <p>
                      Encore {remaining} réussite{remaining > 1 ? "s" : ""} pour obtenir la médaille{" "}
                      {step.label}.
                    </p>
                  )}
                  {step.missingRequired > 0 && (
                    <p>
                      Il te manque {step.missingRequired} réussite
                      {step.missingRequired > 1 ? "s" : ""} obligatoire
                      {step.missingRequired > 1 ? "s" : ""} ⭐.
                    </p>
                  )}
                  {step.conditionsMet && !step.previousObtained && (
                    <p>
                      Tout est validé ici : la médaille {step.label} se débloquera dès que le palier
                      précédent sera obtenu.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {unclassified.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            ⭐ Mes autres réussites
          </h2>
          <AchievementBadges achievements={unclassified} />
        </section>
      )}
    </div>
  );
}
