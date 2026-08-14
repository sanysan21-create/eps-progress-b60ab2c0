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
