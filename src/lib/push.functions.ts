import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withDb } from "./auth-middleware";

export const getPushPublicKey = createServerFn({ method: "GET" }).handler(
  async () => process.env["VAPID_PUBLIC_KEY"] ?? null,
);

/** Enregistre le téléphone de l'élève connecté (identité issue de la session QR). */
export const subscribePush = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { endpoint: string; p256dh: string; auth: string }) =>
    z.object({
      endpoint: z.string().url().startsWith("https://").max(2000),
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getStudentSession } = await import("./student-qr.server");
    const studentId = (await getStudentSession()).data.studentId;
    if (!studentId) throw new Error("Session élève absente");
    await context.sql`
      insert into student_push_subscriptions (student_id, endpoint, p256dh, auth)
      values (${studentId}, ${data.endpoint}, ${data.p256dh}, ${data.auth})
      on conflict (endpoint) do update set student_id = excluded.student_id,
        p256dh = excluded.p256dh, auth = excluded.auth`;
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { endpoint: string }) => z.object({ endpoint: z.string().max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getStudentSession } = await import("./student-qr.server");
    const studentId = (await getStudentSession()).data.studentId;
    if (!studentId) return { ok: false };
    await context.sql`delete from student_push_subscriptions
      where endpoint = ${data.endpoint} and student_id = ${studentId}`;
    return { ok: true };
  });
