/**
 * Middlewares serveur : authentification enseignant et accès base de données.
 * Les imports serveur sont dynamiques pour ne jamais entrer dans le bundle client.
 */
import { createMiddleware } from "@tanstack/react-start";

/** Enseignant connecté requis. Fournit `context.sql` et `context.userId`. */
export const requireTeacher = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { currentTeacherId } = await import("./auth.server");
  const teacherId = await currentTeacherId();
  if (!teacherId) throw new Error("Unauthorized: session enseignant absente");

  const { db } = await import("./db.server");
  const sql = await db();

  const rows = await sql<{ id: string }[]>`select id from teachers where id = ${teacherId} limit 1`;
  if (rows.length === 0) throw new Error("Unauthorized: compte introuvable");

  return next({ context: { sql, userId: teacherId } });
});

/** Accès base sans authentification (lecture publique / session élève). */
export const withDb = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { db } = await import("./db.server");
  const sql = await db();
  return next({ context: { sql } });
});
