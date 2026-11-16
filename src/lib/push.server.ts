/** Envoi des notifications push Web vers les téléphones des élèves. */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { Db } from "./db.server";

export type PushContent = { title: string; body: string; url: string };

export async function notifyStudents(sql: Db, studentIds: string[], content: PushContent) {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey || studentIds.length === 0) return;
  try {
    const subs = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }[]>`
      select id, endpoint, p256dh, auth from student_push_subscriptions
      where student_id = any(${studentIds}::uuid[])`;
    const vapid = { subject: "mailto:contact@epsprogress.app", publicKey, privateKey };
    await Promise.allSettled(
      subs.map(async (sub) => {
        const payload = await buildPushPayload(
          { data: JSON.stringify(content), options: { ttl: 86400 } },
          { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          vapid,
        );
        const res = await fetch(sub.endpoint, payload);
        if (res.status === 404 || res.status === 410) {
          await sql`delete from student_push_subscriptions where id = ${sub.id}`;
        }
      }),
    );
  } catch (error) {
    console.error("push failed", error);
  }
}

/** Tous les élèves de la classe de la séance (ou de toutes les classes de l'enseignant). */
export async function notifyQuizClass(sql: Db, sessionId: string, title: string) {
  const rows = await sql<{ student_id: string; label: string }[]>`
    select distinct cs.student_id, coalesce(z.title, 'QCM') as label
    from program_sessions p
    join session_quizzes z on z.session_id = p.id
    join class_students cs on cs.teacher_id = p.teacher_id
      and (p.class_id is null or cs.class_id = p.class_id)
    where p.id = ${sessionId}`;
  await notifyStudents(sql, rows.map((r) => r.student_id), {
    title, body: rows[0]?.label ?? "", url: "/eleve/programme",
  });
}
