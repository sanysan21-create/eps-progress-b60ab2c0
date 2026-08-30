import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeChoice = "dark" | "light" | "navy-light" | "navy" | "system";

const STORAGE_KEY = "eps-progress:theme";

export const THEME_OPTIONS: { value: ThemeChoice; label: string; emoji: string; hint: string }[] = [
  {
    value: "navy",
    label: "Bleu / Vert sombre",
    emoji: "🟦",
    hint: "Apparence par défaut d'EPS Progress",
  },
  {
    value: "navy-light",
    label: "Bleu / Vert clair",
    emoji: "🟩",
    hint: "Bleu marine dominant sur fond blanc",
  },
  { value: "dark", label: "Thème sombre", emoji: "🌙", hint: "Bleu nuit et volt" },
  { value: "light", label: "Thème clair", emoji: "☀️", hint: "Fond clair, mêmes couleurs" },
  { value: "system", label: "Automatique", emoji: "🌗", hint: "Suit les réglages de l'appareil" },
];

/** Script inline : applique le thème avant le premier rendu pour éviter tout flash. */
export const themeBootstrapScript = `(function(){try{var c=localStorage.getItem('${STORAGE_KEY}')||'navy';var m=c==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):c;var e=document.documentElement;e.classList.toggle('light',m==='light');e.classList.toggle('theme-navy',m==='navy');e.classList.toggle('theme-navy-light',m==='navy-light');e.style.colorScheme=(m==='light'||m==='navy-light')?'light':'dark';}catch(e){}})();`;

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

type Resolved = "dark" | "light" | "navy-light" | "navy";

function resolveChoice(choice: ThemeChoice): Resolved {
  return choice === "system" ? systemTheme() : choice;
}

function applyTheme(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const resolved = resolveChoice(choice);
  const el = document.documentElement;
  el.classList.toggle("light", resolved === "light");
  el.classList.toggle("theme-navy", resolved === "navy");
  el.classList.toggle("theme-navy-light", resolved === "navy-light");
  el.style.colorScheme = resolved === "light" || resolved === "navy-light" ? "light" : "dark";
}

type ThemeContextValue = {
  theme: ThemeChoice;
  resolved: Resolved;
  setTheme: (choice: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("navy");
  const [resolved, setResolved] = useState<Resolved>("navy");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const next: ThemeChoice =
      stored === "dark" ||
      stored === "light" ||
      stored === "navy" ||
      stored === "navy-light" ||
      stored === "system"
        ? stored
        : "navy";
    setThemeState(next);
    setResolved(resolveChoice(next));
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
    setResolved(resolveChoice(choice));
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
