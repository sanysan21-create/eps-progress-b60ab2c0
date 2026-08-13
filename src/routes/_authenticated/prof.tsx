import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Users, Dumbbell, ListChecks } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/prof")({
  component: TeacherLayout,
});

const nav = [
  { to: "/prof", label: "Gestion classes", icon: Users, exact: true },
  { to: "/prof/competences", label: "Évaluer compétences", icon: ListChecks, exact: false },
  { to: "/prof/activites", label: "Activités & compétences", icon: Dumbbell, exact: false },
] as const;


function TeacherLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden flex-col border-r border-border bg-sidebar p-6 lg:flex">
          <div className="mb-10">
            <Link to="/" className="display-title block text-3xl italic tracking-tighter text-primary">
              EPS Progress
            </Link>
            <p className="mono-label mt-1 text-muted-foreground">Performance tracking · démo</p>
          </div>

          <nav className="space-y-1">
            <div className="mono-label mb-4 text-muted-foreground">Tableau de bord</div>
            {nav.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium uppercase text-foreground/80 transition-colors hover:bg-accent"
                activeProps={{ className: "bg-primary text-primary-foreground font-bold" }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-4 border-t border-border pt-6">
            <Link to="/eleve" className="mono-label block text-muted-foreground hover:text-primary">
              → Voir l'espace élève
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="mono-label block text-muted-foreground hover:text-primary"
            >
              → Se déconnecter
            </button>
            <div className="flex items-center gap-3 p-2">
              <div className="grid size-10 place-items-center rounded-full bg-surface-2 ring-2 ring-primary/20">
                <span className="display-title text-primary">ML</span>
              </div>
              <div>
                <p className="text-xs font-bold">M. Lefebvre</p>
                <p className="mono-label text-muted-foreground">Professeur EPS</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col">
          <nav className="flex items-center gap-2 overflow-x-auto border-b border-border bg-sidebar px-4 py-3 lg:hidden">
            {nav.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground border-primary" }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 space-y-8 p-4 lg:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
