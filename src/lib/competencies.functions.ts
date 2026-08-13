import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_LEVELS } from "@/lib/levels";

export type CompetencyLevel = { id: string; label: string; position: number };
export type Competency = {
  id: string;
  label: string;
  position: number;
  levels: CompetencyLevel[];
};
export type ActivityTree = {
  id: string;
  name: string;
  description: string | null;
  competencies: Competency[];
};

export type StudentPick = {
  id: string;
  first_name: string;
  last_name: string;
  student_code: string;
  class_names: string[];
};

/** Niveau attribué à un élève pour une compétence cible. */
export type StudentMark = { competency_id: string; level_id: string };

export type StudentProfileActivity = {
  activity_id: string;
  activity_name: string;
  competencies: { id: string; label: string; level_label: string; level_position: number }[];
};

const labelSchema = z.string().trim().min(1, "Champ requis").max(200);

function sortLevels(levels: CompetencyLevel[]) {
  return levels.slice().sort((a, b) => a.position - b.position);
}

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityTree[]> => {
    const { data, error } = await context.supabase
      .from("activities")
      .select(
        "id, name, description, competencies(id, label, position, competency_levels(id, label, position))",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    return (data ?? []).map((activity) => ({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      competencies: (
        (activity.competencies as unknown as {
          id: string;
          label: string;
          position: number;
          competency_levels: CompetencyLevel[];
        }[]) ?? []
      )
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((competency) => ({
          id: competency.id,
          label: competency.label,
          position: competency.position,
          levels: sortLevels(competency.competency_levels ?? []),
        })),
    }));
  });

export const createActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string | null }) =>
    z
      .object({ name: labelSchema, description: z.string().trim().max(1000).nullable().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("activities")
      .insert({
        name: data.name,
        description: data.description ?? null,
        teacher_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name?: string; description?: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        name: labelSchema.optional(),
        description: z.string().trim().max(1000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { name?: string; description?: string | null } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await context.supabase.from("activities").update(patch).eq("id", data.id);
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

/** Crée une compétence cible avec ses propres niveaux (par défaut, personnalisables ensuite). */
export const createCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { activityId: string; label: string; levels?: string[] }) =>
    z
      .object({
        activityId: z.string().uuid(),
        label: labelSchema,
        levels: z.array(z.string().trim().max(200)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: last, error: readError } = await context.supabase
      .from("competencies")
      .select("position")
      .eq("activity_id", data.activityId)
      .order("position", { ascending: false })
      .limit(1);
    if (readError) throw new Error(readError.message);

    const { data: row, error } = await context.supabase
      .from("competencies")
      .insert({
        activity_id: data.activityId,
        teacher_id: context.userId,
        label: data.label,
        position: (last?.[0]?.position ?? 0) + 1,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const labels = (data.levels ?? [...DEFAULT_LEVELS]).map((l) => l.trim()).filter(Boolean);
    if (labels.length > 0) {
      const { error: levelError } = await context.supabase.from("competency_levels").insert(
        labels.map((label, index) => ({
          competency_id: row.id,
          teacher_id: context.userId,
          label,
          position: index + 1,
        })),
      );
      if (levelError) throw new Error(levelError.message);
    }
    return { id: row.id };
  });

export const updateCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; label: string }) =>
    z.object({ id: z.string().uuid(), label: labelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("competencies")
      .update({ label: data.label })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompetency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("competencies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { competencyId: string; label: string }) =>
    z.object({ competencyId: z.string().uuid(), label: labelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: last, error: readError } = await context.supabase
      .from("competency_levels")
      .select("position")
      .eq("competency_id", data.competencyId)
      .order("position", { ascending: false })
      .limit(1);
    if (readError) throw new Error(readError.message);

    const { error } = await context.supabase.from("competency_levels").insert({
      competency_id: data.competencyId,
      teacher_id: context.userId,
      label: data.label,
      position: (last?.[0]?.position ?? 0) + 1,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; label: string }) =>
    z.object({ id: z.string().uuid(), label: labelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("competency_levels")
      .update({ label: data.label })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompetencyLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("competency_levels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Échange l'ordre de deux niveaux d'une même compétence cible. */
export const swapCompetencyLevels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { firstId: string; secondId: string }) =>
    z.object({ firstId: z.string().uuid(), secondId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("competency_levels")
      .select("id, position")
      .in("id", [data.firstId, data.secondId]);
    if (error) throw new Error(error.message);
    if (!rows || rows.length !== 2) throw new Error("Niveaux introuvables");

    const [a, b] = rows;
    const { error: firstError } = await context.supabase
      .from("competency_levels")
      .update({ position: b!.position })
      .eq("id", a!.id);
    if (firstError) throw new Error(firstError.message);
    const { error: secondError } = await context.supabase
      .from("competency_levels")
      .update({ position: a!.position })
      .eq("id", b!.id);
    if (secondError) throw new Error(secondError.message);
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

export const listStudentMarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentMark[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_competency_levels")
      .select("competency_id, level_id")
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Attribue un niveau précis à une compétence cible, pour un ou plusieurs élèves. */
export const setStudentLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentIds: string[]; competencyId: string; levelId: string }) =>
    z
      .object({
        studentIds: z.array(z.string().uuid()).min(1).max(200),
        competencyId: z.string().uuid(),
        levelId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_competency_levels").upsert(
      data.studentIds.map((studentId) => ({
        student_id: studentId,
        competency_id: data.competencyId,
        level_id: data.levelId,
        teacher_id: context.userId,
      })),
      { onConflict: "student_id,competency_id" },
    );
    if (error) throw new Error(error.message);
    return { saved: data.studentIds.length };
  });

/** Retire le niveau attribué (la compétence disparaît alors du profil élève). */
export const clearStudentLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentIds: string[]; competencyId: string }) =>
    z
      .object({
        studentIds: z.array(z.string().uuid()).min(1).max(200),
        competencyId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_competency_levels")
      .delete()
      .eq("competency_id", data.competencyId)
      .in("student_id", data.studentIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lecture seule : niveaux effectivement attribués à l'élève identifié par son cookie de session. */
export const getMyProfileCompetencies = createServerFn({ method: "GET" }).handler(
  async (): Promise<StudentProfileActivity[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_competency_levels")
      .select(
        "competency_id, competencies(id, label, position, activity_id, activities(id, name)), competency_levels(label, position)",
      )
      .eq("student_id", studentId);
    if (error) throw new Error(error.message);

    const grouped = new Map<string, StudentProfileActivity>();
    for (const row of rows ?? []) {
      const competency = row.competencies as unknown as {
        id: string;
        label: string;
        position: number;
        activities: { id: string; name: string } | null;
      } | null;
      const level = row.competency_levels as unknown as { label: string; position: number } | null;
      if (!competency?.activities || !level) continue;

      const activity = competency.activities;
      const entry = grouped.get(activity.id) ?? {
        activity_id: activity.id,
        activity_name: activity.name,
        competencies: [],
      };
      entry.competencies.push({
        id: competency.id,
        label: competency.label,
        level_label: level.label,
        level_position: level.position,
      });
      grouped.set(activity.id, entry);
    }

    return [...grouped.values()]
      .map((activity) => ({
        ...activity,
        competencies: activity.competencies.sort((a, b) => a.label.localeCompare(b.label, "fr")),
      }))
      .sort((a, b) => a.activity_name.localeCompare(b.activity_name, "fr"));
  },
);
