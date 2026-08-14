import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireTeacher, withDb } from "./auth-middleware";

export type TeacherAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

const emailSchema = z.string().trim().toLowerCase().email("E-mail invalide").max(160);
const passwordSchema = z.string().min(8, "8 caractères minimum").max(200);
const nameSchema = z.string().trim().min(1, "Champ requis").max(80);

type TeacherRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_file_id: string | null;
};

function toAccount(row: TeacherRow): TeacherAccount {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_file_id ? `/api/files/${row.avatar_file_id}` : null,
  };
}

export const signUpTeacher = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator(
    (input: { email: string; password: string; firstName: string; lastName: string }) =>
      z
        .object({
          email: emailSchema,
          password: passwordSchema,
          firstName: nameSchema,
          lastName: nameSchema,
        })
        .parse(input),
  )
  .handler(async ({ data, context }): Promise<TeacherAccount> => {
    const { hashPassword, getTeacherSession } = await import("./auth.server");

    const existing = await context.sql<{ id: string }[]>`
      select id from teachers where email = ${data.email} limit 1
    `;
    if (existing.length > 0) throw new Error("Cette adresse e-mail possède déjà un compte.");

    const hash = await hashPassword(data.password);
    const [inserted] = await context.sql<TeacherRow[]>`
      insert into teachers (email, password_hash, first_name, last_name)
      values (${data.email}, ${hash}, ${data.firstName}, ${data.lastName})
      returning id, email, first_name, last_name, avatar_file_id
    `;
    const row = inserted!;

    const session = await getTeacherSession();
    await session.update({ teacherId: row.id });
    return toAccount(row);
  });

export const signInTeacher = createServerFn({ method: "POST" })
  .middleware([withDb])
  .inputValidator((input: { email: string; password: string }) =>
    z.object({ email: emailSchema, password: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<TeacherAccount> => {
    const { verifyPassword, getTeacherSession } = await import("./auth.server");

    const [row] = await context.sql<(TeacherRow & { password_hash: string })[]>`
      select id, email, first_name, last_name, avatar_file_id, password_hash
      from teachers where email = ${data.email} limit 1
    `;
    const ok = row ? await verifyPassword(data.password, row.password_hash) : false;
    if (!row || !ok) throw new Error("E-mail ou mot de passe incorrect.");

    const session = await getTeacherSession();
    await session.update({ teacherId: row.id });
    return toAccount(row);
  });

export const signOutTeacher = createServerFn({ method: "POST" }).handler(async () => {
  const { getTeacherSession } = await import("./auth.server");
  const session = await getTeacherSession();
  await session.clear();
  return { ok: true };
});

export const getTeacherAccount = createServerFn({ method: "GET" }).handler(
  async (): Promise<TeacherAccount | null> => {
    const { currentTeacherId } = await import("./auth.server");
    const teacherId = await currentTeacherId();
    if (!teacherId) return null;

    const { db } = await import("./db.server");
    const sql = await db();
    const [row] = await sql<TeacherRow[]>`
      select id, email, first_name, last_name, avatar_file_id
      from teachers where id = ${teacherId} limit 1
    `;
    return row ? toAccount(row) : null;
  },
);

export const updateTeacherIdentity = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { firstName: string; lastName: string }) =>
    z.object({ firstName: nameSchema, lastName: nameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await context.sql`
      update teachers
      set first_name = ${data.firstName}, last_name = ${data.lastName}, updated_at = now()
      where id = ${context.userId}
    `;
    return { ok: true };
  });

export const changeTeacherEmailFn = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { email: string }) => z.object({ email: emailSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const taken = await context.sql<{ id: string }[]>`
      select id from teachers where email = ${data.email} and id <> ${context.userId} limit 1
    `;
    if (taken.length > 0) throw new Error("Cette adresse e-mail est déjà utilisée.");
    await context.sql`
      update teachers set email = ${data.email}, updated_at = now() where id = ${context.userId}
    `;
    return { ok: true };
  });

export const changeTeacherPassword = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { currentPassword: string; newPassword: string }) =>
    z
      .object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { verifyPassword, hashPassword } = await import("./auth.server");
    const [row] = await context.sql<{ password_hash: string }[]>`
      select password_hash from teachers where id = ${context.userId} limit 1
    `;
    if (!row || !(await verifyPassword(data.currentPassword, row.password_hash))) {
      throw new Error("Mot de passe actuel incorrect.");
    }
    const hash = await hashPassword(data.newPassword);
    await context.sql`
      update teachers set password_hash = ${hash}, updated_at = now() where id = ${context.userId}
    `;
    return { ok: true };
  });

const AVATAR_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const uploadTeacherAvatarFn = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .inputValidator((input: { contentType: string; dataBase64: string }) =>
    z
      .object({
        contentType: z.string().refine((v) => AVATAR_MIME.includes(v), "Format d'image non permis"),
        dataBase64: z.string().min(1).max(6_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("Image trop lourde (3 Mo maximum).");

    const [inserted] = await context.sql<{ id: string }[]>`
      insert into app_files (teacher_id, content_type, data)
      values (${context.userId}, ${data.contentType}, ${bytes})
      returning id
    `;
    const file = inserted!;
    const [previous] = await context.sql<{ avatar_file_id: string | null }[]>`
      select avatar_file_id from teachers where id = ${context.userId}
    `;
    await context.sql`
      update teachers set avatar_file_id = ${file.id}, updated_at = now() where id = ${context.userId}
    `;
    if (previous?.avatar_file_id) {
      await context.sql`delete from app_files where id = ${previous.avatar_file_id}`;
    }
    return { avatarUrl: `/api/files/${file.id}` };
  });

export const removeTeacherAvatarFn = createServerFn({ method: "POST" })
  .middleware([requireTeacher])
  .handler(async ({ context }) => {
    const [previous] = await context.sql<{ avatar_file_id: string | null }[]>`
      select avatar_file_id from teachers where id = ${context.userId}
    `;
    await context.sql`
      update teachers set avatar_file_id = null, updated_at = now() where id = ${context.userId}
    `;
    if (previous?.avatar_file_id) {
      await context.sql`delete from app_files where id = ${previous.avatar_file_id}`;
    }
    return { ok: true };
  });
