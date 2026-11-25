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
