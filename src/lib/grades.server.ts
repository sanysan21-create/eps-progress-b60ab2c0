import type { GradeRow, GradeItem } from "./grades";

type RawItem = {
  id: string;
  position: number;
  label: string;
  competency_id: string | null;
  points: number | string;
  max_points: number | string;
  competencies: { label: string } | null;
};

type RawGrade = {
  id: string;
  student_id: string;
  activity_id: string;
  evaluated_on: string;
  comment: string | null;
  activities: { name: string } | null;
  student_grade_items: RawItem[] | null;
};

/** Normalise les lignes Supabase en notes exploitables par l'interface. */
export function mapGradeRows(rows: unknown): GradeRow[] {
  return ((rows ?? []) as RawGrade[]).map((row) => {
    const items: GradeItem[] = (row.student_grade_items ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        position: item.position,
        label: item.label,
        competency_id: item.competency_id,
        competency_label: item.competencies?.label ?? null,
        points: Number(item.points) || 0,
        max_points: Number(item.max_points) || 0,
      }));

    return {
      id: row.id,
      student_id: row.student_id,
      activity_id: row.activity_id,
      activity_name: row.activities?.name ?? "Activité",
      evaluated_on: row.evaluated_on,
      comment: row.comment,
      items,
    };
  });
}
