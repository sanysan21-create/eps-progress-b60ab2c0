import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";
import type { Db } from "./db.server";
import { ULTIMATE_TEAM_CODES } from "./ultimate";

export type UltimateMatchRow = {
  id: string;
  team_a: string;
  team_b: string;
  score_a: number;
  score_b: number;
  session_number: number | null;
  session_date: string | null;
  activity_name: string | null;
};

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

/** Lecture seule : rencontres d'ultimate visibles par l'élève (toutes les séances). */
export const getMyUltimateMatches = createServerFn({ method: "GET" })
  .middleware([withDb])
  .handler(
    async ({
      context,
    }): Promise<{ my_team: string | null; matches: UltimateMatchRow[] }> => {
      const { getStudentSession } = await import("./student-qr.server");
      const { loadStudentScope } = await import("./program.server");
      const session = await getStudentSession();
      const studentId = session.data.studentId;
      if (!studentId) return { my_team: null, matches: [] };

      const scope = await loadStudentScope(context.sql, studentId);
      if (!scope) return { my_team: null, matches: [] };

      const matches = await context.sql<UltimateMatchRow[]>`
        select m.id, m.team_a, m.team_b, m.score_a, m.score_b,
               p.session_number, p.session_date::text as session_date, a.name as activity_name
        from program_session_matches m
        join program_sessions p on p.id = m.session_id
        join program_sequences q on q.id = p.sequence_id
        left join activities a on a.id = q.activity_id
        where m.teacher_id = ${scope.teacherId}
          ${
            scope.classIds.length > 0
              ? context.sql`and (q.class_id is null or q.class_id = any(${scope.classIds}::uuid[]))`
              : context.sql`and q.class_id is null`
          }
        order by p.session_date asc nulls last, m.created_at asc
      `;

      const teams = await context.sql<{ team: string }[]>`
        select t.team from student_ultimate_teams t
        where t.student_id = ${studentId}
        order by t.updated_at desc limit 1
      `;

      return {
        my_team: teams[0]?.team ?? null,
        matches: matches.map((row) => ({
          ...row,
          score_a: Number(row.score_a),
          score_b: Number(row.score_b),
          session_number: row.session_number === null ? null : Number(row.session_number),
        })),
      };
    },
  );
