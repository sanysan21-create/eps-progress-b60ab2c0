import { medal as findMedal } from "@/lib/medals";

/**
 * Badge textuel de la médaille obtenue (« 🥉 BRONZE »), coloré avec la couleur
 * de récompense du thème actif. Purement décoratif.
 */
export function MedalTierBadge({ code }: { code: string | null | undefined }) {
  const info = findMedal(code);
  if (!info) return null;

  return (
    <span
      className="mono-label inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold"
      style={{
        borderColor: "color-mix(in oklab, var(--color-medal) 60%, transparent)",
        backgroundColor: "color-mix(in oklab, var(--color-medal) 12%, transparent)",
        color: "var(--color-medal)",
      }}
    >
      <span aria-hidden>{info.emoji}</span>
      {info.label}
    </span>
  );
}
