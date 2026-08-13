import type { Achievement } from "@/lib/progression";

/** Badges sobres : réussites personnelles débloquées et réussites à découvrir. */
export function AchievementBadges({
  unlocked,
  locked,
}: {
  unlocked: Achievement[];
  locked: Achievement[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-surface p-5">
        <p className="text-sm text-muted-foreground">
          {unlocked.length === 0
            ? "Tes premières réussites arriveront au fil des séances."
            : `${unlocked.length} réussite${unlocked.length > 1 ? "s" : ""} débloquée${
                unlocked.length > 1 ? "s" : ""
              }`}
        </p>

        {unlocked.length > 0 && (
          <ul className="mt-4 space-y-3">
            {unlocked.map((achievement) => (
              <li key={achievement.code} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg"
                >
                  {achievement.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{achievement.label}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Chaque réussite témoigne de ton parcours.
        </p>
      </div>

      {locked.length > 0 && (
        <div className="rounded-3xl border border-dashed border-border/70 bg-surface/40 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">À découvrir</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {locked.map((achievement) => (
              <li
                key={achievement.code}
                title={achievement.hint}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <span aria-hidden className="opacity-50 grayscale">
                  {achievement.emoji}
                </span>
                {achievement.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
