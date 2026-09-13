import { MedalBadge } from "@/components/eps/MedalBadge";
import { REWARD_TIERS } from "@/lib/rewards";
import type { MedalProgress } from "@/lib/medals";

/**
 * « Mes récompenses » : les trois paliers, leur contenu cosmétique et la
 * progression réelle vers la prochaine médaille (issue des réussites existantes).
 */
export function RewardsSection({ progress }: { progress: MedalProgress[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
        🎁 Mes récompenses
      </h2>

      <div className="space-y-3">
        {REWARD_TIERS.map((tier) => {
          const step = progress.find((item) => item.code === tier.code);
          const unlocked = Boolean(step?.obtained);
          const remaining = step ? Math.max(0, step.need - step.earnedCount) : 0;

          return (
            <article
              key={tier.code}
              className="rounded-3xl border bg-surface p-5"
              style={
                unlocked
                  ? {
                      borderColor: "color-mix(in oklab, var(--color-medal) 55%, transparent)",
                      backgroundColor: "color-mix(in oklab, var(--color-medal) 7%, transparent)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <MedalBadge code={tier.code} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base uppercase tracking-wide">
                    {tier.emoji} {tier.label}
                  </p>
                  {step && (
                    <p className="mono-label text-muted-foreground">
                      {step.earnedCount} / {step.need} réussites
                    </p>
                  )}
                </div>
                <span
                  className="mono-label shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                  style={
                    unlocked
                      ? {
                          borderColor: "var(--color-medal)",
                          color: "var(--color-medal)",
                        }
                      : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
                  }
                >
                  {unlocked ? "✓ Débloqué" : "🔒 À débloquer"}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {tier.items.map((item) => (
                  <li key={item} className={unlocked ? "" : "text-muted-foreground"}>
                    {item}
                  </li>
                ))}
              </ul>

              {!unlocked && step && remaining > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Encore {remaining} réussite{remaining > 1 ? "s" : ""} pour débloquer{" "}
                  {tier.label === "Or" ? "Or et ta Carte Premium" : tier.label}.
                </p>
              )}
              {unlocked && tier.code === "gold" && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Ton enseignant peut imprimer ta Carte Premium EPS Progress.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="mono-label text-muted-foreground">
        Les récompenses sont uniquement visuelles : elles ne changent rien à tes évaluations.
      </p>
    </section>
  );
}
