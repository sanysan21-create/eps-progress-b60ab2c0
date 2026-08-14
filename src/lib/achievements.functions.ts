import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";

export type AchievementRow = {
  id: string;
  name: string;
  description: string;
  icon: string;
  awarded_count: number;
};

export type ClassStudentPick = {
  id: string;
  first_name: string;
  last_name: string;
};

/** Réussite telle que vue par l'élève : disponible, obtenue ou non. */
export type StudentAchievementView = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
};

const idSchema = z.string().uuid();
const labelSchema = z.string().trim().min(1, "Champ requis").max(80);

/** Réussites possibles créées par l'enseignant. */
export const listAchievements = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<AchievementRow[]> => {
    const rows = await context.sql<
      {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        awarded_count: string | number;
      }[]
    >`
      select a.id, a.name, a.description, a.icon,
             count(sa.id) as awarded_count
      from achievements a
      left join student_achievements sa on sa.achievement_id = a.id
      where a.teacher_id = ${context.userId}
      group by a.id
      order by a.created_at asc
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      icon: row.icon ?? "🏅",
      awarded_count: Number(row.awarded_count) || 0,
    }));
  });

export const createAchievement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { name: string; description: string; icon: string }) =>
    z
      .object({
        name: labelSchema,
        description: z.string().trim().max(280).default(""),
        icon: z.string().trim().min(1).max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [row] = await context.sql<{ id: string }[]>`
      insert into achievements (name, description, icon, teacher_id)
      values (${data.name}, ${data.description}, ${data.icon}, ${context.userId})
      returning id
    `;
    if (!row) throw new Error("Création impossible");
    return { id: row.id };
  });

export const deleteAchievement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { achievementId: string }) =>
    z.object({ achievementId: idSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from achievements
      where id = ${data.achievementId} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Élèves inscrits dans une classe de l'enseignant. */
export const listClassStudents = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string }) => z.object({ classId: idSchema }).parse(input))
  .handler(async ({ data, context }): Promise<ClassStudentPick[]> => {
    return await context.sql<ClassStudentPick[]>`
      select s.id, s.first_name, s.last_name
      from class_students cs
      join students s on s.id = cs.student_id
      where cs.class_id = ${data.classId} and cs.teacher_id = ${context.userId}
      order by s.last_name asc, s.first_name asc
    `;
  });

/** Attribution manuelle : l'enseignant reconnaît la réussite pour les élèves choisis. */
export const awardAchievement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { achievementId: string; studentIds: string[] }) =>
    z
      .object({ achievementId: idSchema, studentIds: z.array(idSchema).min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      insert into student_achievements (student_id, achievement_id, teacher_id)
      select s.id, ${data.achievementId}, ${context.userId}
      from students s
      where s.teacher_id = ${context.userId}
        and s.id = any(${data.studentIds}::uuid[])
        and exists (
          select 1 from achievements a
          where a.id = ${data.achievementId} and a.teacher_id = ${context.userId}
        )
      on conflict (student_id, achievement_id) do nothing
    `;
    return { saved: data.studentIds.length };
  });

export const revokeAchievement = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { achievementId: string; studentIds: string[] }) =>
    z
      .object({ achievementId: idSchema, studentIds: z.array(idSchema).min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from student_achievements
      where teacher_id = ${context.userId}
        and achievement_id = ${data.achievementId}
        and student_id = any(${data.studentIds}::uuid[])
    `;
    return { ok: true };
  });

/** Réussites déjà attribuées à un élève (vue enseignant). */
export const listStudentAchievements = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: idSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const rows = await context.sql<{ achievement_id: string }[]>`
      select achievement_id from student_achievements
      where student_id = ${data.studentId} and teacher_id = ${context.userId}
    `;
    return rows.map((row) => row.achievement_id);
  });

/**
 * Vue élève : toutes les réussites proposées par son enseignant, avec l'état
 * « obtenue » ou « à découvrir ». L'élève est identifié par le cookie de session QR.
 */
export const getMyAchievements = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<StudentAchievementView[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const rows = await context.sql<
      {
        id: string;
        name: string;
        description: string | null;
        icon: string | null;
        earned: boolean;
      }[]
    >`
      select a.id, a.name, a.description, a.icon,
             (sa.id is not null) as earned
      from students s
      join achievements a on a.teacher_id = s.teacher_id
      left join student_achievements sa
        on sa.achievement_id = a.id and sa.student_id = s.id
      where s.id = ${studentId}
      order by a.created_at asc
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      icon: row.icon ?? "🏅",
      earned: row.earned,
    }));
  });
