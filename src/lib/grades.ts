/** Barème par défaut : 3 AFL, total 20 points. Entièrement modifiable par l'enseignant. */
export const DEFAULT_AFL_ITEMS = [
  { label: "AFL1", maxPoints: 12 },
  { label: "AFL2", maxPoints: 4 },
  { label: "AFL3", maxPoints: 4 },
] as const;

/** AFL1 est noté en deux volets de 6 points : AFL1a et AFL1b. */
export const AFL1_PARTS = [
  { part: "a", label: "AFL1a", maxPoints: 6 },
  { part: "b", label: "AFL1b", maxPoints: 6 },
] as const;
export type Afl1Part = (typeof AFL1_PARTS)[number]["part"];

export const DEFAULT_ACTIVITY_SCALE = { AFL1a: 6, AFL1b: 6, AFL2: 4, AFL3: 4 };
export type ActivityScale = typeof DEFAULT_ACTIVITY_SCALE;
export type GradingCompetency = { id: string; afl: string; max_points?: number | null; afl1_part?: Afl1Part | null };

export function activityScale(scale?: Partial<ActivityScale> | null): ActivityScale {
  return { ...DEFAULT_ACTIVITY_SCALE, ...scale };
}

export function competencyBudgetKey(competency: GradingCompetency): keyof ActivityScale | null {
  if (competency.afl === "AFL1") return competency.afl1_part === "b" ? "AFL1b" : "AFL1a";
  if (competency.afl === "AFL2" || competency.afl === "AFL3") return competency.afl;
  return null;
}

/** Répartition du budget du volet, en conservant les proportions des points personnalisés. */
export function competencyMaxPoints(competency: GradingCompetency, competencies: GradingCompetency[], scale?: Partial<ActivityScale> | null): number {
  const key = competencyBudgetKey(competency);
  if (!key) return 0;
  const group = competencies.filter((item) => competencyBudgetKey(item) === key).map((item) => item.id === competency.id ? competency : item);
  if (!group.some((item) => item.id === competency.id)) group.push(competency);
  const budget = Math.max(0, activityScale(scale)[key]);
  const assigned = group.reduce((sum, item) => sum + Number(item.max_points ?? 0), 0);
  const automatic = group.filter((item) => item.max_points == null).length;
  const weights = group.map((item) => {
    if (automatic && assigned <= budget) return item.max_points == null ? (budget - assigned) / automatic : Number(item.max_points);
    return Number(item.max_points ?? 0);
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const cents = Math.round(budget * 100);
  // Arrondir les cumuls plutôt que chaque part assure un total exactement égal au budget.
  let cumulative = 0;
  let previous = 0;
  for (let index = 0; index < group.length; index++) {
    cumulative += weightTotal > 0 ? (weights[index] ?? 0) / weightTotal : 1 / group.length;
    const next = Math.round(cumulative * cents);
    if (group[index]?.id === competency.id) return (next - previous) / 100;
    previous = next;
  }
  return 0;
}

export type GradeItem = {
  id: string;
  position: number;
  label: string;
  competency_id: string | null;
  competency_label: string | null;
  points: number;
  max_points: number;
};

export type GradeRow = {
  id: string;
  student_id: string;
  activity_id: string;
  activity_name: string;
  evaluated_on: string;
  comment: string | null;
  items: GradeItem[];
};

export function gradeTotals(items: { points: number; max_points: number }[]) {
  const points = items.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
  const max = items.reduce((sum, item) => sum + (Number(item.max_points) || 0), 0);
  const percent = max > 0 ? Math.round((points / max) * 100) : null;
  return { points: Math.round(points * 100) / 100, max: Math.round(max * 100) / 100, percent };
}

/** "18 / 20" sans décimale inutile. */
export function formatPoints(value: number): string {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, "");
}

/** Même conversion pour l'aperçu et l'enregistrement, quel que soit le nombre de niveaux. */
export function levelForScore<T extends { id: string; position: number }>(levels: T[], points: number, maxPoints: number) {
  const sorted = [...levels].sort((a, b) => a.position - b.position);
  if (!sorted.length || !Number.isFinite(points) || !Number.isFinite(maxPoints) || maxPoints <= 0) return null;
  const ratio = Math.min(Math.max(points / maxPoints, 0), 1);
  const index = Math.max(0, Math.ceil(ratio * sorted.length) - 1);
  const level = sorted[index];
  return level ? { level, rank: index + 1, total: sorted.length } : null;
}
