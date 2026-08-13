/**
 * Badge « AS » (Association Sportive) affiché uniquement lorsque l'enseignant
 * a inscrit l'élève à l'AS depuis la gestion des classes.
 */
export function AsBadge({ size = 64 }: { size?: number }) {
  const large = size >= 56;
  return (
    <span
      className={`inline-flex items-center align-middle ${large ? "flex-col gap-1" : "flex-row gap-1.5"}`}
      title="Inscrit à l'Association Sportive"
    >
      <span
        aria-label="Inscrit à l'AS"
        role="img"
        className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 ring-2 ring-primary/40 shadow-[0_8px_24px_hsl(var(--primary)/0.35)]"
        style={{ width: size, height: size }}
      >
        <span
          className="display-title leading-none text-primary-foreground"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          AS
        </span>
      </span>
      {large && (
        <span className="mono-label text-[11px] font-bold uppercase tracking-widest text-foreground/80">
          Association Sportive
        </span>
      )}
    </span>
  );
}
