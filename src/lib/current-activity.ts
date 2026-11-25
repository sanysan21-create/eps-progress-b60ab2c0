import type { ProgramSession } from "./program";

/** Activité en cours : celle de la dernière séance passée ou du jour, sinon de la prochaine. */
export function currentActivityName(sessions: ProgramSession[], today = new Date().toISOString().slice(0, 10)): string | null {
  const dated = sessions.filter((s) => s.session_date).sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
  const past = dated.filter((s) => (s.session_date ?? "").slice(0, 10) <= today);
  const pick = past[past.length - 1] ?? dated[0] ?? sessions[0];
  return pick?.activity_name ?? null;
}

/** Séance du moment : la séance du jour ou la prochaine, sinon la dernière passée. */
export function currentSessionId(sessions: ProgramSession[], today = new Date().toISOString().slice(0, 10)): string | null {
  const dated = sessions.filter((s) => s.session_date).sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
  const next = dated.find((s) => (s.session_date ?? "").slice(0, 10) >= today);
  return (next ?? dated[dated.length - 1] ?? sessions[0])?.id ?? null;
}

export function isPastSession(session: ProgramSession, currentId: string | null, today = new Date().toISOString().slice(0, 10)): boolean {
  if (session.id === currentId || !session.session_date) return false;
  return session.session_date.slice(0, 10) < today;
}
