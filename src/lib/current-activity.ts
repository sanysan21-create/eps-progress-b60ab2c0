import type { ProgramSession } from "./program";
import type { ProgramSequence } from "./program-sequences";

/** Date du jour au fuseau local (et non UTC), au format AAAA-MM-JJ. */
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Activité en cours selon le calendrier : la séquence dont la période (début → fin)
 * contient la date du jour. À défaut : dernière séance passée/du jour, sinon la prochaine.
 */
export function currentActivityName(
  sessions: ProgramSession[],
  today = localToday(),
  sequences: ProgramSequence[] = [],
): string | null {
  const running = sequences
    .filter((s) => s.activity_name && s.start_date && s.end_date && s.start_date <= today && today <= s.end_date)
    .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  if (running[0]?.activity_name) return running[0].activity_name;
  const dated = sessions.filter((s) => s.session_date).sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
  const past = dated.filter((s) => (s.session_date ?? "").slice(0, 10) <= today);
  const pick = past[past.length - 1] ?? dated.find((s) => (s.session_date ?? "") >= today) ?? sessions[0];
  return pick?.activity_name ?? null;
}

/** Séance du moment : la séance du jour ou la prochaine, sinon la dernière passée. */
export function currentSessionId(sessions: ProgramSession[], today = localToday()): string | null {
  const dated = sessions.filter((s) => s.session_date).sort((a, b) => (a.session_date ?? "").localeCompare(b.session_date ?? ""));
  const next = dated.find((s) => (s.session_date ?? "").slice(0, 10) >= today);
  return (next ?? dated[dated.length - 1] ?? sessions[0])?.id ?? null;
}

export function isPastSession(session: ProgramSession, currentId: string | null, today = localToday()): boolean {
  if (session.id === currentId || !session.session_date) return false;
  return session.session_date.slice(0, 10) < today;
}
