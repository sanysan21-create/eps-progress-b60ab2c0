import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProgramSequence } from "@/lib/program-sequences";

const SELECT =
  "id, class_id, activity_id, name, from_session, to_session, position, classes(name), activities(name)";

type Raw = {
  id: string;
  class_id: string | null;
  activity_id: string | null;
  name: string;
  from_session: number | null;
  to_session: number | null;
  position: number | null;
  classes: { name: string } | null;
  activities: { name: string } | null;
};

function mapRows(rows: unknown): ProgramSequence[] {
  return ((rows ?? []) as Raw[]).map((row) => ({
    id: row.id,
    class_id: row.class_id,
    class_name: row.classes?.name ?? null,
    activity_id: row.activity_id,
    activity_name: row.activities?.name ?? null,
    name: row.name,
    from_session: row.from_session,
    to_session: row.to_session,
    position: row.position ?? 0,
  }));
}

/** Séquences programmées par l'enseignant connecté. */
export const listProgramSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgramSequence[]> => {
    const { data, error } = await context.supabase
      .from("program_sequences")
      .select(SELECT)
      .order("position", { ascending: true })
      .order("from_session", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return mapRows(data);
  });

export const saveProgramSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      classId: string | null;
      activityId: string | null;
      fromSession: number | null;
      toSession: number | null;
      position?: number | null;
    }) =>
      z
        .object({
          id: z.string().uuid().nullable().optional(),
          name: z.string().trim().min(1).max(120),
          classId: z.string().uuid().nullable(),
          activityId: z.string().uuid().nullable(),
          fromSession: z.number().int().min(1).max(200).nullable(),
          toSession: z.number().int().min(1).max(200).nullable(),
          position: z.number().int().min(0).max(200).nullable().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      class_id: data.classId,
      activity_id: data.activityId,
      from_session: data.fromSession,
      to_session: data.toSession,
      position: data.position ?? data.fromSession ?? 0,
      teacher_id: context.userId,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("program_sequences")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("program_sequences")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteProgramSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("program_sequences").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lecture seule : séquences visibles par l'élève identifié par sa session QR. */
export const getMyProgramSequences = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgramSequence[]> => {
    const { getStudentSession } = await import("./student-qr.server");
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
      .from("program_sequences")
      .select(SELECT)
      .eq("teacher_id", student.teacher_id)
      .order("position", { ascending: true })
      .order("from_session", { ascending: true, nullsFirst: false });

    const { data: rows, error } =
      classIds.length > 0
        ? await query.or(`class_id.is.null,class_id.in.(${classIds.join(",")})`)
        : await query.is("class_id", null);
    if (error) throw new Error(error.message);
    return mapRows(rows);
  },
);
