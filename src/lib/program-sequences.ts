export type ProgramSequence = {
  id: string;
  class_id: string | null;
  class_name: string | null;
  activity_id: string | null;
  activity_name: string | null;
  name: string;
  from_session: number | null;
  to_session: number | null;
  position: number;
};

/** "Séances 1 à 6" — libellé lisible de l'intervalle d'une séquence. */
export function sequenceRange(sequence: ProgramSequence): string | null {
  const { from_session: from, to_session: to } = sequence;
  if (from && to) return from === to ? `Séance ${from}` : `Séances ${from} à ${to}`;
  if (from) return `À partir de la séance ${from}`;
  if (to) return `Jusqu'à la séance ${to}`;
  return null;
}
