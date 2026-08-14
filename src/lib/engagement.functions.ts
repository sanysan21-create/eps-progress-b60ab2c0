import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";

export type EngagementMark = { indicator_code: string; level: number };

const codeSchema = z.string().trim().min(1).max(60);
const studentIdsSchema = z.array(z.string().uuid()).min(1).max(200);

/** Implication renseignée par l'enseignant pour un élève. */
export const listStudentEngagement = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<EngagementMark[]> => {
    return await context.sql<EngagementMark[]>`
      select indicator_code, level from student_engagement
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
    `;
  });

export const setStudentEngagement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentIds: string[]; indicatorCode: string; level: number }) =>
    z
      .object({
        studentIds: studentIdsSchema,
        indicatorCode: codeSchema,
        level: z.number().int().min(1).max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into student_engagement (student_id, teacher_id, indicator_code, level)
      select s.id, ${context.userId}, ${data.indicatorCode}, ${data.level}
      from students s
      where s.teacher_id = ${context.userId} and s.id = any(${data.studentIds}::uuid[])
      on conflict (student_id, indicator_code)
      do update set level = excluded.level, updated_at = now()
    `;
    return { saved: data.studentIds.length };
  });

export const clearStudentEngagement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentIds: string[]; indicatorCode: string }) =>
    z.object({ studentIds: studentIdsSchema, indicatorCode: codeSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from student_engagement
      where teacher_id = ${context.userId}
        and indicator_code = ${data.indicatorCode}
        and student_id = any(${data.studentIds}::uuid[])
    `;
    return { ok: true };
  });

/**
 * Lecture seule pour l'enseignant : points forts choisis par l'élève lui-même.
 * L'enseignant ne peut jamais les attribuer ni les modifier.
 */
export const getStudentStrengthChoices = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const rows = await context.sql<{ strength_code: string }[]>`
      select strength_code from student_strength_choices
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
    `;
    return rows.map((row) => row.strength_code);
  });

/** Lecture seule pour l'enseignant : objectif choisi par l'élève lui-même. */
export const getStudentGoalChoice = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string | null> => {
    const [row] = await context.sql<{ goal_code: string }[]>`
      select goal_code from student_goal_choices
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
      limit 1
    `;
    return row?.goal_code ?? null;
  });

/** Lecture seule : implication de l'élève identifié par son cookie de session QR. */
export const getMyEngagement = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<EngagementMark[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    return await context.sql<EngagementMark[]>`
      select indicator_code, level from student_engagement where student_id = ${studentId}
    `;
  });

/** Points forts personnels de l'élève connecté (choisis par lui-même). */
export const getMyStrengths = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<string[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const rows = await context.sql<{ strength_code: string }[]>`
      select strength_code from student_strength_choices where student_id = ${studentId}
    `;
    return rows.map((row) => row.strength_code);
  });

/** Objectif personnel de l'élève connecté (choisi par lui-même). */
export const getMyGoal = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<string | null> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const [row] = await context.sql<{ goal_code: string }[]>`
      select goal_code from student_goal_choices where student_id = ${studentId} limit 1
    `;
    return row?.goal_code ?? null;
  });

/**
 * Écriture réservée à l'élève : ses 3 points forts personnels.
 * L'élève est identifié par le cookie de session créé après validation du QR code,
 * jamais par une donnée envoyée depuis le navigateur.
 */
export const setMyStrengths = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { strengthCodes: string[] }) =>
    z.object({ strengthCodes: z.array(codeSchema).length(3) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { STRENGTHS, MAX_STRENGTHS } = await import("./engagement");
    const codes = Array.from(new Set(data.strengthCodes));
    if (codes.length !== MAX_STRENGTHS) throw new Error("Choisis 3 points forts différents");
    if (!codes.every((code) => STRENGTHS.some((s) => s.code === code))) {
      throw new Error("Point fort inconnu");
    }

    const { resolveStudent } = await import("./student-choices.server");
    const { studentId, teacherId } = await resolveStudent();

    await context.sql`delete from student_strength_choices where student_id = ${studentId}`;
    await context.sql`
      insert into student_strength_choices (student_id, teacher_id, strength_code)
      select ${studentId}, ${teacherId}, code from unnest(${codes}::text[]) as code
    `;
    return { strengthCodes: codes };
  });

/** Écriture réservée à l'élève : son objectif personnel (un seul). */
export const setMyGoal = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { goalCode: string }) =>
    z.object({ goalCode: codeSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { GOALS } = await import("./engagement");
    if (!GOALS.some((g) => g.code === data.goalCode)) throw new Error("Objectif inconnu");

    const { resolveStudent } = await import("./student-choices.server");
    const { studentId, teacherId } = await resolveStudent();

    await context.sql`
      insert into student_goal_choices (student_id, teacher_id, goal_code)
      values (${studentId}, ${teacherId}, ${data.goalCode})
      on conflict (student_id) do update set goal_code = excluded.goal_code, updated_at = now()
    `;
    return { goalCode: data.goalCode };
  });
