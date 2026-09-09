import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { medal as findMedal } from "@/lib/medals";
import type { StudentAchievementView } from "@/lib/achievements.functions";

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Détail d'une réussite pour l'élève : icône, nom, médaille, description,
 * statut (obtenue ou à débloquer) et date d'obtention si connue.
 */
export function AchievementDetailDialog({
  achievement,
  onClose,
}: {
  achievement: StudentAchievementView | null;
  onClose: () => void;
}) {
  const info = findMedal(achievement?.medal_type);
  const earnedAt = formatDate(achievement?.earned_at ?? null);

  return (
    <Dialog open={achievement !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-3xl border-border bg-surface p-6">
        {achievement && (
          <div className="space-y-4 text-center">
            <span
              aria-hidden
              className={`mx-auto grid size-16 place-items-center rounded-2xl text-3xl ${
                achievement.earned ? "bg-primary/10" : "bg-surface-2 grayscale"
              }`}
            >
              {achievement.icon}
            </span>

            <div className="space-y-1">
              <DialogTitle className="display-title text-xl uppercase tracking-wide">
                {achievement.name}
              </DialogTitle>
              {info && (
                <p className="mono-label text-primary">
                  {info.emoji} Réussite {info.label}
                </p>
              )}
              {achievement.is_required && (
                <p className="mono-label text-muted-foreground">⭐ Réussite obligatoire</p>
              )}
            </div>

            {achievement.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                « {achievement.description} »
              </p>
            )}

            <div className="space-y-1 rounded-2xl border border-border/60 bg-surface-2/60 px-4 py-3">
              {achievement.earned ? (
                <>
                  <p className="text-sm font-bold text-primary">✓ Réussite obtenue</p>
                  {earnedAt && <p className="text-xs text-muted-foreground">Obtenue le {earnedAt}</p>}
                </>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">🔒 À débloquer</p>
              )}
            </div>

            <Button className="w-full" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
