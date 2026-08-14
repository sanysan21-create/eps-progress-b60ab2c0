import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AchievementBadges } from "@/components/eps/AchievementBadges";
import { MedalBadge } from "@/components/eps/MedalBadge";
import { getMyMedalThresholds } from "@/lib/medals.functions";
import { medal } from "@/lib/medals";
import { useMyAchievements, useMyMedal } from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/reussites")({
  head: () => ({
    meta: [
      { title: "Mes réussites EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Réussites de l'élève en EPS : reconnaissances pédagogiques attribuées par l'enseignant et statut de progression par paliers.",
      },
      { property: "og:title", content: "Mes réussites EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Réussites reconnues par ton enseignant et paliers bronze, argent, or.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAchievements,
});

function StudentAchievements() {
  const achievements = useMyAchievements();
  const myMedal = useMyMedal();
  const fetchThresholds = useServerFn(getMyMedalThresholds);
  const thresholds = useQuery({
    queryKey: ["my-medal-thresholds"],
    queryFn: () => fetchThresholds(),
  });

  const list = achievements.data ?? [];
  const earned = list.filter((item) => item.earned).length;
  const limits = thresholds.data;

  const steps = limits
    ? ([
        { code: "bronze", label: "Bronze", emoji: "🥉", need: limits.bronze },
        { code: "silver", label: "Argent", emoji: "🥈", need: limits.silver },
        { code: "gold", label: "Or", emoji: "🥇", need: limits.gold },
      ] as const)
    : [];

  const reached = [...steps].reverse().find((step) => earned >= step.need) ?? null;
  const next = steps.find((step) => earned < step.need) ?? null;
  const assigned = medal(myMedal.data ?? null);

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-3xl leading-tight">Mes réussites</h1>
        <p className="text-sm text-muted-foreground">
          Ton enseignant reconnaît ces réussites dans ton parcours.
        </p>
      </header>

      {/* Statut automatique, calculé sur le nombre de réussites obtenues */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🏆 Mon nombre de réussites
        </h2>
        <div className="rounded-3xl border border-border bg-surface p-6">
          <div className="flex items-baseline gap-2">
            <span className="display-title text-4xl text-primary">{earned}</span>
            <span className="text-sm text-muted-foreground">
              réussite{earned > 1 ? "s" : ""} obtenue{earned > 1 ? "s" : ""} sur {list.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold">
            {reached ? (
              <>
                Statut atteint : <span aria-hidden>{reached.emoji}</span> {reached.label}
              </>
            ) : (
              "Statut : en route vers ton premier palier"
            )}
          </p>
          {next && (
            <p className="mt-1 text-xs text-muted-foreground">
              Encore {next.need - earned} réussite{next.need - earned > 1 ? "s" : ""} pour le palier{" "}
              {next.emoji} {next.label}.
            </p>
          )}

          <ul className="mt-5 space-y-3">
            {steps.map((step) => {
              const ratio = step.need > 0 ? Math.min(100, (earned / step.need) * 100) : 0;
              return (
                <li key={step.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">
                      <span aria-hidden>{step.emoji}</span> {step.label}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {Math.min(earned, step.need)}/{step.need}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mono-label mt-4 text-muted-foreground">
            Paliers définis par ton enseignant · calcul automatique
          </p>
        </div>
      </section>

      {/* Médaille distincte : décidée manuellement par l'enseignant */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🎖️ Ma médaille attribuée
        </h2>
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-6">
          {assigned ? (
            <>
              <MedalBadge code={assigned.code} size={80} />
              <div>
                <p className="text-sm font-bold">Médaille {assigned.label}</p>
                <p className="text-xs text-muted-foreground">
                  Choisie par ton enseignant, indépendamment du nombre de réussites.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune médaille attribuée pour le moment. Elle est décidée par ton enseignant.
            </p>
          )}
        </div>
      </section>

      {achievements.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          ⭐ Toutes mes réussites
        </h2>
        <AchievementBadges achievements={list} />
      </section>
    </div>
  );
}
