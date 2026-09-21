import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher } from "./auth-middleware";
import type { Db } from "./db.server";
import { ULTIMATE_TEAM_CODES } from "./ultimate";

export type SessionMatch = {
  id: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
};

/** Vérifie que la séance appartient bien au professeur connecté. */
async function assertOwnSession(
  sql: Db,
  sessionId: string,
  teacherId: string,
) {
  const rows = await sql<{ id: string }[]>`
    select id from program_sessions
    where id = ${sessionId} and teacher_id = ${teacherId} limit 1
  `;
  if (!rows[0]) throw new Error("Séance introuvable");
}

/** Rencontres enregistrées pour une séance. */
export const listSessionMatches = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<SessionMatch[]> => {
    const rows = await context.sql<SessionMatch[]>`
      select id, team_a, team_b, score_a, score_b
      from program_session_matches
      where session_id = ${data.sessionId} and teacher_id = ${context.userId}
      order by created_at asc
    `;
    return rows.map((row) => ({
      ...row,
      score_a: Number(row.score_a),
      score_b: Number(row.score_b),
    }));
  });

/** Ajoute une rencontre (score entre deux équipes) à une séance. */
export const addSessionMatch = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator(
    (input: {
      sessionId: string;
      teamA: string;
      teamB: string;
      scoreA: number;
      scoreB: number;
    }) =>
      z
        .object({
          sessionId: z.string().uuid(),
          teamA: z.enum(ULTIMATE_TEAM_CODES),
          teamB: z.enum(ULTIMATE_TEAM_CODES),
          scoreA: z.number().int().min(0).max(200),
          scoreB: z.number().int().min(0).max(200),
        })
        .refine((value) => value.teamA !== value.teamB, "Choisis deux équipes différentes.")
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwnSession(context.sql, data.sessionId, context.userId);
    await context.sql`
      insert into program_session_matches (teacher_id, session_id, team_a, team_b, score_a, score_b)
      values (${context.userId}, ${data.sessionId}, ${data.teamA}, ${data.teamB},
              ${data.scoreA}, ${data.scoreB})
    `;
    return { ok: true };
  });

/** Met à jour le score d'une rencontre. */
export const updateSessionMatch = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string; scoreA: number; scoreB: number }) =>
    z
      .object({
        id: z.string().uuid(),
        scoreA: z.number().int().min(0).max(200),
        scoreB: z.number().int().min(0).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      update program_session_matches
      set score_a = ${data.scoreA}, score_b = ${data.scoreB}, updated_at = now()
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });

/** Supprime une rencontre. */
export const deleteSessionMatch = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.sql`
      delete from program_session_matches
      where id = ${data.id} and teacher_id = ${context.userId}
    `;
    return { ok: true };
  });
