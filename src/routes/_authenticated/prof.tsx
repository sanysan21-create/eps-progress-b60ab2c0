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
  { to: "/prof/competences", label: "Évaluer compétences", icon: ListChecks, exact: false },
  { to: "/prof/activites", label: "Activités & compétences", icon: Dumbbell, exact: false },
  { to: "/prof/notes", label: "Notes", icon: ClipboardList, exact: false },
  { to: "/prof/reussites", label: "Réussites", icon: Medal, exact: false },
  { to: "/prof/programme", label: "Programme", icon: CalendarDays, exact: false },
  { to: "/prof/profil", label: "Profil de l'enseignant", icon: UserRound, exact: false },
  { to: "/prof/info", label: "Info", icon: Info, exact: false },
] as const;


function TeacherLayout() {
  const { data: profile } = useTeacherProfile();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden flex-col border-r border-border bg-sidebar p-6 lg:flex">
          <div className="mb-10">
            <Link to="/" className="display-title block text-3xl italic tracking-tighter text-primary">
              EPS Progress
            </Link>
            <p className="mono-label mt-1 text-muted-foreground">suivi des progrès</p>
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
                await signOutTeacher({});
                window.location.href = "/auth";
              }}
              className="mono-label block text-muted-foreground hover:text-primary"
            >
              → Se déconnecter
            </button>
            <Link to="/prof/profil" className="flex items-center gap-3 rounded-xl p-2 hover:bg-accent">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`Photo de profil de ${profile.firstName} ${profile.lastName}`}
                  className="size-10 rounded-full object-cover ring-2 ring-primary/30"
                />
              ) : (
                <div className="grid size-10 place-items-center rounded-full bg-surface-2 ring-2 ring-primary/20">
                  <span className="display-title text-primary">
                    {profile ? teacherInitials(profile) : "?"}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : "Mon profil"}
                </p>
                <p className="mono-label truncate text-muted-foreground">Professeur EPS</p>
              </div>
            </Link>
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
          <footer className="border-t border-border p-4 lg:p-10 lg:pt-6">
            <button
              onClick={async () => {
                await signOutTeacher({});
                window.location.href = "/auth";
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-sidebar px-4 py-3 text-xs font-bold uppercase tracking-tight text-muted-foreground transition-colors hover:border-primary hover:text-primary lg:w-auto"
            >
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
