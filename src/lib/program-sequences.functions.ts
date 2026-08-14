import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import type { Db } from "./db.server";
import type { ProgramSequence } from "@/lib/program-sequences";

type Raw = {
  id: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string | null;
  name: string;
  from_session: number | null;
  to_session: number | null;
  position: number | null;
};

async function loadSequences(
  sql: Db,
  teacherId: string,
  classIds?: string[],
): Promise<ProgramSequence[]> {
  const rows = await sql<Raw[]>`
    select s.id, s.class_id, c.name as class_name, s.activity_id, a.name as activity_name,
           s.name, s.from_session, s.to_session, s.position
    from program_sequences s
    left join classes c on c.id = s.class_id
    left join activities a on a.id = s.activity_id
    where s.teacher_id = ${teacherId}
      ${
        classIds === undefined
          ? sql``
          : classIds.length > 0
            ? sql`and (s.class_id is null or s.class_id = any(${classIds}::uuid[]))`
            : sql`and s.class_id is null`
      }
    order by s.position asc, s.from_session asc nulls last
  `;
  return rows.map((row) => ({
    id: row.id,
    class_id: row.class_id,
    class_name: row.class_name ?? null,
    activity_id: row.activity_id,
    activity_name: row.activity_name ?? null,
    name: row.name,
    from_session: row.from_session,
    to_session: row.to_session,
    position: row.position ?? 0,
  }));
}

/** Séquences programmées par l'enseignant connecté. */
export const listProgramSequences = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<ProgramSequence[]> => {
    return loadSequences(context.sql, context.userId);
  });

export const saveProgramSequence = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      classId: string | null;
      activityId: string | null;
      fromSession: number | null;
      toSession: number | null;
      position?: number | null;
    }) =>
      z
        .object({
          id: z.string().uuid().nullable().optional(),
          name: z.string().trim().min(1).max(120),
          classId: z.string().uuid().nullable(),
          activityId: z.string().uuid().nullable(),
          fromSession: z.number().int().min(1).max(200).nullable(),
          toSession: z.number().int().min(1).max(200).nullable(),
          position: z.number().int().min(0).max(200).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const position = data.position ?? data.fromSession ?? 0;

    if (data.id) {
      await context.sql`
        update program_sequences set
          name = ${data.name},
          class_id = ${data.classId},
          activity_id = ${data.activityId},
          from_session = ${data.fromSession},
          to_session = ${data.toSession},
          position = ${position},
          updated_at = now()
        where id = ${data.id} and teacher_id = ${context.userId}
      `;
      return { id: data.id };
    }

    const [row] = await context.sql<{ id: string }[]>`
      insert into program_sequences
        (teacher_id, name, class_id, activity_id, from_session, to_session, position)
      values (${context.userId}, ${data.name}, ${data.classId}, ${data.activityId},
              ${data.fromSession}, ${data.toSession}, ${position})
      returning id
    `;
    if (!row) throw new Error("Enregistrement impossible");
    return { id: row.id };
  });

export const deleteProgramSequence = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from program_sequences where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Lecture seule : séquences visibles par l'élève identifié par sa session QR. */
export const getMyProgramSequences = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<ProgramSequence[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const { loadStudentScope } = await import("./program.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const scope = await loadStudentScope(context.sql, studentId);
    if (!scope) return [];
    return loadSequences(context.sql, scope.teacherId, scope.classIds);
  });
