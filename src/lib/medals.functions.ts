import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";

const medalSchema = z.enum(["bronze", "silver", "gold"]);

export type StudentMedalRow = { student_id: string; medal: string };

/** Médailles déjà attribuées par l'enseignant (une seule par élève). */
export const listStudentMedals = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<StudentMedalRow[]> => {
    return await context.sql<StudentMedalRow[]>`
      select student_id, medal from student_medals where teacher_id = ${context.userId}
    `;
  });

/** Attribue (ou remplace) la médaille d'un élève. */
export const setStudentMedal = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string; medal: string }) =>
    z.object({ studentId: z.string().uuid(), medal: medalSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into student_medals (student_id, teacher_id, medal)
      select ${data.studentId}, ${context.userId}, ${data.medal}
      where exists (
        select 1 from students where id = ${data.studentId} and teacher_id = ${context.userId}
      )
      on conflict (student_id) do update set medal = excluded.medal, updated_at = now()
    `;
    return { ok: true };
  });

export const clearStudentMedal = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from student_medals
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Lecture seule : médaille de l'élève identifié par son cookie de session QR. */
export const getMyMedal = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<string | null> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const [row] = await context.sql<{ medal: string }[]>`
      select medal from student_medals where student_id = ${studentId} limit 1
    `;
    return row?.medal ?? null;
  });
