export const MEDALS = [
  { code: "bronze", label: "Bronze", emoji: "🥉" },
  { code: "silver", label: "Argent", emoji: "🥈" },
  { code: "gold", label: "Or", emoji: "🥇" },
] as const;

export type MedalCode = (typeof MEDALS)[number]["code"];

export function medal(code: string | null | undefined) {
  if (!code) return undefined;
  return MEDALS.find((item) => item.code === code);
}
