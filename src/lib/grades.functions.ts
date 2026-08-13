import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { GradeRow } from "@/lib/grades";

/** Notes d'un élève (lecture enseignant, uniquement ses propres élèves via RLS). */
export const listStudentGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<GradeRow[]> => {
    const { mapGradeRows } = await import("./grades.server");
    const { data: rows, error } = await context.supabase
      .from("student_grades")
      .select(
        "id, student_id, activity_id, evaluated_on, comment, activities(name), student_grade_items(id, position, label, competency_id, points, max_points, competencies(label))",
      )
      .eq("student_id", data.studentId)
      .order("evaluated_on", { ascending: false });
    if (error) throw new Error(error.message);
    return mapGradeRows(rows);
  });

/** Crée ou met à jour la note d'un élève pour une activité (AFL1/AFL2/AFL3). */
export const saveStudentGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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

    for (const studentId of data.studentIds) {
      const { data: grade, error } = await context.supabase
        .from("student_grades")
        .upsert(
          {
            student_id: studentId,
            activity_id: data.activityId,
            teacher_id: context.userId,
            evaluated_on: data.evaluatedOn ?? new Date().toISOString().slice(0, 10),
            comment: data.comment ?? null,
          },
          { onConflict: "student_id,activity_id" },
        )
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const { error: clearError } = await context.supabase
        .from("student_grade_items")
        .delete()
        .eq("grade_id", grade.id);
      if (clearError) throw new Error(clearError.message);

      const { error: insertError } = await context.supabase.from("student_grade_items").insert(
        data.items.map((item, index) => ({
          grade_id: grade.id,
          teacher_id: context.userId,
          position: index + 1,
          label: item.label,
          competency_id: item.competencyId,
          points: item.points,
          max_points: item.maxPoints,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    }

    return { saved: data.studentIds.length };
  });

export const deleteStudentGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_grades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Lecture seule : notes de l'élève identifié par son cookie de session QR.
 * L'identifiant vient exclusivement du cookie signé, jamais du navigateur,
 * un élève ne peut donc pas consulter les notes d'un autre élève.
 */
export const getMyGrades = createServerFn({ method: "GET" }).handler(
  async (): Promise<GradeRow[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const { mapGradeRows } = await import("./grades.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_grades")
      .select(
        "id, student_id, activity_id, evaluated_on, comment, activities(name), student_grade_items(id, position, label, competency_id, points, max_points, competencies(label))",
      )
      .eq("student_id", studentId)
      .order("evaluated_on", { ascending: false });
    if (error) throw new Error(error.message);
    return mapGradeRows(rows);
  },
);
