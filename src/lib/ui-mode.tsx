import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type UiMode = "auto" | "desktop" | "mobile";

const STORAGE_KEY = "eps-progress:ui-mode";
/** Largeur de rendu forcée en mode ordinateur (16/9 bureautique). */
export const DESKTOP_WIDTH = 1440;

export const UI_MODE_OPTIONS: { value: UiMode; label: string; emoji: string; hint: string }[] = [
  { value: "auto", label: "Automatique", emoji: "🔄", hint: "S'adapte à la taille de l'écran" },
  { value: "desktop", label: "Ordinateur", emoji: "🖥️", hint: "Interface bureautique 16/9 (1440px)" },
  { value: "mobile", label: "Mobile", emoji: "📱", hint: "Interface tactile compacte" },
];

/** Script inline : applique le mode d'interface avant le premier rendu. */
export const uiModeBootstrapScript = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'auto';var v=document.querySelector('meta[name=viewport]');if(!v){v=document.createElement('meta');v.name='viewport';document.head.appendChild(v);}v.setAttribute('content',m==='desktop'?'width=${DESKTOP_WIDTH}, initial-scale=1':'width=device-width, initial-scale=1');var e=document.documentElement;e.classList.toggle('ui-desktop',m==='desktop');e.classList.toggle('ui-mobile',m==='mobile');}catch(e){}})();`;

function applyUiMode(mode: UiMode) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "viewport");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    mode === "desktop"
      ? `width=${DESKTOP_WIDTH}, initial-scale=1`
      : "width=device-width, initial-scale=1",
  );
  const el = document.documentElement;
  el.classList.toggle("ui-desktop", mode === "desktop");
  el.classList.toggle("ui-mobile", mode === "mobile");
}

type UiModeContextValue = { mode: UiMode; setMode: (mode: UiMode) => void };

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiMode>("auto");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UiMode | null;
    const next: UiMode =
      stored === "auto" || stored === "desktop" || stored === "mobile" ? stored : "auto";
    setModeState(next);
    applyUiMode(next);
  }, []);

  const setMode = useCallback((next: UiMode) => {
    setModeState(next);
    applyUiMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* stockage indisponible : le mode reste appliqué pour la session */
    }
  }, []);

  return <UiModeContext.Provider value={{ mode, setMode }}>{children}</UiModeContext.Provider>;
}

export function useUiMode() {
  const ctx = useContext(UiModeContext);
  if (!ctx) throw new Error("useUiMode doit être utilisé dans <UiModeProvider>");
  return ctx;
}
