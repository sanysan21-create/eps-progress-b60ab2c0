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

export type UltimateMatch = {
  id: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
  session_number: number | null;
  session_date: string | null;
  activity_name: string | null;
};

export type UltimateStanding = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scored: number;
  conceded: number;
  diff: number;
};

/** Classement cumulé de toutes les rencontres (victoire 3 pts, nul 1 pt). */
export function computeUltimateStandings(matches: UltimateMatch[]): UltimateStanding[] {
  const table = new Map<string, UltimateStanding>();
  const get = (team: string) => {
    const row = table.get(team) ?? {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scored: 0,
      conceded: 0,
      diff: 0,
    };
    table.set(team, row);
    return row;
  };

  for (const match of matches) {
    const a = get(match.team_a);
    const b = get(match.team_b);
    a.played += 1;
    b.played += 1;
    a.scored += match.score_a;
    a.conceded += match.score_b;
    b.scored += match.score_b;
    b.conceded += match.score_a;
    if (match.score_a > match.score_b) {
      a.won += 1;
      b.lost += 1;
    } else if (match.score_a < match.score_b) {
      b.won += 1;
      a.lost += 1;
    } else {
      a.drawn += 1;
      b.drawn += 1;
    }
  }

  return [...table.values()]
    .map((row) => ({ ...row, diff: row.scored - row.conceded }))
    .sort((x, y) => {
      const points = y.won * 3 + y.drawn - (x.won * 3 + x.drawn);
      if (points !== 0) return points;
      if (y.diff !== x.diff) return y.diff - x.diff;
      return y.scored - x.scored;
    });
}

/** Points de classement d'une équipe (victoire 3, nul 1). */
export function ultimatePoints(row: UltimateStanding): number {
  return row.won * 3 + row.drawn;
}
