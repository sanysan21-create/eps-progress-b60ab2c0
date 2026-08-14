import type { ProgramSession } from "./program";
import type { Db } from "./db.server";

const SELECT_SESSIONS = (sql: Db) => sql;

export type ProgramRow = {
  id: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string | null;
  fallback_name: string | null;
  session_date: Date | string | null;
  period_label: string | null;
  objective: string | null;
  description: string | null;
  scale_file_id: string | null;
  scale_activity_id: string | null;
  scale_activity_name: string | null;
};

function toDateString(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Normalise les lignes SQL du programme. */
export function mapProgramRows(rows: ProgramRow[]): ProgramSession[] {
  return rows.map((row) => ({
    id: row.id,
    class_id: row.class_id,
    class_name: row.class_name ?? null,
    activity_id: row.activity_id,
    activity_name: row.activity_name ?? row.fallback_name ?? "Activité",
    session_date: toDateString(row.session_date),
    period_label: row.period_label,
    objective: row.objective,
    description: row.description,
    scale_image_path: row.scale_file_id ?? null,
    scale_image_url: row.scale_file_id ? `/api/files/${row.scale_file_id}` : null,
    scale_activity_id: row.scale_activity_id ?? null,
    scale_activity_name: row.scale_activity_name ?? null,
  }));
}

/** Charge les séances d'un enseignant, éventuellement restreintes à des classes. */
export async function loadProgramSessions(
  sql: Db,
  teacherId: string,
  classIds?: string[],
): Promise<ProgramSession[]> {
  SELECT_SESSIONS(sql);
  const rows = await sql<ProgramRow[]>`
    select
      p.id,
      p.class_id,
      c.name as class_name,
      p.activity_id,
      a.name as activity_name,
      p.activity_name as fallback_name,
      p.session_date,
      p.period_label,
      p.objective,
      p.description,
      p.scale_file_id,
      p.scale_activity_id,
      sa.name as scale_activity_name
    from program_sessions p
    left join classes c on c.id = p.class_id
    left join activities a on a.id = p.activity_id
    left join activities sa on sa.id = p.scale_activity_id
    where p.teacher_id = ${teacherId}
      ${
        classIds === undefined
          ? sql``
          : classIds.length > 0
            ? sql`and (p.class_id is null or p.class_id = any(${classIds}::uuid[]))`
            : sql`and p.class_id is null`
      }
    order by p.session_date asc nulls last, p.created_at asc
  `;
  return mapProgramRows(rows);
}

/** Enseignant et classes d'un élève (pour les lectures côté élève). */
export async function loadStudentScope(
  sql: Db,
  studentId: string,
): Promise<{ teacherId: string; classIds: string[] } | null> {
  const rows = await sql<{ teacher_id: string; class_ids: string[] | null }[]>`
    select s.teacher_id, array_remove(array_agg(cs.class_id), null) as class_ids
    from students s
    left join class_students cs on cs.student_id = s.id
    where s.id = ${studentId}
    group by s.teacher_id
  `;
  const row = rows[0];
  if (!row) return null;
  return { teacherId: row.teacher_id, classIds: row.class_ids ?? [] };
}
