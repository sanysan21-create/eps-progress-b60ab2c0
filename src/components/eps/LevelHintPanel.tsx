import type { Competency } from "@/lib/competencies.functions";
import { formatPoints } from "@/lib/grades";

const LEVEL_EMOJI = ["🔴", "🟠", "🟡", "🟢", "🌿", "⭐"];

/** Niveau correspondant à une note, à partir des niveaux déjà configurés pour la compétence. */
export function levelForScore(levels: Competency["levels"], points: number, maxPoints: number) {
  const sorted = [...levels].sort((a, b) => a.position - b.position);
  if (sorted.length === 0 || maxPoints <= 0) return null;
  const ratio = Math.min(Math.max(points / maxPoints, 0), 1);
  const index = ratio <= 0 ? 0 : Math.min(sorted.length - 1, Math.ceil(ratio * sorted.length) - 1);
  return { level: sorted[index]!, rank: index + 1, total: sorted.length };
}

/** Niveau réellement attribué dans « Évaluer compétences » (source de vérité). */
export function assignedLevel(levels: Competency["levels"], levelId: string | null | undefined) {
  if (!levelId) return null;
  const sorted = [...levels].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((level) => level.id === levelId);
  if (index === -1) return null;
  return { level: sorted[index]!, rank: index + 1, total: sorted.length };
}

export function LevelHintPanel({
  studentName,
  competency,
  activityName,
  aflLabel,
  points,
  maxPoints,
  assignedLevelId,
}: {
  studentName: string;
  competency: Competency | null;
  activityName?: string | null;
  aflLabel: string | null;
  points: number;
  maxPoints: number;
  assignedLevelId?: string | null;
}) {
  const match = competency ? assignedLevel(competency.levels, assignedLevelId) : null;
  const hasLevels = (competency?.levels.length ?? 0) > 0;

  return (
    <aside
      aria-live="polite"
      className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-6"
    >
      <h2 className="mono-label text-muted-foreground">Niveau de compétence</h2>

      {!competency ? (
        <p className="text-sm text-muted-foreground">
          Coche une compétence : le niveau attribué dans « Évaluer compétences » s'affiche ici.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-0.5">
            <p className="font-semibold">{studentName}</p>
            <p className="text-sm text-muted-foreground">
              {activityName && <span>{activityName} </span>}
              {aflLabel && (
                <span className="font-mono text-xs uppercase text-primary">{aflLabel} </span>
              )}
            </p>
            <p className="text-sm">{competency.label}</p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
            <p className="mono-label text-muted-foreground">Note</p>
            <p className="display-title text-3xl text-primary">
              {formatPoints(points)} / {formatPoints(maxPoints)}
            </p>
          </div>

          {!match ? (
            <div className="space-y-1 rounded-xl border border-border/60 bg-background px-4 py-3">
              <p className="mono-label text-muted-foreground">Niveau attribué</p>
              <p className="text-base font-bold">Non renseigné</p>
              <p className="text-sm text-muted-foreground">
                {hasLevels
                  ? "Aucun niveau n'a encore été attribué à cette compétence."
                  : "Niveaux de compétence non configurés pour cette compétence. Configure-les depuis l'onglet « Évaluer compétences »."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-3">
                <p className="mono-label text-muted-foreground">Niveau attribué</p>
                <p className="text-base font-bold">
                  <span aria-hidden className="mr-1.5">
                    {LEVEL_EMOJI[Math.min(match.rank - 1, LEVEL_EMOJI.length - 1)]}
                  </span>
                  Niveau {match.rank} — {match.level.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Niveau {match.rank} sur {match.total} configurés pour cette compétence.
                </p>
              </div>

              {match.level.tip && (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                  <p className="mono-label text-muted-foreground">💡 Conseil du niveau</p>
                  <p className="mt-1 text-sm">{match.level.tip}</p>
                </div>
              )}

              {competency.progress_tip && (
                <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
                  <p className="mono-label text-muted-foreground">Conseil pour progresser</p>
                  <p className="mt-1 text-sm">{competency.progress_tip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
