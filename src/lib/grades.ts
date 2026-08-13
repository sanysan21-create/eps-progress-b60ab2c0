/** Barème par défaut : 3 AFL, total 20 points. Entièrement modifiable par l'enseignant. */
export const DEFAULT_AFL_ITEMS = [
  { label: "AFL1", maxPoints: 8 },
  { label: "AFL2", maxPoints: 6 },
  { label: "AFL3", maxPoints: 6 },
] as const;

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
