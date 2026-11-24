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

export type ClassGradeRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  gradeId: string | null;
  evaluatedOn: string | null;
  items: { label: string; points: number; maxPoints: number }[];
};

/** Vue classe : notes de tous les élèves d'une classe pour une activité donnée. */
export const listClassGrades = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { className: string; activityId: string }) =>
    z
      .object({
        className: z.string().trim().min(1).max(60),
        activityId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ClassGradeRow[]> => {
    const rows = await context.sql<
      {
        id: string;
        first_name: string;
        last_name: string;
        grade_id: string | null;
        evaluated_on: string | null;
        items: { label: string; points: number; max_points: number }[] | null;
      }[]
    >`
      select s.id, s.first_name, s.last_name, g.id as grade_id, g.evaluated_on,
        coalesce(
          jsonb_agg(
            jsonb_build_object('label', i.label, 'points', i.points, 'max_points', i.max_points)
            order by i.position
          ) filter (where i.id is not null),
          '[]'
        ) as items
      from students s
      join class_students cs on cs.student_id = s.id
      join classes c on c.id = cs.class_id and c.name = ${data.className}
      left join student_grades g
        on g.student_id = s.id and g.activity_id = ${data.activityId}
      left join student_grade_items i on i.grade_id = g.id
      where s.teacher_id = ${context.userId}
      group by s.id, g.id
      order by s.last_name asc, s.first_name asc
    `;
    return rows.map((row) => ({
      studentId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      gradeId: row.grade_id,
      evaluatedOn: row.evaluated_on,
      items: (row.items ?? []).map((item) => ({
        label: item.label,
        points: item.points,
        maxPoints: item.max_points,
      })),
    }));
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

    const { notifyStudents } = await import("./push.server");
    const [a] = await context.sql<{ name: string }[]>`select name from activities where id = ${data.activityId}`;
    await notifyStudents(context.sql, data.studentIds, {
      title: "📊 Résultats mis à jour", body: a?.name ?? "", url: "/eleve/notes",
    });
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
    const rows = await loadStudentGrades(context.sql, studentId);

    // Une activité sans séquence programmée pour la classe n'apparaît nulle part.
    const { loadStudentScope, loadProgrammedActivityIds } = await import("./program.server");
    const scope = await loadStudentScope(context.sql, studentId);
    if (!scope) return [];
    const programmedIds = await loadProgrammedActivityIds(
      context.sql,
      scope.teacherId,
      scope.classIds,
    );
    return rows.filter((row) => programmedIds.has(row.activity_id));
  });
