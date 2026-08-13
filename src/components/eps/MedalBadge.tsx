import bronze from "@/assets/medal-bronze.png";
import silver from "@/assets/medal-silver.png";
import gold from "@/assets/medal-gold.png";
import { medal as findMedal } from "@/lib/medals";

const SOURCES: Record<string, string> = { bronze, silver, gold };

/**
 * Illustration de la médaille attribuée par l'enseignant.
 * Rien n'est affiché si aucune médaille n'a été attribuée.
 */
export function MedalBadge({
  code,
  size = 32,
  withLabel = false,
}: {
  code: string | null | undefined;
  size?: number;
  withLabel?: boolean;
}) {
  const info = findMedal(code);
  if (!info) return null;
  const source = SOURCES[info.code];
  if (!source) return null;

  const large = size >= 64;

  return (
    <span
      className={`inline-flex items-center align-middle ${
        large ? "flex-col gap-1" : "flex-row gap-1.5"
      }`}
    >
      <img
        src={source}
        alt={`Médaille ${info.label}`}
        title={`Médaille ${info.label}`}
        loading="lazy"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 object-contain ${large ? "drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]" : ""}`}
      />
      {withLabel && (
        <span
          className={
            large
              ? "mono-label text-[11px] font-bold uppercase tracking-widest text-foreground/80"
              : "text-xs font-semibold"
          }
        >
          {info.label}
        </span>
      )}
    </span>
  );
}
