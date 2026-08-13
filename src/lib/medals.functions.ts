import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const medalSchema = z.enum(["bronze", "silver", "gold"]);

export type StudentMedalRow = { student_id: string; medal: string };

/** Médailles déjà attribuées par l'enseignant (une seule par élève). */
export const listStudentMedals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StudentMedalRow[]> => {
    const { data, error } = await context.supabase
      .from("student_medals")
      .select("student_id, medal");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Attribue (ou remplace) la médaille d'un élève. */
export const setStudentMedal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string; medal: string }) =>
    z.object({ studentId: z.string().uuid(), medal: medalSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_medals").upsert(
      {
        student_id: data.studentId,
        medal: data.medal,
        teacher_id: context.userId,
      },
      { onConflict: "student_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearStudentMedal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("student_medals")
      .delete()
      .eq("student_id", data.studentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lecture seule : médaille de l'élève identifié par son cookie de session QR. */
export const getMyMedal = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("student_medals")
      .select("medal")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.medal ?? null;
  },
);
