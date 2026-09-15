/**
 * Équipes par couleur (activité « Ultimate »).
 * L'enseignant regroupe les élèves d'une classe par couleur d'équipe :
 * les élèves partageant la même couleur forment une équipe.
 * Élément informatif isolé : il n'entre pas dans le calcul de la progression.
 */
export const ULTIMATE_TEAMS = [
  { code: "verte", label: "Verte", emoji: "🟢" },
  { code: "rouge", label: "Rouge", emoji: "🔴" },
  { code: "bleue", label: "Bleue", emoji: "🔵" },
  { code: "jaune", label: "Jaune", emoji: "🟡" },
  { code: "orange", label: "Orange", emoji: "🟠" },
  { code: "violette", label: "Violette", emoji: "🟣" },
  { code: "noire", label: "Noire", emoji: "⚫" },
  { code: "blanche", label: "Blanche", emoji: "⚪" },
] as const;

export const ULTIMATE_TEAM_CODES = ULTIMATE_TEAMS.map((t) => t.code) as unknown as [
  string,
  ...string[],
];

export type UltimateTeamCode = (typeof ULTIMATE_TEAMS)[number]["code"];

/** Équipe correspondant au code enregistré (undefined si inconnu). */
export function ultimateTeam(code: string | null | undefined) {
  if (!code) return undefined;
  return ULTIMATE_TEAMS.find((t) => t.code === code);
}

/** Libellé lisible d'une équipe (ex. « 🟢 Verte »). */
export function ultimateTeamLabel(code: string | null | undefined): string | null {
  const team = ultimateTeam(code);
  return team ? `${team.emoji} ${team.label}` : null;
}

/** Vrai si l'activité correspond à l'ultimate (tolère les variantes de casse/accents). */
export function isUltimateActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /ultimate|frisbee/i.test(name);
}
