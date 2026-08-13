import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProgramSession } from "@/lib/program";

/** Programme renseigné par l'enseignant (toutes ses séances planifiées). */
export const listProgramSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgramSession[]> => {
    const { mapProgramRows, withSignedScaleUrls } = await import("./program.server");
    const { data, error } = await context.supabase
      .from("program_sessions")
      .select(
        "id, class_id, activity_id, activity_name, session_date, period_label, objective, description, scale_image_path, classes(name), activities(name)",
      )
      .order("session_date", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return withSignedScaleUrls(mapProgramRows(data));
  });

export const saveProgramSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      classId: string | null;
      activityId: string | null;
      activityName?: string | null;
      sessionDate: string | null;
      periodLabel?: string | null;
      objective?: string | null;
      description?: string | null;
      scaleImagePath?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid().nullable().optional(),
          classId: z.string().uuid().nullable(),
          activityId: z.string().uuid().nullable(),
          activityName: z.string().trim().max(120).nullable().optional(),
          sessionDate: z.string().trim().min(1).max(20).nullable(),
          periodLabel: z.string().trim().max(120).nullable().optional(),
          objective: z.string().trim().max(1000).nullable().optional(),
          description: z.string().trim().max(1000).nullable().optional(),
          scaleImagePath: z.string().trim().max(400).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.activityId && !data.activityName) {
      throw new Error("Choisis une activité pour cette séance.");
    }
    if (!data.sessionDate && !data.periodLabel) {
      throw new Error("Renseigne une date ou une période.");
    }

    const payload = {
      class_id: data.classId,
      activity_id: data.activityId,
      activity_name: data.activityName ?? "",
      session_date: data.sessionDate,
      period_label: data.periodLabel ?? null,
      objective: data.objective ?? null,
      description: data.description ?? null,
      scale_image_path: data.scaleImagePath ?? null,
      teacher_id: context.userId,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("program_sessions")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("program_sessions")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteProgramSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("program_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Lecture seule : programme destiné à l'élève identifié par son cookie de session QR.
 * On ne renvoie que les séances de son enseignant, pour sa classe (ou communes).
 */
export const getMyProgram = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgramSession[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const { mapProgramRows, withSignedScaleUrls } = await import("./program.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("teacher_id, class_students(class_id)")
      .eq("id", studentId)
      .maybeSingle();
    if (studentError) throw new Error(studentError.message);
    if (!student) return [];

    const classIds = ((student.class_students ?? []) as { class_id: string }[]).map(
      (link) => link.class_id,
    );

    const query = supabaseAdmin
      .from("program_sessions")
      .select(
        "id, class_id, activity_id, activity_name, session_date, period_label, objective, description, scale_image_path, classes(name), activities(name)",
      )
      .eq("teacher_id", student.teacher_id)
      .order("session_date", { ascending: true, nullsFirst: false });

    const { data: rows, error } =
      classIds.length > 0
        ? await query.or(`class_id.is.null,class_id.in.(${classIds.join(",")})`)
        : await query.is("class_id", null);
    if (error) throw new Error(error.message);
    return withSignedScaleUrls(mapProgramRows(rows));
  },
);
