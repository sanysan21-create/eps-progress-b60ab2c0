/**
 * Catégories AFL (Attendus de Fin de Lycée) servant à classer les compétences.
 * Référence unique côté enseignant comme côté élève.
 */
export const AFL_CODES = ["AFL1", "AFL2", "AFL3"] as const;

export type AflCode = (typeof AFL_CODES)[number];

export const AFL_HINTS: Record<AflCode, string> = {
  AFL1: "S'engager pour produire une performance",
  AFL2: "S'entraîner, se préparer, réguler",
  AFL3: "Coopérer, assumer des rôles",
};

/** Normalise une valeur venue de la base (compétences créées avant les AFL). */
export function toAfl(value: string | null | undefined): AflCode {
  const found = AFL_CODES.find((code) => code === value);
  return found ?? "AFL1";
}

/** Regroupe des éléments par AFL, dans l'ordre AFL1 → AFL3, sans groupe vide. */
export function groupByAfl<T>(
  items: T[],
  getAfl: (item: T) => string | null | undefined,
): { afl: AflCode; items: T[] }[] {
  return AFL_CODES.map((afl) => ({
    afl,
    items: items.filter((item) => toAfl(getAfl(item)) === afl),
  })).filter((group) => group.items.length > 0);
}
