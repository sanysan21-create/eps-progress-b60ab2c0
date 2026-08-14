import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

import type { Db } from "./db.server";

export type StudentSessionData = { studentId?: string };

export function getStudentSession() {
  // Import dynamique différé : appSecret() lit une variable d'environnement serveur.
  const secretModule = require("./auth.server") as typeof import("./auth.server");
  return useSession<StudentSessionData>({
    password: secretModule.appSecret(),
    name: "eps-student-session",
    maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
  });
}

/**
 * The raw token is never stored: it is derived from the row id with an HMAC
 * keyed by a server-only secret, so it can be re-displayed by the teacher but
 * cannot be guessed or recovered from the database alone.
 */
export function signStudentToken(tokenId: string): string {
  const { appSecret } = require("./auth.server") as typeof import("./auth.server");
  const mac = createHmac("sha256", appSecret()).update(tokenId).digest("base64url");
  return `${tokenId}.${mac}`;
}

export function hashStudentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export type StudentIdentity = {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  className: string | null;
};

/** Charge l'identité élève en SQL (jointure via class_students/classes). */
export async function loadStudentIdentity(sql: Db, studentId: string): Promise<StudentIdentity | null> {
  const [row] = await sql<
    { id: string; first_name: string; last_name: string; student_code: string; class_name: string | null }[]
  >`
    select s.id, s.first_name, s.last_name, s.student_code, c.name as class_name
    from students s
    left join class_students cs on cs.student_id = s.id
    left join classes c on c.id = cs.class_id
    where s.id = ${studentId}
    limit 1
  `;
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    studentCode: row.student_code,
    className: row.class_name,
  };
}
