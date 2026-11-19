/** Nombre maximum d'élèves par groupe d'acrosport. */
export const ACROSPORT_MAX_GROUP_SIZE = 6;

/** Vrai si l'activité correspond à l'acrosport. */
export function isAcrosportActivity(name: string | null | undefined): boolean {
  if (!name) return false;
  return /acro/i.test(name);
}

export type AcrosportClassmate = {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string | null;
};

export type AcrosportBoard = {
  activity_id: string;
  activity_name: string;
  class_id: string;
  my_id: string;
  my_group_id: string | null;
  max: number;
  classmates: AcrosportClassmate[];
} | null;
