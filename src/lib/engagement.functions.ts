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

export const listStudentStrengths = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<string[]> => {
    const { data: rows, error } = await context.supabase
      .from("student_strengths")
      .select("strength_code")
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.strength_code);
  });

export const toggleStudentStrength = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentIds: string[]; strengthCode: string; selected: boolean }) =>
    z
      .object({
        studentIds: studentIdsSchema,
        strengthCode: codeSchema,
        selected: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.selected) {
      const { error } = await context.supabase.from("student_strengths").upsert(
        data.studentIds.map((studentId) => ({
          student_id: studentId,
          strength_code: data.strengthCode,
          teacher_id: context.userId,
        })),
        { onConflict: "student_id,strength_code" },
      );
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await context.supabase
      .from("student_strengths")
      .delete()
      .eq("strength_code", data.strengthCode)
      .in("student_id", data.studentIds);
    if (error) throw new Error(error.message);
    return { ok: true };
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

/** Lecture seule : points forts sélectionnés par l'enseignant pour l'élève connecté. */
export const getMyStrengths = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("student_strengths")
      .select("strength_code")
      .eq("student_id", studentId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => row.strength_code);
  },
);
