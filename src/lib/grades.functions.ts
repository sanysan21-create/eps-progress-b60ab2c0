import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import type { GradeRow } from "@/lib/grades";

/** Notes d'un élève (lecture enseignant, restreinte à ses propres élèves). */
export const listStudentGrades = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<GradeRow[]> => {
    const [owned] = await context.sql<{ id: string }[]>`
      select id from students
      where id = ${data.studentId} and teacher_id = ${context.userId} limit 1
    `;
    if (!owned) return [];

    const { loadStudentGrades } = await import("./grades.server");
    return loadStudentGrades(context.sql, data.studentId);
  });

/** Crée ou met à jour la note d'un élève pour une activité (AFL1/AFL2/AFL3). */
export const saveStudentGrade = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      studentIds: string[];
      activityId: string;
      evaluatedOn?: string | null;
      comment?: string | null;
      items: {
        label: string;
        competencyId: string | null;
        points: number;
        maxPoints: number;
      }[];
    }) =>
      z
        .object({
          studentIds: z.array(z.string().uuid()).min(1).max(200),
          activityId: z.string().uuid(),
          evaluatedOn: z.string().trim().min(1).max(20).nullable().optional(),
          comment: z.string().trim().max(1000).nullable().optional(),
          items: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(60),
                competencyId: z.string().uuid().nullable(),
                points: z.number().min(0).max(999),
                maxPoints: z.number().min(0).max(999),
              }),
            )
            .min(1)
            .max(10),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    for (const item of data.items) {
      if (item.points > item.maxPoints) {
        throw new Error(`${item.label} : les points dépassent le maximum prévu.`);
      }
    }

    const evaluatedOn = data.evaluatedOn ?? new Date().toISOString().slice(0, 10);
    let saved = 0;

    for (const studentId of data.studentIds) {
      const [grade] = await context.sql<{ id: string }[]>`
        insert into student_grades (student_id, activity_id, teacher_id, evaluated_on, comment)
        select ${studentId}, ${data.activityId}, ${context.userId}, ${evaluatedOn}, ${data.comment ?? null}
        where exists (
          select 1 from students where id = ${studentId} and teacher_id = ${context.userId}
        )
        on conflict (student_id, activity_id) do update
          set evaluated_on = excluded.evaluated_on,
              comment = excluded.comment,
              updated_at = now()
        returning id
      `;
      if (!grade) continue;

      await context.sql`delete from student_grade_items where grade_id = ${grade.id}`;
      let position = 0;
      for (const item of data.items) {
        position += 1;
        await context.sql`
          insert into student_grade_items
            (grade_id, teacher_id, position, label, competency_id, points, max_points)
          values (${grade.id}, ${context.userId}, ${position}, ${item.label},
                  ${item.competencyId}, ${item.points}, ${item.maxPoints})
        `;
      }
      saved += 1;
    }

    return { saved };
  });

export const deleteStudentGrade = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from student_grades where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/**
 * Lecture seule : notes de l'élève identifié par son cookie de session QR.
 * L'identifiant vient exclusivement du cookie signé, jamais du navigateur,
 * un élève ne peut donc pas consulter les notes d'un autre élève.
 */
export const getMyGrades = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<GradeRow[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { loadStudentGrades } = await import("./grades.server");
    return loadStudentGrades(context.sql, studentId);
  });
