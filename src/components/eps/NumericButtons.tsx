import { useMemo, useRef } from "react";

type Props = {
  /** Valeur courante (chaîne pour rester compatible avec la saisie existante). */
  value: string;
  onValueChange: (value: string) => void;
  /** Barème réel : les boutons vont de 0 à max. */
  max: number;
  step?: number;
  label?: string;
  "aria-label"?: string;
};

/**
 * Sélecteur numérique par boutons, plus adapté à la souris et au clavier
 * qu'une roue tactile. Les valeurs possibles vont de 0 au barème maximum.
 */
export function NumericButtons({
  value,
  onValueChange,
  max,
  step = 1,
  label,
  ...rest
}: Props) {
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

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

  const commit = (next: number) => {
    const last = values[values.length - 1] ?? 0;
    const clamped = Math.min(last, Math.max(0, next));
    onValueChange(String(clamped));
  };

  const move = (delta: number) => {
    const nextIndex = Math.min(values.length - 1, Math.max(0, index + delta));
    const next = values[nextIndex];
    if (next !== undefined) {
      commit(next);
      buttonsRef.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        move(-values.length);
        break;
      case "End":
        event.preventDefault();
        move(values.length);
        break;
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        role="radiogroup"
        aria-label={rest["aria-label"] ?? label ?? "Points obtenus"}
        onKeyDown={handleKeyDown}
        className="grid w-fit grid-cols-5 gap-1.5"
      >
        {values.map((v, i) => {
          const selected = i === index;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              ref={(node) => {
                buttonsRef.current[i] = node;
              }}
              onClick={() => commit(v)}
              className={`h-9 w-10 rounded-lg text-sm font-mono tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                selected
                  ? "bg-primary font-bold text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground"
              }`}
            >
              {v}
            </button>
          );
        })}
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
