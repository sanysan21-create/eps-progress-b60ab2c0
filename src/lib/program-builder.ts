/** Types et utilitaires du constructeur de séquences (client + serveur). */

export type SequenceFile = {
  id: string;
  file_id: string;
  name: string;
  content_type: string;
  url: string;
};

export type SequenceSession = {
  id: string;
  session_number: number;
  session_date: string | null;
  objective: string | null;
  key_points: string | null;
  files: SequenceFile[];
};

export type SequenceCriterion = {
  id: string;
  label: string;
  points: number;
  competency_id: string | null;
};

export type SequenceDetail = {
  id: string;
  name: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string | null;
  start_date: string | null;
  end_date: string | null;
  sessions: SequenceSession[];
  criteria: SequenceCriterion[];
  /** Image du barème de la séquence (une seule photo). */
  scale_image_url: string | null;
};

/** Dates hebdomadaires comprises entre deux bornes (incluses). */
export function weeklyDates(start: string, end: string): string[] {
  const from = new Date(`${start}T12:00:00`);
  const to = new Date(`${end}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return [];
  const dates: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to && dates.length < 40) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

/** "08 sept." — libellé court d'une date de séance. */
export function shortDate(date: string | null): string {
  if (!date) return "date à définir";
  const value = new Date(`${date}T12:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return value.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

/** "08 septembre 2026" — libellé long d'une date de séance. */
export function longDate(date: string | null): string {
  if (!date) return "Date à définir";
  const value = new Date(`${date}T12:00:00`);
  if (Number.isNaN(value.getTime())) return date;
  return value.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function criteriaTotal(criteria: SequenceCriterion[]): number {
  return criteria.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
}
