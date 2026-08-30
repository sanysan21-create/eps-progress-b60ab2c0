import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import {
  Users,
  Dumbbell,
  ListChecks,
  UserRound,
  ClipboardList,
  CalendarDays,
  Medal,
  Info,
  LogOut,
} from "lucide-react";

import { useTeacherProfile } from "@/hooks/use-teacher-profile";
import { teacherInitials } from "@/lib/teacher-profile";

import { signOutTeacher } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/prof")({
  component: TeacherLayout,
});

const nav = [
  { to: "/prof", label: "Gestion classes", icon: Users, exact: true },
  { to: "/prof/activites", label: "Activités & compétences", icon: Dumbbell, exact: false },
  { to: "/prof/competences", label: "Évaluer compétences", icon: ListChecks, exact: false },
  { to: "/prof/notes", label: "Résultats", icon: ClipboardList, exact: false },
  { to: "/prof/reussites", label: "Réussites", icon: Medal, exact: false },
  { to: "/prof/programme", label: "Programme", icon: CalendarDays, exact: false },
  { to: "/prof/profil", label: "Profil de l'enseignant", icon: UserRound, exact: false },
  { to: "/prof/info", label: "Info", icon: Info, exact: false },
] as const;


function TeacherLayout() {
  const { data: profile } = useTeacherProfile();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto grid min-h-dvh max-w-[1440px] grid-cols-1 items-start lg:grid-cols-[280px_1fr]">
        <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar p-6 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
          <div className="mb-10">
            <Link
              to="/"
              className="display-title block text-3xl italic tracking-tighter text-sidebar-primary"
            >
              EPS Progress
            </Link>
            <p className="mono-label mt-1 text-sidebar-foreground/70">suivi des progrès</p>
          </div>

          <nav className="space-y-1">
            <div className="mono-label mb-4 text-sidebar-foreground/60">Tableau de bord</div>
            {nav.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium uppercase text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-foreground font-bold ring-1 ring-sidebar-primary/50 [&>svg]:text-sidebar-primary",
                }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>


          <div className="mt-auto space-y-4 border-t border-sidebar-border pt-6">
            <Link
              to="/eleve"
              className="mono-label block text-sidebar-foreground/80 hover:text-sidebar-primary"
            >
              → Voir l'espace élève
            </Link>
            <button
              onClick={async () => {
                await signOutTeacher({});
                window.location.href = "/auth";
              }}
              className="mono-label flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-primary/40 bg-sidebar-accent px-3 py-2.5 text-sidebar-foreground transition-colors hover:border-sidebar-primary hover:text-sidebar-primary"
            >
              <LogOut className="size-3.5" /> Se déconnecter
            </button>
            <Link
              to="/prof/profil"
              className="flex items-center gap-3 rounded-xl p-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`Photo de profil de ${profile.firstName} ${profile.lastName}`}
                  className="size-10 rounded-full object-cover ring-2 ring-sidebar-primary/40"
                />
              ) : (
                <div className="grid size-10 place-items-center rounded-full bg-sidebar-accent ring-2 ring-sidebar-primary/30">
                  <span className="display-title text-sidebar-primary">
                    {profile ? teacherInitials(profile) : "?"}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : "Mon profil"}
                </p>
                <p className="mono-label truncate text-sidebar-foreground/70">Professeur EPS</p>
              </div>
            </Link>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col lg:min-h-0">
          <nav className="flex items-center gap-2 overflow-x-auto border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
            {nav.map(({ to, label, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="whitespace-nowrap rounded-full border border-sidebar-border px-3 py-1.5 text-[10px] font-bold uppercase text-sidebar-foreground/90"
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-foreground border-sidebar-primary/60",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 space-y-8 p-4 lg:p-10">
            <Outlet />
          </main>
          <footer className="mt-auto border-t border-border p-4 lg:px-10 lg:py-6">
            <button
              onClick={async () => {
                await signOutTeacher({});
                window.location.href = "/auth";
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs font-bold uppercase tracking-tight text-foreground/80 transition-colors hover:border-primary hover:text-primary lg:w-auto"
            >
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
