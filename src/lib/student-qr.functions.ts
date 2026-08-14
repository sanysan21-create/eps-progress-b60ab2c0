import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher } from "./auth-middleware";

export type QrStatusRow = {
  student_id: string;
  status: "active" | "revoked" | "none";
  created_at: string | null;
  revoked_at: string | null;
};

export type StudentQr = {
  token: string;
  createdAt: string;
  regeneratedFromEarlier: boolean;
};

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Statuts des QR codes de tous les élèves de l'enseignant connecté. */
export const listQrStatuses = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .handler(async ({ context }): Promise<QrStatusRow[]> => {
    const rows = await context.sql<
      {
        student_id: string;
        active: boolean;
        created_at: Date | string | null;
        revoked_at: Date | string | null;
      }[]
    >`
      select student_id, active, created_at, revoked_at
      from student_qr_tokens
      where teacher_id = ${context.userId}
      order by active desc, created_at desc
    `;

    const byStudent = new Map<string, QrStatusRow>();
    for (const row of rows) {
      if (byStudent.has(row.student_id)) continue;
      byStudent.set(row.student_id, {
        student_id: row.student_id,
        status: row.active ? "active" : "revoked",
        created_at: iso(row.created_at),
        revoked_at: iso(row.revoked_at),
      });
    }
    return [...byStudent.values()];
  });

/** QR code actif d'un élève (le jeton est recalculé côté serveur, jamais stocké en clair). */
export const getStudentQr = createServerFn({ method: "GET" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentQr | null> => {
    const [row] = await context.sql<{ id: string; created_at: Date | string }[]>`
      select id, created_at from student_qr_tokens
      where student_id = ${data.studentId}
        and teacher_id = ${context.userId}
        and active = true
      limit 1
    `;
    if (!row) return null;

    const { signStudentToken } = await import("./student-qr.server");
    return {
      token: signStudentToken(row.id),
      createdAt: iso(row.created_at) ?? new Date().toISOString(),
      regeneratedFromEarlier: false,
    };
  });

/** Génère (ou régénère) le QR code d'un élève : l'ancien jeton est révoqué immédiatement. */
export const generateStudentQr = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { studentId: string }) =>
    z.object({ studentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StudentQr> => {
    const [student] = await context.sql<{ id: string }[]>`
      select id from students where id = ${data.studentId} and teacher_id = ${context.userId}
    `;
    if (!student) throw new Error("Élève introuvable");

    const revoked = await context.sql<{ id: string }[]>`
      update student_qr_tokens
      set active = false, revoked_at = now(), updated_at = now()
      where student_id = ${data.studentId} and teacher_id = ${context.userId} and active = true
      returning id
    `;

    const { signStudentToken, hashStudentToken } = await import("./student-qr.server");
    const tokenId = crypto.randomUUID();
    const token = signStudentToken(tokenId);

    const [row] = await context.sql<{ created_at: Date | string }[]>`
      insert into student_qr_tokens (id, student_id, teacher_id, token_hash)
      values (${tokenId}, ${data.studentId}, ${context.userId}, ${hashStudentToken(token)})
      returning created_at
    `;

    return {
      token,
      createdAt: iso(row?.created_at ?? null) ?? new Date().toISOString(),
      regeneratedFromEarlier: revoked.length > 0,
    };
  });

/** Génère les QR codes manquants pour une classe entière. */
export const generateMissingQrForClass = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { classId: string }) =>
    z.object({ classId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ generated: number }> => {
    const missing = await context.sql<{ student_id: string }[]>`
      select cs.student_id
      from class_students cs
      join classes c on c.id = cs.class_id
      where cs.class_id = ${data.classId}
        and c.teacher_id = ${context.userId}
        and not exists (
          select 1 from student_qr_tokens t
          where t.student_id = cs.student_id and t.active = true
        )
    `;
    if (missing.length === 0) return { generated: 0 };

    const { signStudentToken, hashStudentToken } = await import("./student-qr.server");
    for (const row of missing) {
      const tokenId = crypto.randomUUID();
      await context.sql`
        insert into student_qr_tokens (id, student_id, teacher_id, token_hash)
        values (${tokenId}, ${row.student_id}, ${context.userId}, ${hashStudentToken(signStudentToken(tokenId))})
      `;
    }
    return { generated: missing.length };
  });
