import type { Db } from "./db.server";
import type { GradeRow, GradeItem } from "./grades";

type FlatRow = {
  id: string;
  student_id: string;
  activity_id: string;
  activity_name: string | null;
  evaluated_on: Date | string;
  comment: string | null;
  item_id: string | null;
  item_position: number | null;
  item_label: string | null;
  competency_id: string | null;
  competency_label: string | null;
  points: string | number | null;
  max_points: string | number | null;
};

function toDateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

/** Charge les notes d'un élève et regroupe les lignes plates SQL par évaluation. */
export async function loadStudentGrades(sql: Db, studentId: string): Promise<GradeRow[]> {
  const rows = await sql<FlatRow[]>`
    select
      g.id,
      g.student_id,
      g.activity_id,
      a.name as activity_name,
      g.evaluated_on,
      g.comment,
      i.id as item_id,
      i.position as item_position,
      i.label as item_label,
      i.competency_id,
      c.label as competency_label,
      i.points,
      i.max_points
    from student_grades g
    left join activities a on a.id = g.activity_id
    left join student_grade_items i on i.grade_id = g.id
    left join competencies c on c.id = i.competency_id
    where g.student_id = ${studentId}
    order by g.evaluated_on desc, i.position asc
  `;

  const grades = new Map<string, GradeRow>();
  for (const row of rows) {
    let grade = grades.get(row.id);
    if (!grade) {
      grade = {
        id: row.id,
        student_id: row.student_id,
        activity_id: row.activity_id,
        activity_name: row.activity_name ?? "Activité",
        evaluated_on: toDateString(row.evaluated_on),
        comment: row.comment,
        items: [],
      };
      grades.set(row.id, grade);
    }
    if (row.item_id) {
      const item: GradeItem = {
        id: row.item_id,
        position: row.item_position ?? 0,
        label: row.item_label ?? "",
        competency_id: row.competency_id,
        competency_label: row.competency_label,
        points: Number(row.points) || 0,
        max_points: Number(row.max_points) || 0,
      };
      grade.items.push(item);
    }
  }

  return Array.from(grades.values());
}
