import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Flame,
  Target,
  TrendingUp,
  Trophy,
  User,
} from "lucide-react";

const items = [
  { to: "/eleve/profil", label: "Profil", icon: User },
  { to: "/eleve/activites", label: "Activités", icon: Flame },
  { to: "/eleve/progression", label: "Progrès", icon: TrendingUp },
  { to: "/eleve/objectifs", label: "Objectifs", icon: Target },
  { to: "/eleve/reussites", label: "Réussites", icon: Trophy },
  { to: "/eleve/notes", label: "Notes", icon: ClipboardList },
  { to: "/eleve/programme", label: "Programme", icon: CalendarDays },
] as const;

export function StudentNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 w-[94%] max-w-md -translate-x-1/2 overflow-x-auto rounded-3xl border border-border bg-surface/90 p-2 shadow-2xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-w-[64px] shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-primary bg-primary/10" }}
          >
            <Icon className="size-5" />
            <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
