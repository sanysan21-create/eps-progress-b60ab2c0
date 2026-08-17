import { useEffect, useMemo, useRef } from "react";

type Props = {
  /** Valeur courante (chaîne pour rester compatible avec la saisie existante). */
  value: string;
  onValueChange: (value: string) => void;
  /** Barème réel de la compétence : la roue va de 0 à max. */
  max: number;
  step?: number;
  label?: string;
  "aria-label"?: string;
};

const ITEM_HEIGHT = 40;

/**
 * Roue de sélection (wheel picker) tactile pour attribuer les points d'une
 * compétence : glisser vertical, molette, clic sur une valeur ou flèches clavier.
 * Les valeurs proposées ne dépassent jamais le barème.
 */
export function WheelPicker({
  value,
  onValueChange,
  max,
  step = 1,
  label,
  ...rest
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values = useMemo(() => {
    const out: number[] = [];
    const safeMax = Number.isFinite(max) && max > 0 ? max : 20;
    for (let v = 0; v <= safeMax + 1e-9; v += step) {
      out.push(Math.round(v * 100) / 100);
    }
    return out;
  }, [max, step]);

  const current = Number(String(value).replace(",", "."));
  const index = Math.max(
    0,
    values.findIndex((v) => Math.abs(v - (Number.isFinite(current) ? current : 0)) < step / 2),
  );

  /** Recentre la roue sur la valeur sélectionnée. */
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const target = index * ITEM_HEIGHT;
    if (Math.abs(node.scrollTop - target) > 1) {
      node.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [index]);

  const lastValue = values[values.length - 1] ?? 0;

  const commit = (next: number) => {
    const clamped = Math.min(lastValue, Math.max(0, next));
    onValueChange(String(clamped));
  };

  /** Après un glissement/molette natif, on aligne sur l'élément le plus proche. */
  const handleScroll = () => {
    const node = listRef.current;
    if (!node) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const nearest = Math.round(node.scrollTop / ITEM_HEIGHT);
      const picked = values[Math.min(values.length - 1, Math.max(0, nearest))];
      if (picked !== undefined && picked !== values[index]) commit(picked);
      else node.scrollTo({ top: nearest * ITEM_HEIGHT, behavior: "smooth" });
    }, 90);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[120px] w-20 shrink-0 select-none">
        {/* Fenêtre de sélection */}
        <div className="pointer-events-none absolute inset-x-0 top-[40px] h-[40px] rounded-xl border border-primary/60 bg-primary/10" />
        <div
          ref={listRef}
          role="listbox"
          aria-label={rest["aria-label"] ?? label ?? "Points obtenus"}
          tabIndex={0}
          onScroll={handleScroll}
          onKeyDown={(event) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const delta = event.key === "ArrowUp" ? -1 : 1;
            const next = values[Math.min(values.length - 1, Math.max(0, index + delta))];
            if (next !== undefined) commit(next);
          }}
          className="hide-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background outline-none focus-visible:border-primary"
          style={{ scrollPaddingTop: ITEM_HEIGHT }}
        >
          <div style={{ height: ITEM_HEIGHT }} aria-hidden />
          {values.map((v, i) => (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={i === index}
              onClick={() => commit(v)}
              style={{ height: ITEM_HEIGHT }}
              className={`flex w-full snap-center items-center justify-center font-mono tabular-nums transition-all ${
                i === index
                  ? "text-2xl font-bold text-primary"
                  : "text-sm text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
          <div style={{ height: ITEM_HEIGHT }} aria-hidden />
        </div>
      </div>

      <div className="leading-none">
        <p className="display-title text-4xl text-primary">
          {values[index] ?? 0}
        </p>
        <p className="mono-label mt-1 text-muted-foreground">
          / {values[values.length - 1] ?? 0} points
        </p>
      </div>
    </div>
  );
}
