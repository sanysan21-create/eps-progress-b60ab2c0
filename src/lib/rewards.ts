/**
 * Récompenses cosmétiques liées aux médailles Bronze / Argent / Or.
 * Aucune fonctionnalité pédagogique n'en dépend : uniquement de l'apparence,
 * un titre de profil et la carte Premium imprimable côté enseignant.
 *
 * La source de vérité reste le système de médailles existant (réussites).
 */
import { MEDAL_ORDER, type MedalCode } from "./medals";

/* -------------------------------------------------------------- déblocage */

/** Paliers débloqués par la médaille obtenue (cumulatif). */
export function unlockedTiers(medal: MedalCode | null | undefined): MedalCode[] {
  if (!medal) return [];
  const index = MEDAL_ORDER.indexOf(medal);
  return index < 0 ? [] : MEDAL_ORDER.slice(0, index + 1);
}

export function hasTier(medal: MedalCode | null | undefined, tier: MedalCode): boolean {
  return unlockedTiers(medal).includes(tier);
}

/** Le titre de profil se débloque à partir de l'Argent. */
export function canChooseTitle(medal: MedalCode | null | undefined): boolean {
  return hasTier(medal, "silver");
}

/** La carte Premium physique se débloque avec l'Or. */
export function hasPremiumCard(medal: MedalCode | null | undefined): boolean {
  return hasTier(medal, "gold");
}

/* ---------------------------------------------------------------- thèmes */

export type RewardThemeCode = "classic" | MedalCode;

export const REWARD_THEMES: {
  code: RewardThemeCode;
  /** Valeur de thème appliquée à l'interface. */
  theme: "navy" | "bronze" | "silver" | "gold";
  label: string;
  emoji: string;
  hint: string;
  /** Médaille nécessaire (null = toujours disponible). */
  requires: MedalCode | null;
}[] = [
  {
    code: "classic",
    theme: "navy",
    label: "EPS Progress classique",
    emoji: "🟩",
    hint: "Apparence d'origine",
    requires: null,
  },
  {
    code: "bronze",
    theme: "bronze",
    label: "Bronze",
    emoji: "🥉",
    hint: "Accents bronze discrets",
    requires: "bronze",
  },
  {
    code: "silver",
    theme: "silver",
    label: "Argent",
    emoji: "🥈",
    hint: "Détails métalliques argentés",
    requires: "silver",
  },
  {
    code: "gold",
    theme: "gold",
    label: "Or Premium",
    emoji: "🥇",
    hint: "Accents dorés, sensation Premium",
    requires: "gold",
  },
];

export function isRewardThemeUnlocked(
  code: RewardThemeCode,
  medal: MedalCode | null | undefined,
): boolean {
  const entry = REWARD_THEMES.find((item) => item.code === code);
  if (!entry) return false;
  return entry.requires === null || hasTier(medal, entry.requires);
}

/* -------------------------------------------------------- titres de profil */

/** Liste volontairement extensible : ajouter une entrée suffit. */
export const PROFILE_TITLES: { code: string; label: string; emoji: string }[] = [
  { code: "persistent", label: "Persévérant", emoji: "🔥" },
  { code: "determined", label: "Déterminé", emoji: "🎯" },
  { code: "teammate", label: "Coéquipier", emoji: "🤝" },
  { code: "progressing", label: "En progression", emoji: "🚀" },
  { code: "committed", label: "Engagé", emoji: "💪" },
  { code: "autonomous", label: "Autonome", emoji: "🧠" },
];

export function profileTitle(code: string | null | undefined) {
  if (!code) return undefined;
  return PROFILE_TITLES.find((item) => item.code === code);
}

/** Libellé affichable du titre (ex. « 🔥 Persévérant »). */
export function profileTitleLabel(code: string | null | undefined): string | null {
  const title = profileTitle(code);
  return title ? `${title.emoji} ${title.label}` : null;
}

/* ------------------------------------------------- contenu des récompenses */

export const REWARD_TIERS: {
  code: MedalCode;
  label: string;
  emoji: string;
  items: string[];
}[] = [
  {
    code: "bronze",
    label: "Bronze",
    emoji: "🥉",
    items: ["🎨 Thème Bronze", "🥉 Badge Bronze"],
  },
  {
    code: "silver",
    label: "Argent",
    emoji: "🥈",
    items: ["🎨 Thème Argent", "🥈 Badge Argent", "✨ Titres de profil"],
  },
  {
    code: "gold",
    label: "Or",
    emoji: "🥇",
    items: [
      "🎨 Thème Or",
      "🥇 Badge Or",
      "✨ Personnalisation Premium",
      "🪪 Carte Premium physique",
    ],
  },
];
