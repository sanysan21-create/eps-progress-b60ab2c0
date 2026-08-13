import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves, Dumbbell, Timer, Circle, ChevronRight, Target, Trophy, Flame } from "lucide-react";

import {
  averageProgress,
  flattenActivities,
  initialsOf,
  useStudentActivities,
  useStudentSession,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Profil EPS de l'élève : activités, compétences évaluées, prochain objectif et réussites.",
      },
      { property: "og:title", content: "Mon profil EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Activités, compétences évaluées, prochain objectif et réussites de l'élève.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProfile,
});

const activityIcons: { match: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { match: "natation", icon: Waves },
  { match: "basket", icon: Circle },
  { match: "course", icon: Timer },
  { match: "athl", icon: Timer },
  { match: "gym", icon: Dumbbell },
];

function ActivityIcon({ name }: { name: string }) {
  const normalized = name.toLowerCase();
  const Icon = activityIcons.find((entry) => normalized.includes(entry.match))?.icon ?? Flame;
  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="size-6" />
    </div>
  );
}

function StudentProfile() {
  const session = useStudentSession();
  const profile = useStudentActivities();
  const info = session.data;
  const marks = flattenActivities(profile.data ?? []);
  const progress = averageProgress(marks);
  const nextObjective = marks
    .filter((m) => m.levelPosition < m.levelMax)
    .sort((a, b) => a.levelPosition / a.levelMax - b.levelPosition / b.levelMax)[0];
  const mastered = marks.filter((m) => m.levelPosition >= m.levelMax).slice(0, 3);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-surface-2 ring-1 ring-border">
            <span className="display-title text-3xl text-primary">
              {info ? initialsOf(info.firstName, info.lastName) : "?"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="mono-label text-primary">{info?.className ?? "Sans classe"}</p>
            <h1 className="display-title truncate text-3xl">
              {info ? `${info.firstName} ${info.lastName}` : "…"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {marks.length} compétence{marks.length > 1 ? "s" : ""} évaluée
              {marks.length > 1 ? "s" : ""}
              {info ? ` · ${info.studentCode}` : ""}
            </p>
          </div>
        </div>

        <div className="relative mt-6 rounded-2xl bg-background/50 p-4">
          <p className="mono-label text-muted-foreground">Progression globale</p>
          <p className="display-title text-3xl text-primary">
            {progress === null ? "—" : `${progress}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            Moyenne des niveaux atteints sur l'ensemble de tes compétences évaluées.
          </p>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="display-title text-xl italic">Mes activités</h2>

        {profile.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

        {!profile.isLoading && (profile.data ?? []).length === 0 && (
          <div className="rounded-3xl border border-border bg-surface p-6 text-center">
            <Flame className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">Aucune compétence n'a encore été évaluée.</p>
            <p className="text-sm text-muted-foreground">
              Ton professeur renseignera tes niveaux au fil des séances.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {(profile.data ?? []).map((activity) => (
            <article
              key={activity.activity_id}
              className="space-y-3 rounded-3xl border border-border bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <ActivityIcon name={activity.activity_name} />
                <h3 className="display-title text-xl italic">{activity.activity_name}</h3>
              </div>
              <div className="space-y-2">
                {activity.competencies.map((competency) => (
                  <div
                    key={competency.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-background/60 p-3"
                  >
                    <p className="min-w-0 text-sm font-semibold">{competency.label}</p>
                    <span className="mono-label shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                      Niveau {competency.level_position} — {competency.level_label}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="display-title text-xl italic">Mon prochain objectif</h2>
        {nextObjective ? (
          <article className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground">
            <div className="absolute -right-6 -top-6 size-32 rounded-full bg-background/10" />
            <div className="relative flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background/20">
                <Target className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="mono-label text-primary-foreground/80">{nextObjective.activityName}</p>
                <p className="display-title text-xl">{nextObjective.competencyLabel}</p>
                <p className="mt-2 text-sm font-medium text-primary-foreground/90">
                  Niveau {nextObjective.levelPosition} / {nextObjective.levelMax} — prochain palier
                  à atteindre.
                </p>
              </div>
            </div>
            <Link
              to="/eleve/objectifs"
              className="mono-label relative mt-5 inline-flex items-center gap-1 rounded-full bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-surface/90"
            >
              Voir mes objectifs <ChevronRight className="size-4" />
            </Link>
          </article>
        ) : (
          <div className="rounded-3xl border border-border bg-surface p-6 text-center">
            <Trophy className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-bold">
              {marks.length === 0
                ? "Pas encore d'objectif : aucune compétence évaluée."
                : "Tous tes niveaux maximum sont atteints !"}
            </p>
          </div>
        )}
      </section>

      {mastered.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="display-title text-xl italic">Mes réussites</h2>
            <Link
              to="/eleve/reussites"
              className="mono-label flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              Tout voir <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {mastered.map((mark) => (
              <article
                key={mark.competencyId}
                className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4"
              >
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold uppercase italic">
                    {mark.competencyLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{mark.activityName}</p>
                  <p className="mono-label mt-1 text-primary">{mark.levelLabel}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
