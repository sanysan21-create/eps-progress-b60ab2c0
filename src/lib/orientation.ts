/** Vrai si l'activité correspond à la course d'orientation (tolère casse/accents). */
export function isOrientationActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /orientation/i.test(name);
}

/** Pourcentage de complétion d'un objectif quantifié x/y, borné à 0–100. */
export function objectivePercent(achieved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((achieved / target) * 100)));
}
