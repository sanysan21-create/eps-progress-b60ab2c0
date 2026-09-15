/**
 * Indicateur d'état de l'élève ("Comment te sens-tu en ce moment ?").
 * L'élève choisit lui-même son état ; l'enseignant décide seulement, élève par
 * élève, si cette possibilité est activée.
 */
export type Mood = { code: string; emoji: string; label: string };

export const MOODS: Mood[] = [
  { code: "super", emoji: "😄", label: "Super" },
  { code: "bien", emoji: "🙂", label: "Bien" },
  { code: "motive", emoji: "💪", label: "Motivé" },
  { code: "moyen", emoji: "😐", label: "Moyen" },
  { code: "fatigue", emoji: "😴", label: "Fatigué" },
  { code: "stresse", emoji: "😣", label: "Stressé" },
  { code: "pas_trop", emoji: "😕", label: "Pas trop bien" },
  { code: "difficile", emoji: "😢", label: "Difficile" },
];

export function mood(code: string | null | undefined): Mood | undefined {
  if (!code) return undefined;
  return MOODS.find((m) => m.code === code);
}

export function moodLabel(code: string | null | undefined): string | null {
  return mood(code)?.label ?? null;
}
