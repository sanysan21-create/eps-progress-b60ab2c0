import { Link } from "@tanstack/react-router";
import { User, Dumbbell, TrendingUp, Target, Trophy } from "lucide-react";

const items = [
  { to: "/eleve/profil", label: "Profil", icon: User },
  { to: "/eleve/activites", label: "Activités", icon: Dumbbell },
  { to: "/eleve/progression", label: "Progrès", icon: TrendingUp },
  { to: "/eleve/objectifs", label: "Objectifs", icon: Target },
  { to: "/eleve/reussites", label: "Réussites", icon: Trophy },
] as const;

export function StudentNav() {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex w-[94%] max-w-md -translate-x-1/2 items-center justify-around rounded-3xl border border-border bg-surface/90 p-2 shadow-2xl backdrop-blur-md">
      {items.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/eleve/profil" }}
          className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
          activeProps={{ className: "text-primary bg-primary/10" }}
        >
          <Icon className="size-5" />
          <span className="text-[9px] font-bold uppercase tracking-wide">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
