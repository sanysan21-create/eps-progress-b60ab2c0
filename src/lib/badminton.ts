/**
 * Poules de badminton (1 à 8).
 * Spécifique à l'activité « Badminton » : l'enseignant renseigne la poule de
 * l'élève, affichée ensuite dans l'espace élève (élément informatif isolé,
 * il n'entre pas dans le calcul de la progression).
 */
export const BADMINTON_POOLS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export type BadmintonPool = (typeof BADMINTON_POOLS)[number];

/** Vrai si l'activité correspond au badminton (tolère les variantes de casse/accents). */
export function isBadmintonActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /badminton|bad\b/i.test(name);
}
