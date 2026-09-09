import type { StudentAchievementView } from "@/lib/achievements.functions";

/**
 * Réussites reconnues par l'enseignant.
 * Les réussites obtenues s'affichent normalement, celles encore à obtenir
 * apparaissent grisées : aucun classement, aucun score, aucune comparaison.
 * Chaque carte est cliquable pour consulter la description de la réussite.
 */
export function AchievementBadges({
  achievements,
  onSelect,
}: {
  achievements: StudentAchievementView[];
  onSelect?: (achievement: StudentAchievementView) => void;
}) {
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
          <li key={achievement.id}>
            <button
              type="button"
              onClick={() => onSelect?.(achievement)}
              className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition active:scale-[0.99] ${
                achievement.earned
                  ? "border border-border bg-surface hover:border-primary/50"
                  : "border border-dashed border-border/60 bg-surface/40 opacity-60 hover:opacity-90"
              }`}
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
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {achievement.description}
                  </p>
                )}
                <p className="mono-label mt-1 text-muted-foreground">
                  {achievement.earned ? "Voir le détail" : "Pas encore obtenue · voir le détail"}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
