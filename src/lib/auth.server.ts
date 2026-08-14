/**
 * Authentification maison (email + mot de passe) — aucune dépendance externe.
 * Mots de passe : PBKDF2-SHA256 via WebCrypto (compatible Cloudflare Workers).
 * Sessions : cookie scellé (useSession) signé avec APP_SESSION_SECRET.
 */
import { useSession } from "@tanstack/react-start/server";

// Cloudflare Workers limite PBKDF2 à 100 000 itérations maximum.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_MAX_ITERATIONS = 100_000;

export function appSecret(): string {
  const secret = process.env["APP_SESSION_SECRET"] ?? process.env["STUDENT_SESSION_SECRET"];
  if (!secret || secret.length < 24) {
    throw new Error(
      "APP_SESSION_SECRET manquant ou trop court (32 caractères minimum recommandés).",
    );
  }
  return secret;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as unknown as BufferSource,
      iterations: Math.min(iterations, PBKDF2_MAX_ITERATIONS),
    },
    key,
    256,
  );
  return toBase64(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltB64, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltB64 || !expected) return false;
  const iterations = Number(iterStr) || PBKDF2_ITERATIONS;
  const actual = await derive(password, fromBase64(saltB64), iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export type TeacherSessionData = { teacherId?: string };

export function getTeacherSession() {
  return useSession<TeacherSessionData>({
    password: appSecret(),
    name: "eps-teacher-session",
    maxAge: 60 * 60 * 24 * 30,
    cookie: { httpOnly: true, sameSite: "lax", path: "/" },
  });
}

export async function currentTeacherId(): Promise<string | null> {
  const session = await getTeacherSession();
  return session.data.teacherId ?? null;
}

/** Vérifie le code d'accès enseignant (comparaison à temps constant, côté serveur). */
export async function teacherCodeMatches(input: string): Promise<boolean> {
  const expected = process.env["TEACHER_SIGNUP_CODE"];
  if (!expected) throw new Error("Code d'accès enseignant non configuré côté serveur.");
  const digest = async (value: string) =>
    toBase64(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const a = await digest(input.trim());
  const b = await digest(expected.trim());
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i % b.length);
  return diff === 0;
}
