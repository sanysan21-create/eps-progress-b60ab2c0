import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import type { ProgramSession } from "@/lib/program";

const SCALE_MIME = ["image/png", "image/jpeg", "image/webp"];

/** Programme renseigné par l'enseignant (toutes ses séances planifiées). */
export const listProgramSessions = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<ProgramSession[]> => {
    const { loadProgramSessions } = await import("./program.server");
    return loadProgramSessions(context.sql, context.userId);
  });

/** Envoie une image de barème et renvoie son identifiant de fichier. */
export const uploadScaleImage = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { contentType: string; dataBase64: string }) =>
    z
      .object({
        contentType: z.string().refine((v) => SCALE_MIME.includes(v), "Format d'image non permis"),
        dataBase64: z.string().min(1).max(9_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Image trop lourde (5 Mo maximum).");

    const [file] = await context.sql<{ id: string }[]>`
      insert into app_files (teacher_id, content_type, data)
      values (${context.userId}, ${data.contentType}, ${bytes})
      returning id
    `;
    if (!file) throw new Error("Envoi impossible");
    return { fileId: file.id, url: `/api/files/${file.id}` };
  });

export const saveProgramSession = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
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
      scaleActivityId?: string | null;
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
          scaleActivityId: z.string().uuid().nullable().optional(),
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

    const scaleFileId = data.scaleImagePath ?? null;
    const scaleActivityId = scaleFileId ? (data.scaleActivityId ?? null) : null;

    if (data.id) {
      await context.sql`
        update program_sessions set
          class_id = ${data.classId},
          activity_id = ${data.activityId},
          activity_name = ${data.activityName ?? "Activité"},
          session_date = ${data.sessionDate}::date,
          period_label = ${data.periodLabel ?? null},
          objective = ${data.objective ?? null},
          description = ${data.description ?? null},
          scale_file_id = ${scaleFileId},
          scale_activity_id = ${scaleActivityId},
          updated_at = now()
        where id = ${data.id} and teacher_id = ${context.userId}
      `;
      return { id: data.id };
    }

    const [row] = await context.sql<{ id: string }[]>`
      insert into program_sessions
        (teacher_id, class_id, activity_id, activity_name, session_date, period_label, objective, description, scale_file_id, scale_activity_id)
      values (
        ${context.userId}, ${data.classId}, ${data.activityId}, ${data.activityName ?? "Activité"},
        ${data.sessionDate}::date, ${data.periodLabel ?? null}, ${data.objective ?? null},
        ${data.description ?? null}, ${scaleFileId}, ${scaleActivityId}
      )
      returning id
    `;
    if (!row) throw new Error("Enregistrement impossible");
    return { id: row.id };
  });

export const deleteProgramSession = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from program_sessions where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Lecture seule : programme destiné à l'élève identifié par son cookie de session QR. */
export const getMyProgram = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(async ({ context }): Promise<ProgramSession[]> => {
    const { getStudentSession } = await import("./student-qr.server");
    const { loadProgramSessions, loadStudentScope } = await import("./program.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return [];

    const scope = await loadStudentScope(context.sql, studentId);
    if (!scope) return [];
    return loadProgramSessions(context.sql, scope.teacherId, scope.classIds);
  });
