import type { StudentAchievementView } from "@/lib/achievements.functions";

/**
 * Réussites reconnues par l'enseignant.
 * Les réussites obtenues s'affichent normalement, celles encore à obtenir
 * apparaissent grisées : aucun classement, aucun score, aucune comparaison.
 */
export function AchievementBadges({ achievements }: { achievements: StudentAchievementView[] }) {
  const earned = achievements.filter((achievement) => achievement.earned);

  if (achievements.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
        Aucune réussite proposée pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {earned.length === 0
          ? "Ton enseignant reconnaîtra tes réussites au fil des séances."
          : `${earned.length} réussite${earned.length > 1 ? "s" : ""} reconnue${
              earned.length > 1 ? "s" : ""
            } par ton enseignant`}
      </p>

      <ul className="space-y-3">
        {achievements.map((achievement) => (
          <li
            key={achievement.id}
            className={
              achievement.earned
                ? "flex items-start gap-3 rounded-2xl border border-border bg-surface p-4"
                : "flex items-start gap-3 rounded-2xl border border-dashed border-border/60 bg-surface/40 p-4 opacity-60"
            }
          >
            <span
              aria-hidden
              className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg ${
                achievement.earned ? "bg-primary/10" : "bg-surface-2 grayscale"
              }`}
            >
              {achievement.icon}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm font-medium leading-snug ${
                  achievement.earned ? "" : "text-muted-foreground"
                }`}
              >
                {achievement.name}
              </p>
              {achievement.description && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {achievement.description}
                </p>
              )}
              {!achievement.earned && (
                <p className="mono-label mt-1 text-muted-foreground">Pas encore obtenue</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
