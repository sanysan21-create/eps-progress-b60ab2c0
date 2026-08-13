import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_LEVELS } from "@/lib/levels";

export type ActivityLevel = { id: string; label: string; position: number };
export type ActivityWithLevels = { id: string; name: string; levels: ActivityLevel[] };

export type StudentPick = {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  class_names: string[];
};

export type CompetencyRow = {
  id: string;
  label: string;
  level_label: string;
  level_position: number;
  activity_id: string | null;
  activity_name: string | null;
};

const label = z.string().trim().min(1, "Champ requis").max(120);

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityWithLevels[]> => {
    const { data, error } = await context.supabase
      .from("activities")
      .select("id, name, activity_levels(id, label, position)")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      levels: ((row.activity_levels as unknown as ActivityLevel[]) ?? [])
        .slice()
        .sort((a, b) => a.position - b.position),
    }));
  });

export const createActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => z.object({ name: label }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("activities")
      .insert({ name: data.name, teacher_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { error: levelError } = await context.supabase.from("activity_levels").insert(
      DEFAULT_LEVELS.map((l, i) => ({
        activity_id: row.id,
        teacher_id: context.userId,
        label: l,
        position: i + 1,
      })),
    );
    if (levelError) throw new Error(levelError.message);
    return { id: row.id };
  });

export const renameActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) =>
    z.object({ id: z.string().uuid(), name: label }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("activities")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addActivityLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { activityId: string; label: string }) =>
    z.object({ activityId: z.string().uuid(), label }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("activity_levels")
      .select("position")
      .eq("activity_id", data.activityId)
      .order("position", { ascending: false })
      .limit(1);
    if (readError) throw new Error(readError.message);

    const next = (existing?.[0]?.position ?? 0) + 1;
    const { error } = await context.supabase.from("activity_levels").insert({
      activity_id: data.activityId,
      teacher_id: context.userId,
      label: data.label,
      position: next,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateActivityLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; label: string }) =>
    z.object({ id: z.string().uuid(), label }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("activity_levels")
      .update({ label: data.label })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteActivityLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activity_levels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTeacherStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StudentPick[]> => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, first_name, last_name, student_code, class_students(classes(name))");
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const links = row.class_students as unknown as { classes: { name: string } | null }[];
        return {
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          student_code: row.student_code,
          class_names: (links ?? []).map((l) => l.classes?.name).filter((n): n is string => !!n),
        };
      })
      .sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
      );
  });

export const listStudentCompetencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<CompetencyRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_competencies")
      .select("id, label, level_label, level_position, activity_id, activities(name)")
      .eq("student_id", data.studentId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      level_label: row.level_label,
      level_position: row.level_position,
      activity_id: row.activity_id,
      activity_name: (row.activities as unknown as { name: string } | null)?.name ?? null,
    }));
  });

/** Enregistre une compétence + son niveau pour un ou plusieurs élèves en une seule action. */
export const saveCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      studentIds: string[];
      label: string;
      levelLabel: string;
      levelPosition: number;
      activityId?: string | null;
    }) =>
      z
        .object({
          studentIds: z.array(z.string().uuid()).min(1).max(200),
          label,
          levelLabel: label,
          levelPosition: z.number().int().min(1).max(20),
          activityId: z.string().uuid().nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_competencies").upsert(
      data.studentIds.map((studentId) => ({
        student_id: studentId,
        teacher_id: context.userId,
        activity_id: data.activityId ?? null,
        label: data.label,
        level_label: data.levelLabel,
        level_position: data.levelPosition,
      })),
      { onConflict: "student_id,label" },
    );
    if (error) throw new Error(error.message);
    return { saved: data.studentIds.length };
  });

export const updateCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; label?: string; levelLabel?: string; levelPosition?: number }) =>
      z
        .object({
          id: z.string().uuid(),
          label: label.optional(),
          levelLabel: label.optional(),
          levelPosition: z.number().int().min(1).max(20).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      label?: string;
      level_label?: string;
      level_position?: number;
    } = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.levelLabel !== undefined) patch.level_label = data.levelLabel;
    if (data.levelPosition !== undefined) patch.level_position = data.levelPosition;
    if (Object.keys(patch).length === 0) return { ok: true };


    const { error } = await context.supabase
      .from("student_competencies")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_competencies")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lecture seule : compétences de l'élève identifié par son cookie de session. */
export const getMyCompetencies = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompetencyRow[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_competencies")
      .select("id, label, level_label, level_position, activity_id, activities(name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      level_label: row.level_label,
      level_position: row.level_position,
      activity_id: row.activity_id,
      activity_name: (row.activities as unknown as { name: string } | null)?.name ?? null,
    }));
  },
);
