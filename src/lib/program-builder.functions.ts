import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher } from "./auth-middleware";
import type { SequenceDetail } from "./program-builder";

const FILE_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
];

/** Séquences du professeur connecté, avec séances, ressources et barème. */
export const listSequenceDetails = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<SequenceDetail[]> => {
    const { loadSequenceDetails } = await import("./program-builder.server");
    return loadSequenceDetails(context.sql, context.userId);
  });

/** Crée une séquence et génère automatiquement une séance par semaine. */
export const createSequence = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      name: string;
      classId: string;
      activityId: string;
      startDate: string;
      endDate: string;
    }) =>
      z
        .object({
          name: z.string().trim().min(1).max(120),
          classId: z.string().uuid(),
          activityId: z.string().uuid(),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début invalide"),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin invalide"),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { weeklyDates } = await import("./program-builder");
    const dates = weeklyDates(data.startDate, data.endDate);
    if (dates.length === 0) {
      throw new Error("Période invalide : la date de fin doit suivre la date de début.");
    }

    // Vérifications de propriété côté serveur (jamais seulement dans l'interface).
    const [klass] = await context.sql<{ id: string }[]>`
      select id from classes where id = ${data.classId} and teacher_id = ${context.userId} limit 1
    `;
    if (!klass) throw new Error("Classe introuvable");
    const [activity] = await context.sql<{ id: string; name: string }[]>`
      select id, name from activities
      where id = ${data.activityId} and teacher_id = ${context.userId} limit 1
    `;
    if (!activity) throw new Error("Activité introuvable");

    const [sequence] = await context.sql<{ id: string }[]>`
      insert into program_sequences
        (teacher_id, name, class_id, activity_id, start_date, end_date, from_session, to_session, position)
      values (${context.userId}, ${data.name}, ${data.classId}, ${data.activityId},
              ${data.startDate}::date, ${data.endDate}::date, 1, ${dates.length}, 0)
      returning id
    `;
    if (!sequence) throw new Error("Création impossible");

    for (const [index, date] of dates.entries()) {
      await context.sql`
        insert into program_sessions
          (teacher_id, sequence_id, class_id, activity_id, activity_name, session_date, session_number)
        values (${context.userId}, ${sequence.id}, ${data.classId}, ${data.activityId},
                ${activity.name}, ${date}::date, ${index + 1})
      `;
    }

    return { id: sequence.id };
  });

