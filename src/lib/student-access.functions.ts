import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RedeemResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "revoked" | "unknown" };

export type StudentSessionInfo = {
  firstName: string;
  lastName: string;
  studentCode: string;
  className: string | null;
};

/**
 * Échange un jeton de QR code contre une session élève sécurisée (cookie chiffré).
 * Aucune donnée personnelle n'est transmise par le QR code ni acceptée du client.
 */
export const redeemStudentQr = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().trim().min(10).max(300) }).parse(input),
  )
  .handler(async ({ data }): Promise<RedeemResult> => {
    const {
      signStudentToken,
      hashStudentToken,
      safeEqual,
      getStudentSession,
      loadStudentIdentity,
    } = await import("./student-qr.server");

    const [tokenId] = data.token.split(".");
    if (!tokenId || !z.string().uuid().safeParse(tokenId).success) {
      return { ok: false, reason: "invalid" };
    }
    if (!safeEqual(signStudentToken(tokenId), data.token)) {
      return { ok: false, reason: "invalid" };
    }

    const { db } = await import("./db.server");
    const sql = await db();
    const [row] = await sql<{ student_id: string; active: boolean }[]>`
      select student_id, active from student_qr_tokens
      where token_hash = ${hashStudentToken(data.token)} limit 1
    `;

    if (!row) return { ok: false, reason: "unknown" };
    if (!row.active) return { ok: false, reason: "revoked" };

    const identity = await loadStudentIdentity(sql, row.student_id);
    if (!identity) return { ok: false, reason: "unknown" };

    const session = await getStudentSession();
    await session.update({ studentId: identity.id });

    // Trace de la dernière connexion réussie (visible par l'enseignant).
    await sql`update students set last_login_at = now() where id = ${identity.id}`;

    return { ok: true };
  });

/** Inscription à l'AS de l'élève identifié par son cookie de session QR (lecture seule). */
export const getMyAsMember = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return false;

    const { db } = await import("./db.server");
    const sql = await db();
    const [row] = await sql<{ as_member: boolean }[]>`
      select as_member from students where id = ${studentId} limit 1
    `;
    return Boolean(row?.as_member);
  },
);

export type MyMood = { enabled: boolean; code: string | null; at: string | null };

/** Indicateur d'état de l'élève connecté : autorisation (enseignant) + choix (élève). */
export const getMyMood = createServerFn({ method: "GET" }).handler(async (): Promise<MyMood> => {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  const studentId = session.data.studentId;
  if (!studentId) return { enabled: false, code: null, at: null };

  const { db } = await import("./db.server");
  const sql = await db();
  const [row] = await sql<
    { mood_enabled: boolean; mood_code: string | null; mood_at: Date | string | null }[]
  >`
    select mood_enabled, mood_code, mood_at from students where id = ${studentId} limit 1
  `;
  return {
    enabled: Boolean(row?.mood_enabled),
    code: row?.mood_code ?? null,
    at: row?.mood_at ? new Date(row.mood_at).toISOString() : null,
  };
});

/**
 * L'élève renseigne lui-même son état. Il est identifié uniquement par son
 * cookie de session, et l'écriture est refusée si l'enseignant ne l'a pas autorisé.
 */
export const setMyMood = createServerFn({ method: "POST" })
  .inputValidator((input: { moodCode: string }) =>
    z.object({ moodCode: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data }): Promise<MyMood> => {
    const { MOODS } = await import("./mood");
    if (!MOODS.some((m) => m.code === data.moodCode)) throw new Error("État inconnu");

    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) throw new Error("Session élève absente");

    const { db } = await import("./db.server");
    const sql = await db();
    const [row] = await sql<{ mood_enabled: boolean }[]>`
      select mood_enabled from students where id = ${studentId} limit 1
    `;
    if (!row?.mood_enabled) throw new Error("Cette option n'est pas activée par ton enseignant");

    const [updated] = await sql<{ mood_code: string; mood_at: Date | string }[]>`
      update students set mood_code = ${data.moodCode}, mood_at = now(), updated_at = now()
      where id = ${studentId}
      returning mood_code, mood_at
    `;
    return {
      enabled: true,
      code: updated?.mood_code ?? data.moodCode,
      at: updated?.mood_at ? new Date(updated.mood_at).toISOString() : null,
    };
  });


/** Identité de l'élève déduite uniquement du cookie de session signé côté serveur. */
export const getStudentSessionInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<StudentSessionInfo | null> => {
    const { getStudentSession, loadStudentIdentity } = await import("./student-qr.server");
    const session = await getStudentSession();
    const studentId = session.data.studentId;
    if (!studentId) return null;

    const { db } = await import("./db.server");
    const identity = await loadStudentIdentity(await db(), studentId);
    if (!identity) {
      await session.clear();
      return null;
    }

    return {
      firstName: identity.firstName,
      lastName: identity.lastName,
      studentCode: identity.studentCode,
      className: identity.className,
    };
  },
);

export const signOutStudent = createServerFn({ method: "POST" }).handler(async () => {
  const { getStudentSession } = await import("./student-qr.server");
  const session = await getStudentSession();
  await session.clear();
  return { ok: true };
});

/**
 * Consultation par l'enseignant de l'espace d'un de ses élèves : ouvre une
 * session élève sans jamais toucher à `last_login_at` (aucune connexion
 * n'est enregistrée dans l'historique).
 */
export const viewStudentAsTeacher = createServerFn({ method: "POST" })
  .middleware([(await import("./auth-middleware")).requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const [row] = await context.sql<{ id: string }[]>`
      select id from students where id = ${data.studentId} and teacher_id = ${context.userId} limit 1
    `;
    if (!row) throw new Error("Élève introuvable");

    const { getStudentSession } = await import("./student-qr.server");
    const session = await getStudentSession();
    await session.update({ studentId: row.id });
    return { ok: true };
  });
