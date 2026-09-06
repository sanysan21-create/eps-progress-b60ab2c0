import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import { computeMedalProgress, highestMedal, type MedalProgress } from "./medals";

export type StudentMedalRow = { student_id: string; medal: string };

type AchievementStateRow = {
  medal_type: string | null;
  is_required: boolean;
  earned: boolean;
};

/**
 * Progression des médailles d'un élève : les médailles ne sont plus attribuées
 * manuellement, elles découlent des réussites obtenues dans chaque parcours.
 */
async function progressForStudent(
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>,
  studentId: string,
): Promise<MedalProgress[]> {
  const rows = (await sql`
    select a.medal_type, a.is_required, (sa.id is not null) as earned
    from students s
    join achievements a on a.teacher_id = s.teacher_id
    left join student_achievements sa
      on sa.achievement_id = a.id and sa.student_id = s.id
    where s.id = ${studentId}
  `) as AchievementStateRow[];

  return computeMedalProgress(
    rows.map((row) => ({
      medal_type: row.medal_type,
      is_required: row.is_required,
      earned: row.earned,
    })),
  );
}

/** Médailles obtenues automatiquement par les élèves de l'enseignant. */
export const listStudentMedals = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<StudentMedalRow[]> => {
    const rows = await context.sql<
      {
        student_id: string;
        medal_type: string | null;
        is_required: boolean;
        earned: boolean;
      }[]
    >`
      select s.id as student_id, a.medal_type, a.is_required, (sa.id is not null) as earned
      from students s
      join achievements a on a.teacher_id = s.teacher_id
      left join student_achievements sa
        on sa.achievement_id = a.id and sa.student_id = s.id
      where s.teacher_id = ${context.userId}
    `;

    const byStudent = new Map<string, AchievementStateRow[]>();
    for (const row of rows) {
      const list = byStudent.get(row.student_id) ?? [];
      list.push({ medal_type: row.medal_type, is_required: row.is_required, earned: row.earned });
      byStudent.set(row.student_id, list);
    }

    const result: StudentMedalRow[] = [];
    for (const [studentId, list] of byStudent) {
      const code = highestMedal(computeMedalProgress(list));
      if (code) result.push({ student_id: studentId, medal: code });
    }
    return result;
  });

/** Progression détaillée d'un élève (vue enseignant). */
export const getStudentMedalProgress = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<MedalProgress[]> => {
    const [owned] = await context.sql<{ id: string }[]>`
      select id from students where id = ${data.studentId} and teacher_id = ${context.userId}
    `;
    if (!owned) return [];
    return await progressForStudent(context.sql as never, data.studentId);
  });

/** Lecture seule : médaille la plus élevée obtenue par l'élève connecté. */
export const getMyMedal = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<string | null> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const progress = await progressForStudent(context.sql as never, studentId);
    return highestMedal(progress);
  });

/** Lecture seule : progression complète des 3 parcours pour l'élève connecté. */
export const getMyMedalProgress = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<MedalProgress[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];
    return await progressForStudent(context.sql as never, studentId);
  });
