import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AchievementRow[]> => {
    const { data, error } = await context.supabase
      .from("achievements")
      .select("id, name, description, icon, student_achievements(count)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const counts = row.student_achievements as unknown as { count: number }[] | null;
      return {
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        icon: row.icon ?? "🏅",
        awarded_count: counts?.[0]?.count ?? 0,
      };
    });
  });

export const createAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { data: row, error } = await context.supabase
      .from("achievements")
      .insert({
        name: data.name,
        description: data.description,
        icon: data.icon,
        teacher_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { achievementId: string }) =>
    z.object({ achievementId: idSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("achievements")
      .delete()
      .eq("id", data.achievementId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Élèves inscrits dans une classe de l'enseignant. */
export const listClassStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { classId: string }) => z.object({ classId: idSchema }).parse(input))
  .handler(async ({ data, context }): Promise<ClassStudentPick[]> => {
    const { data: rows, error } = await context.supabase
      .from("class_students")
      .select("students(id, first_name, last_name)")
      .eq("class_id", data.classId);
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .map((row) => row.students as unknown as ClassStudentPick | null)
      .filter((student): student is ClassStudentPick => Boolean(student))
      .sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
      );
  });

/** Attribution manuelle : l'enseignant reconnaît la réussite pour les élèves choisis. */
export const awardAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { achievementId: string; studentIds: string[] }) =>
    z
      .object({ achievementId: idSchema, studentIds: z.array(idSchema).min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_achievements").upsert(
      data.studentIds.map((studentId) => ({
        student_id: studentId,
        achievement_id: data.achievementId,
        teacher_id: context.userId,
      })),
      { onConflict: "student_id,achievement_id" },
    );
    if (error) throw new Error(error.message);
    return { saved: data.studentIds.length };
  });

export const revokeAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { achievementId: string; studentIds: string[] }) =>
    z
      .object({ achievementId: idSchema, studentIds: z.array(idSchema).min(1).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_achievements")
      .delete()
      .eq("achievement_id", data.achievementId)
      .in("student_id", data.studentIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Réussites déjà attribuées à un élève (vue enseignant). */
export const listStudentAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: idSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_achievements")
      .select("achievement_id")
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.achievement_id);
  });

/**
 * Vue élève : toutes les réussites proposées par son enseignant, avec l'état
 * « obtenue » ou « à découvrir ». L'élève est identifié par le cookie de session QR.
 */
export const getMyAchievements = createServerFn({ method: "GET" }).handler(
  async (): Promise<StudentAchievementView[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("teacher_id")
      .eq("id", studentId)
      .maybeSingle();
    if (studentError) throw new Error(studentError.message);
    if (!student) return [];

    const [{ data: available, error: availableError }, { data: earned, error: earnedError }] =
      await Promise.all([
        supabaseAdmin
          .from("achievements")
          .select("id, name, description, icon")
          .eq("teacher_id", student.teacher_id)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("student_achievements")
          .select("achievement_id")
          .eq("student_id", studentId),
      ]);
    if (availableError) throw new Error(availableError.message);
    if (earnedError) throw new Error(earnedError.message);

    const earnedIds = new Set((earned ?? []).map((row) => row.achievement_id));
    return (available ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      icon: row.icon ?? "🏅",
      earned: earnedIds.has(row.id),
    }));
  },
);
