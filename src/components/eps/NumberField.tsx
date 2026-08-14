import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Arrondi propre pour éviter 14.000000000000002 avec des pas décimaux. */
function round(value: number, step: number) {
  const decimals = String(step).split(".")[1]?.length ?? 0;
  return Number(value.toFixed(decimals));
}

/**
 * Champ numérique de l'espace enseignant : saisie clavier libre + molette de la
 * souris (haut = +step, bas = -step) dans les bornes min/max, sans scroll de page.
 */
export function NumberField({
  value,
  onValueChange,
  min = 0,
  max = 999,
  step = 1,
  className = "",
  placeholder,
  ...rest
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;

    const handleWheel = (event: WheelEvent) => {
      if (document.activeElement !== input && !input.matches(":hover")) return;
      event.preventDefault();
      const current = Number(String(value).replace(",", "."));
      const base = Number.isFinite(current) ? current : min;
      const direction = event.deltaY < 0 ? 1 : -1;
      const next = clamp(round(base + direction * step, step), min, max);
      onValueChange(String(next));
    };

    input.addEventListener("wheel", handleWheel, { passive: false });
    return () => input.removeEventListener("wheel", handleWheel);
  }, [value, onValueChange, min, max, step]);

  return (
    <input
      ref={ref}
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const current = Number(String(value).replace(",", "."));
        const base = Number.isFinite(current) ? current : min;
        const direction = event.key === "ArrowUp" ? 1 : -1;
        onValueChange(String(clamp(round(base + direction * step, step), min, max)));
      }}
      className={className}
      {...rest}
    />
  );
}
