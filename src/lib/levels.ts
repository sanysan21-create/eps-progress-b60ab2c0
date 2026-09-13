/** Niveaux proposés par défaut quand l'enseignant n'a pas encore configuré d'activité. */
export const DEFAULT_LEVELS = [
  "Débutant",
  "En progression",
  "Acquis",
  "Maîtrisé",
] as const;

export type LevelOption = { label: string; position: number };

export const DEFAULT_LEVEL_OPTIONS: LevelOption[] = DEFAULT_LEVELS.map((label, i) => ({
  label,
  position: i + 1,
}));

/**
 * Source de vérité unique du remplissage de la jauge de niveau (0-100).
 * Niveau 1 = niveau le plus bas (0 %), dernier niveau = meilleur niveau (100 %).
 * S'adapte au nombre réel de niveaux configurés pour chaque compétence.
 */
export function getLevelProgress(currentLevel: number, totalLevels: number): number {
  const total = Math.max(totalLevels, currentLevel, 1);
  if (total <= 1) return 100;
  const level = Math.min(Math.max(currentLevel, 1), total);
  return ((level - 1) / (total - 1)) * 100;
}