export const updateSequence = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      id: string;
      name: string;
      classId: string;
      activityId: string;
      startDate: string | null;
      endDate: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          name: z.string().trim().min(1).max(120),
          classId: z.string().uuid(),
          activityId: z.string().uuid(),
          startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable(),
          endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await context.sql<{ id: string }[]>`
      update program_sequences set
        name = ${data.name},
        class_id = ${data.classId},
        activity_id = ${data.activityId},
        start_date = ${data.startDate}::date,
        end_date = ${data.endDate}::date,
        updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
      returning id
    `;
    if (rows.length === 0) throw new Error("Séquence introuvable");
    await context.sql`
      update program_sessions set class_id = ${data.classId}, activity_id = ${data.activityId}, updated_at = now()
      where sequence_id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

export const deleteSequence = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from program_sequences where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Ajoute une séance manuelle à la fin d'une séquence. */
export const addSequenceSession = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sequenceId: string; sessionDate?: string | null }) =>
    z
      .object({
        sequenceId: z.string().uuid(),
        sessionDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [sequence] = await context.sql<
      { class_id: string | null; activity_id: string | null; activity_name: string | null }[]
    >`
      select s.class_id, s.activity_id, a.name as activity_name
      from program_sequences s
      left join activities a on a.id = s.activity_id
      where s.id = ${data.sequenceId} and s.teacher_id = ${context.userId}
      limit 1
    `;
    if (!sequence) throw new Error("Séquence introuvable");

    const [last] = await context.sql<{ n: number | null; d: string | null }[]>`
      select max(session_number) as n, max(session_date)::text as d
      from program_sessions
      where sequence_id = ${data.sequenceId} and teacher_id = ${context.userId}
    `;
    let date = data.sessionDate ?? null;
    if (!date && last?.d) {
      const next = new Date(`${last.d}T12:00:00`);
      next.setDate(next.getDate() + 7);
      date = next.toISOString().slice(0, 10);
    }

    const [row] = await context.sql<{ id: string }[]>`
      insert into program_sessions
        (teacher_id, sequence_id, class_id, activity_id, activity_name, session_date, session_number)
      values (${context.userId}, ${data.sequenceId}, ${sequence.class_id}, ${sequence.activity_id},
              ${sequence.activity_name ?? "Activité"}, ${date}::date, ${(last?.n ?? 0) + 1})
      returning id
    `;
    if (!row) throw new Error("Ajout impossible");
    await renumber(context.sql, context.userId, data.sequenceId);
    return { id: row.id };
  });

export const saveSequenceSession = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      id: string;
      sessionDate: string | null;
      objective: string | null;
      keyPoints: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          sessionDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
            .nullable(),
          objective: z.string().trim().max(2000).nullable(),
          keyPoints: z.string().trim().max(2000).nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const rows = await context.sql<{ sequence_id: string | null }[]>`
      update program_sessions set
        session_date = ${data.sessionDate}::date,
        objective = ${data.objective},
        key_points = ${data.keyPoints},
        updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
      returning sequence_id
    `;
    const row = rows[0];
    if (!row) throw new Error("Séance introuvable");
    if (row.sequence_id) await renumber(context.sql, context.userId, row.sequence_id);
    return { ok: true };
  });

export const deleteSequenceSession = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const rows = await context.sql<{ sequence_id: string | null }[]>`
      delete from program_sessions
      where id = ${data.id} and teacher_id = ${context.userId}
      returning sequence_id
    `;
    const row = rows[0];
    if (row?.sequence_id) await renumber(context.sql, context.userId, row.sequence_id);
    return { ok: true };
  });

/** Ajoute une ressource (PDF, image, document, vidéo courte) à une séance. */
export const addSessionFile = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string; name: string; contentType: string; dataBase64: string }) =>
    z
      .object({
        sessionId: z.string().uuid(),
        name: z.string().trim().min(1).max(160),
        contentType: z.string().refine((v) => FILE_MIME.includes(v), "Format de fichier non permis"),
        dataBase64: z.string().min(1).max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [session] = await context.sql<{ id: string }[]>`
      select id from program_sessions
      where id = ${data.sessionId} and teacher_id = ${context.userId} limit 1
    `;
    if (!session) throw new Error("Séance introuvable");

    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Fichier trop lourd (8 Mo maximum).");

    const [file] = await context.sql<{ id: string }[]>`
      insert into app_files (teacher_id, content_type, data)
      values (${context.userId}, ${data.contentType}, ${bytes})
      returning id
    `;
    if (!file) throw new Error("Envoi impossible");

    await context.sql`
      insert into program_session_files (teacher_id, session_id, file_id, name, content_type)
      values (${context.userId}, ${data.sessionId}, ${file.id}, ${data.name}, ${data.contentType})
    `;
    return { fileId: file.id, url: `/api/files/${file.id}` };
  });

export const deleteSessionFile = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from program_session_files where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Enregistre le barème complet d'une séquence (remplacement atomique). */
export const saveSequenceCriteria = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      sequenceId: string;
      criteria: { label: string; points: number; competencyId: string | null }[];
    }) =>
      z
        .object({
          sequenceId: z.string().uuid(),
          criteria: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(160),
                points: z.number().min(0).max(100),
                competencyId: z.string().uuid().nullable(),
              }),
            )
            .max(20),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const [sequence] = await context.sql<{ id: string }[]>`
      select id from program_sequences
      where id = ${data.sequenceId} and teacher_id = ${context.userId} limit 1
    `;
    if (!sequence) throw new Error("Séquence introuvable");

    await context.sql`
      delete from program_criteria
      where sequence_id = ${data.sequenceId} and teacher_id = ${context.userId}
    `;
    for (const [index, item] of data.criteria.entries()) {
      await context.sql`
        insert into program_criteria (teacher_id, sequence_id, competency_id, label, points, position)
        values (${context.userId}, ${data.sequenceId}, ${item.competencyId}, ${item.label},
                ${item.points}, ${index})
      `;
    }
    return { ok: true };
  });

type Sql = { <T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> };

/** Renumérote S1, S2, S3… par date croissante après toute modification. */
async function renumber(sql: unknown, teacherId: string, sequenceId: string) {
  const run = sql as Sql;
  await run`
    with ordered as (
      select id, row_number() over (order by session_date asc nulls last, created_at asc) as n
      from program_sessions
      where sequence_id = ${sequenceId} and teacher_id = ${teacherId}
    )
    update program_sessions p set session_number = ordered.n
    from ordered where ordered.id = p.id
  `;
}
