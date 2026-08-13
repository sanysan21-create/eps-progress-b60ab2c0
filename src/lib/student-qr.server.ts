import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

export type StudentSessionData = { studentId?: string };

function sessionSecret(): string {
  const secret = process.env["STUDENT_SESSION_SECRET"];
  if (!secret) throw new Error("Configuration de session élève manquante");
  return secret;
}

export function getStudentSession() {
  return useSession<StudentSessionData>({
    password: sessionSecret(),
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
  const mac = createHmac("sha256", sessionSecret()).update(tokenId).digest("base64url");
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

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function loadStudentIdentity(
  admin: AdminClient,
  studentId: string,
): Promise<StudentIdentity | null> {
  const { data, error } = await admin
    .from("students")
    .select("id, first_name, last_name, student_code, class_students(classes(name))")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !data) return null;

  const links = data.class_students as unknown as { classes: { name: string } | null }[] | null;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    studentCode: data.student_code,
    className: links?.[0]?.classes?.name ?? null,
  };
}
