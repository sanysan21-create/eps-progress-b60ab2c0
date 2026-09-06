export const MEDALS = [
  { code: "bronze", label: "Bronze", emoji: "🥉" },
  { code: "silver", label: "Argent", emoji: "🥈" },
  { code: "gold", label: "Or", emoji: "🥇" },
] as const;

export type MedalCode = (typeof MEDALS)[number]["code"];

/** Ordre des paliers : Bronze → Argent → Or. */
export const MEDAL_ORDER: MedalCode[] = ["bronze", "silver", "gold"];

/**
 * Nombre de réussites nécessaires pour obtenir une médaille.
 * Valeur unique aujourd'hui, volontairement centralisée ici pour devenir
 * configurable par médaille plus tard sans toucher au reste du code.
 */
export const REQUIRED_ACHIEVEMENTS_PER_MEDAL = 5;

export function requiredCount(_code: MedalCode): number {
  return REQUIRED_ACHIEVEMENTS_PER_MEDAL;
}

export function medal(code: string | null | undefined) {
  if (!code) return undefined;
  return MEDALS.find((item) => item.code === code);
}

export function isMedalCode(code: string | null | undefined): code is MedalCode {
  return MEDAL_ORDER.includes(code as MedalCode);
}

/** Réussite minimale nécessaire au calcul d'une médaille. */
export type MedalAchievement = {
  medal_type: string | null;
  is_required: boolean;
  earned: boolean;
};

export type MedalProgress = {
  code: MedalCode;
  label: string;
  emoji: string;
  /** Réussites disponibles dans ce parcours. */
  available: number;
  /** Réussites obtenues dans ce parcours. */
  earnedCount: number;
  /** Réussites nécessaires (5 aujourd'hui). */
  need: number;
  /** Réussites obligatoires encore manquantes. */
  missingRequired: number;
  /** Conditions propres au parcours remplies (hors palier précédent). */
  conditionsMet: boolean;
  /** Palier précédent obtenu (Bronze est toujours ouvert). */
  previousObtained: boolean;
  /** Médaille officiellement obtenue. */
  obtained: boolean;
};

/**
 * Logique centralisée : une médaille est obtenue si le palier précédent est
 * obtenu, si au moins `need` réussites de ce parcours sont validées et si
 * toutes les réussites obligatoires du parcours le sont aussi.
 */
export function computeMedalProgress(items: MedalAchievement[]): MedalProgress[] {
  let previousObtained = true;

  return MEDAL_ORDER.map((code) => {
    const info = MEDALS.find((item) => item.code === code)!;
    const list = items.filter((item) => item.medal_type === code);
    const earnedCount = list.filter((item) => item.earned).length;
    const missingRequired = list.filter((item) => item.is_required && !item.earned).length;
    const need = requiredCount(code);
    const conditionsMet = list.length > 0 && earnedCount >= need && missingRequired === 0;
    const obtained = conditionsMet && previousObtained;

    const progress: MedalProgress = {
      code,
      label: info.label,
      emoji: info.emoji,
      available: list.length,
      earnedCount,
      need,
      missingRequired,
      conditionsMet,
      previousObtained,
      obtained,
    };

    previousObtained = obtained;
    return progress;
  });
}

/** Médaille la plus élevée réellement obtenue (null si aucune). */
export function highestMedal(progress: MedalProgress[]): MedalCode | null {
  return [...progress].reverse().find((item) => item.obtained)?.code ?? null;
}
