import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeChoice = "dark" | "light" | "system";

const STORAGE_KEY = "eps-progress:theme";

export const THEME_OPTIONS: { value: ThemeChoice; label: string; emoji: string; hint: string }[] = [
  { value: "dark", label: "Thème sombre", emoji: "🌙", hint: "Apparence par défaut d'EPS Progress" },
  { value: "light", label: "Thème clair", emoji: "☀️", hint: "Fond clair, mêmes couleurs" },
  { value: "system", label: "Automatique", emoji: "🌗", hint: "Suit les réglages de l'appareil" },
];

/** Script inline : applique le thème avant le premier rendu pour éviter tout flash. */
export const themeBootstrapScript = `(function(){try{var c=localStorage.getItem('${STORAGE_KEY}')||'dark';var m=c==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):c;var e=document.documentElement;e.classList.toggle('light',m==='light');e.style.colorScheme=m;}catch(e){}})();`;

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const resolved = choice === "system" ? systemTheme() : choice;
  const el = document.documentElement;
  el.classList.toggle("light", resolved === "light");
  el.style.colorScheme = resolved;
}

type ThemeContextValue = {
  theme: ThemeChoice;
  resolved: "dark" | "light";
  setTheme: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const next: ThemeChoice =
      stored === "dark" || stored === "light" || stored === "system" ? stored : "dark";
    setThemeState(next);
    setResolved(next === "system" ? systemTheme() : next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      setResolved(systemTheme());
      applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    setThemeState(choice);
    setResolved(choice === "system" ? systemTheme() : choice);
    applyTheme(choice);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* stockage indisponible : le thème reste appliqué pour la session */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé dans <ThemeProvider>");
  return ctx;
}
