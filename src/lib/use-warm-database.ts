import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";

import { warmDatabase } from "./warm.functions";

/**
 * Réveille la base de données dès l'affichage d'une page d'entrée, sans bloquer
 * l'affichage ni afficher d'erreur si la tentative échoue.
 */
export function useWarmDatabase() {
  const warm = useServerFn(warmDatabase);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    warm({ data: {} }).catch(() => {});
  }, [warm]);
}
