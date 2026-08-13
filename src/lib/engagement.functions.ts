import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EngagementMark = { indicator_code: string; level: number };

const codeSchema = z.string().trim().min(1).max(60);
const studentIdsSchema = z.array(z.string().uuid()).min(1).max(200);

/** Implication renseignée par l'enseignant pour un élève. */
export const listStudentEngagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<EngagementMark[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_engagement")
      .select("indicator_code, level")
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setStudentEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { error } = await context.supabase.from("student_engagement").upsert(
      data.studentIds.map((studentId) => ({
        student_id: studentId,
        indicator_code: data.indicatorCode,
        level: data.level,
        teacher_id: context.userId,
      })),
      { onConflict: "student_id,indicator_code" },
    );
    if (error) throw new Error(error.message);
    return { saved: data.studentIds.length };
  });

export const clearStudentEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentIds: string[]; indicatorCode: string }) =>
    z.object({ studentIds: studentIdsSchema, indicatorCode: codeSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_engagement")
      .delete()
      .eq("indicator_code", data.indicatorCode)
      .in("student_id", data.studentIds);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Lecture seule pour l'enseignant : points forts choisis par l'élève lui-même.
 * L'enseignant ne peut jamais les attribuer ni les modifier.
 */
export const getStudentStrengthChoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_strength_choices")
      .select("strength_code")
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.strength_code);
  });

/** Lecture seule pour l'enseignant : objectif choisi par l'élève lui-même. */
export const getStudentGoalChoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string | null> => {
    const { data: row, error } = await context.supabase
      .from("student_goal_choices")
      .select("goal_code")
      .eq("student_id", data.studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row?.goal_code ?? null;
  });

/** Lecture seule : implication de l'élève identifié par son cookie de session QR. */
export const getMyEngagement = createServerFn({ method: "GET" }).handler(
  async (): Promise<EngagementMark[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_engagement")
      .select("indicator_code, level")
      .eq("student_id", studentId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  },
);

/** Points forts personnels de l'élève connecté (choisis par lui-même). */
export const getMyStrengths = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_strength_choices")
      .select("strength_code")
      .eq("student_id", studentId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.strength_code);
  },
);

/** Objectif personnel de l'élève connecté (choisi par lui-même). */
export const getMyGoal = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("student_goal_choices")
      .select("goal_code")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row?.goal_code ?? null;
  },
);

/**
 * Écriture réservée à l'élève : ses 3 points forts personnels.
 * L'élève est identifié par le cookie de session créé après validation du QR code,
 * jamais par une donnée envoyée depuis le navigateur.
 */
export const setMyStrengths = createServerFn({ method: "POST" })
  .inputValidator((input: { strengthCodes: string[] }) =>
    z.object({ strengthCodes: z.array(codeSchema).length(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { STRENGTHS, MAX_STRENGTHS } = await import("./engagement");
    const codes = Array.from(new Set(data.strengthCodes));
    if (codes.length !== MAX_STRENGTHS) throw new Error("Choisis 3 points forts différents");
    if (!codes.every((code) => STRENGTHS.some((s) => s.code === code))) {
      throw new Error("Point fort inconnu");
    }

    const { studentId, teacherId } = await resolveStudent();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: deleteError } = await supabaseAdmin
      .from("student_strength_choices")
      .delete()
      .eq("student_id", studentId);
    if (deleteError) throw new Error(deleteError.message);

    const { error } = await supabaseAdmin.from("student_strength_choices").insert(
      codes.map((strength_code) => ({
        student_id: studentId,
        teacher_id: teacherId,
        strength_code,
      })),
    );
    if (error) throw new Error(error.message);
    return { strengthCodes: codes };
  });

/** Écriture réservée à l'élève : son objectif personnel (un seul). */
export const setMyGoal = createServerFn({ method: "POST" })
  .inputValidator((input: { goalCode: string }) =>
    z.object({ goalCode: codeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { GOALS } = await import("./engagement");
    if (!GOALS.some((g) => g.code === data.goalCode)) throw new Error("Objectif inconnu");

    const { studentId, teacherId } = await resolveStudent();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("student_goal_choices").upsert(
      { student_id: studentId, teacher_id: teacherId, goal_code: data.goalCode },
      { onConflict: "student_id" },
    );
    if (error) throw new Error(error.message);
    return { goalCode: data.goalCode };
  });
