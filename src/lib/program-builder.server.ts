import type { Db } from "./db.server";
import type { SequenceDetail, SequenceFile } from "./program-builder";

type SequenceRow = {
  id: string;
  name: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string | null;
  start_date: string | null;
  end_date: string | null;
  scale_file_id: string | null;
};

type SessionRow = {
  id: string;
  sequence_id: string;
  session_number: number | null;
  session_date: string | null;
  objective: string | null;
  key_points: string | null;
};

type FileRow = {
  id: string;
  session_id: string;
  file_id: string;
  name: string;
  content_type: string;
};

type CriterionRow = {
  id: string;
  sequence_id: string;
  label: string;
  points: string | number;
  competency_id: string | null;
};

/** Charge les séquences d'un professeur avec séances, ressources et barème. */
export async function loadSequenceDetails(sql: Db, teacherId: string): Promise<SequenceDetail[]> {
  const sequences = await sql<SequenceRow[]>`
    select s.id, s.name, s.class_id, c.name as class_name, s.activity_id, a.name as activity_name,
           s.start_date::text as start_date, s.end_date::text as end_date, s.scale_file_id
    from program_sequences s
    left join classes c on c.id = s.class_id
    left join activities a on a.id = s.activity_id
    where s.teacher_id = ${teacherId}
    order by s.start_date desc nulls last, s.created_at desc
  `;
  if (sequences.length === 0) return [];
  const ids = sequences.map((row) => row.id);

  const sessions = await sql<SessionRow[]>`
    select id, sequence_id, session_number, session_date::text as session_date, objective, key_points
    from program_sessions
    where teacher_id = ${teacherId} and sequence_id = any(${ids}::uuid[])
    order by session_date asc nulls last, created_at asc
  `;

  const files = await sql<FileRow[]>`
    select f.id, f.session_id, f.file_id, f.name, f.content_type
    from program_session_files f
    join program_sessions p on p.id = f.session_id
    where f.teacher_id = ${teacherId} and p.sequence_id = any(${ids}::uuid[])
    order by f.created_at asc
  `;

  const criteria = await sql<CriterionRow[]>`
    select id, sequence_id, label, points, competency_id
    from program_criteria
    where teacher_id = ${teacherId} and sequence_id = any(${ids}::uuid[])
    order by position asc, created_at asc
  `;

  const filesBySession = new Map<string, SequenceFile[]>();
  for (const file of files) {
    const list = filesBySession.get(file.session_id) ?? [];
    list.push({
      id: file.id,
      file_id: file.file_id,
      name: file.name,
      content_type: file.content_type,
      url: `/api/files/${file.file_id}`,
    });
    filesBySession.set(file.session_id, list);
  }

  return sequences.map((sequence) => ({
    id: sequence.id,
    name: sequence.name,
    class_id: sequence.class_id,
    class_name: sequence.class_name,
    activity_id: sequence.activity_id,
    activity_name: sequence.activity_name,
    start_date: sequence.start_date,
    end_date: sequence.end_date,
    scale_image_url: sequence.scale_file_id ? `/api/files/${sequence.scale_file_id}` : null,
    sessions: sessions
      .filter((session) => session.sequence_id === sequence.id)
      .map((session, index) => ({
        id: session.id,
        session_number: session.session_number ?? index + 1,
        session_date: session.session_date,
        objective: session.objective,
        key_points: session.key_points,
        files: filesBySession.get(session.id) ?? [],
      })),
    criteria: criteria
      .filter((item) => item.sequence_id === sequence.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        points: Number(item.points),
        competency_id: item.competency_id,
      })),
  }));
}
