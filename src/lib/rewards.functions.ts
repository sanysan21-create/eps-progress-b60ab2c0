import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import { PROFILE_TITLES, REWARD_THEMES, isRewardThemeUnlocked } from "./rewards";

export type StudentRewards = {
  /** Thème choisi par l'élève parmi ceux qu'il possède. */
  theme: string | null;
  /** Titre de profil choisi par l'élève (Argent et plus). */
  title: string | null;
};

const THEME_CODES = REWARD_THEMES.map((item) => item.code) as [string, ...string[]];
const TITLE_CODES = PROFILE_TITLES.map((item) => item.code) as [string, ...string[]];

/** Lecture des personnalisations enregistrées (jamais supprimées automatiquement). */
export const getMyRewards = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<StudentRewards> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return { theme: null, title: null };

    const [row] = await context.sql<{ theme: string | null; profile_title: string | null }[]>`
      select theme, profile_title from student_rewards where student_id = ${studentId} limit 1
    `;
    return { theme: row?.theme ?? null, title: row?.profile_title ?? null };
  });

/** Élève réellement connecté (cookie signé) + enseignant propriétaire. */
async function studentContext(sql: { <T>(s: TemplateStringsArray, ...v: unknown[]): Promise<T> }) {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  const studentId = session.data.studentId;
  if (!studentId) throw new Error("Session élève expirée");

  const [student] = await sql<{ teacher_id: string }[]>`
    select teacher_id from students where id = ${studentId} limit 1
  `;
  if (!student) throw new Error("Élève introuvable");
  return { studentId, teacherId: student.teacher_id };
}

/** Choix du thème : accepté seulement si la médaille correspondante est obtenue. */
export const setMyRewardTheme = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { theme: string }) =>
    z.object({ theme: z.enum(THEME_CODES) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentRewards> => {
    const { studentId, teacherId } = await studentContext(context.sql as never);

    const { medalForStudent } = await import("./medals.server");
    const medal = await medalForStudent(context.sql as never, studentId);
    if (!isRewardThemeUnlocked(data.theme as never, medal)) {
      throw new Error("Ce thème n'est pas encore débloqué.");
    }

    await context.sql`
      insert into student_rewards (student_id, teacher_id, theme)
      values (${studentId}, ${teacherId}, ${data.theme})
      on conflict (student_id) do update
        set theme = excluded.theme, updated_at = now()
    `;

    const [row] = await context.sql<{ theme: string | null; profile_title: string | null }[]>`
      select theme, profile_title from student_rewards where student_id = ${studentId} limit 1
    `;
    return { theme: row?.theme ?? null, title: row?.profile_title ?? null };
  });

/** Choix du titre de profil (récompense Argent). Une chaîne vide retire le titre. */
export const setMyProfileTitle = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { title: string }) =>
    z.object({ title: z.union([z.literal(""), z.enum(TITLE_CODES)]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentRewards> => {
    const { studentId, teacherId } = await studentContext(context.sql as never);

    const { medalForStudent } = await import("./medals.server");
    const medal = await medalForStudent(context.sql as never, studentId);
    const { canChooseTitle } = await import("./rewards");
    if (!canChooseTitle(medal)) {
      throw new Error("Le titre de profil se débloque avec la médaille Argent.");
    }

    const value = data.title === "" ? null : data.title;
    await context.sql`
      insert into student_rewards (student_id, teacher_id, profile_title)
      values (${studentId}, ${teacherId}, ${value})
      on conflict (student_id) do update
        set profile_title = excluded.profile_title, updated_at = now()
    `;

    const [row] = await context.sql<{ theme: string | null; profile_title: string | null }[]>`
      select theme, profile_title from student_rewards where student_id = ${studentId} limit 1
    `;
    return { theme: row?.theme ?? null, title: row?.profile_title ?? null };
  });

/** Côté enseignant : titre choisi par un élève (affiché sur la carte Premium). */
export const getStudentRewards = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentRewards> => {
    const [row] = await context.sql<{ theme: string | null; profile_title: string | null }[]>`
      select r.theme, r.profile_title
      from student_rewards r
      join students s on s.id = r.student_id
      where r.student_id = ${data.studentId} and s.teacher_id = ${context.userId}
      limit 1
    `;
    return { theme: row?.theme ?? null, title: row?.profile_title ?? null };
  });
