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
