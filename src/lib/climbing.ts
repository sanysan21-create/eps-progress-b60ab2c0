/**
 * Cotations d'escalade (ordre croissant de difficulté).
 * Spécifique à l'activité « Escalade » : l'enseignant saisit la cotation
 * maximale réussie par l'élève, affichée ensuite dans l'espace élève.
 */
export const CLIMBING_GRADES = [
  "3",
  "3a",
  "3b",
  "3c",
  "4a",
  "4b",
  "4c",
  "5a",
  "5b",
  "5c",
  "6a",
  "6b",
  "6c",
] as const;

export type ClimbingGrade = (typeof CLIMBING_GRADES)[number];

/** Vrai si l'activité correspond à l'escalade (tolère les variantes de casse/accents). */
export function isClimbingActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /escalade/i.test(name);
}

/** Position de la cotation dans l'échelle (0 si inconnue). */
export function climbingGradeIndex(grade: string | null | undefined): number {
  if (!grade) return -1;
  return CLIMBING_GRADES.indexOf(grade as ClimbingGrade);
}
