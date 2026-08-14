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

export type MedalThresholds = { bronze: number; silver: number; gold: number };

const DEFAULT_THRESHOLDS: MedalThresholds = { bronze: 5, silver: 10, gold: 15 };

const thresholdsSchema = z.object({
  bronze: z.coerce.number().int().min(1).max(200),
  silver: z.coerce.number().int().min(1).max(200),
  gold: z.coerce.number().int().min(1).max(200),
});

function normalize(row: { bronze: number; silver: number; gold: number } | undefined) {
  if (!row) return DEFAULT_THRESHOLDS;
  return { bronze: Number(row.bronze), silver: Number(row.silver), gold: Number(row.gold) };
}

/** Seuils de réussites définis par l'enseignant (valeurs par défaut si non configurés). */
export const getMedalThresholds = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<MedalThresholds> => {
    const [row] = await context.sql<MedalThresholds[]>`
      select bronze, silver, gold from medal_thresholds where teacher_id = ${context.userId} limit 1
    `;
    return normalize(row);
  });

/** Enregistre les seuils : seul l'enseignant peut les modifier. */
export const setMedalThresholds = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: MedalThresholds) => thresholdsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into medal_thresholds (teacher_id, bronze, silver, gold)
      values (${context.userId}, ${data.bronze}, ${data.silver}, ${data.gold})
      on conflict (teacher_id) do update
        set bronze = excluded.bronze, silver = excluded.silver,
            gold = excluded.gold, updated_at = now()
    `;
    return { ok: true };
  });

/** Lecture seule côté élève : seuils fixés par son enseignant. */
export const getMyMedalThresholds = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<MedalThresholds> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return DEFAULT_THRESHOLDS;

    const [row] = await context.sql<MedalThresholds[]>`
      select t.bronze, t.silver, t.gold
      from students s
      join medal_thresholds t on t.teacher_id = s.teacher_id
      where s.id = ${studentId}
      limit 1
    `;
    return normalize(row);
  });
