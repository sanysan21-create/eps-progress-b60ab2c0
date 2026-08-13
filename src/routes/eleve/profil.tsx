import { createFileRoute, Link } from "@tanstack/react-router";
import { Waves, Dumbbell, Timer, Circle, ChevronRight, Target, Trophy, Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LevelBars } from "@/components/eps/LevelBars";
import { getMyCompetencies } from "@/lib/competencies.functions";
import {
  student,
  studentActivities,
  studentObjectives,
  studentAchievements,
  LEVEL_LABELS,
  type Level,
  type Activity,
} from "@/data/demo";


export const Route = createFileRoute("/eleve/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Profil EPS de l'élève : niveau global, activités, prochain objectif et réussites.",
      },
      { property: "og:title", content: "Mon profil EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Niveau global, activités, prochain objectif et réussites de l'élève.",
      },
    ],
  }),
  component: StudentProfile,
});

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  natation: Waves,
  basket: Circle,
  athletisme: Timer,
  gymnastique: Dumbbell,
};

function ActivityIcon({ activity }: { activity: Activity }) {
  const Icon = activityIcons[activity.id] || Flame;
  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="size-6" />
    </div>
  );
}

function StudentProfile() {
  const nextObjective = studentObjectives.find((o) => !o.done);
  const unlockedAchievements = studentAchievements.filter((a) => a.unlocked).slice(0, 3);
  const fetchCompetencies = useServerFn(getMyCompetencies);
  const competencies = useQuery({
    queryKey: ["my-competencies"],
    queryFn: () => fetchCompetencies(),
  });


  return (
    <div className="animate-slide-up space-y-8">
      {/* Header profil */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6">
        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center rounded-3xl bg-surface-2 ring-1 ring-border">
            <span className="display-title text-3xl text-primary">{student.initials}</span>
          </div>
          <div className="min-w-0">
            <p className="mono-label text-primary">{student.className}</p>
            <h1 className="display-title truncate text-3xl">{student.firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.evaluations} évaluations · {student.badges} badges
            </p>
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between rounded-2xl bg-background/50 p-4">
          <div>
            <p className="mono-label text-muted-foreground">Niveau global</p>
            <p className="display-title text-3xl text-primary">
              {student.globalLevel} <span className="text-lg text-muted-foreground">/ 5</span>
            </p>
            <p className="text-xs text-muted-foreground">{LEVEL_LABELS[student.globalLevel as Level]}</p>
            <p className="mono-label mt-1 text-[10px] text-muted-foreground">{student.globalScore} moyenne</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LevelBars level={student.globalLevel} />
            <span className="mono-label text-[10px] text-primary">{student.trend}</span>
          </div>
        </div>
      </header>

      {/* Mes compétences (renseignées par le professeur) */}
      {(competencies.data ?? []).length > 0 && (
        <section className="space-y-4">
          <h2 className="display-title text-xl italic">Mes compétences</h2>
          <div className="space-y-3">
            {(competencies.data ?? []).map((c) => (
              <article
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{c.label}</p>
                  {c.activity_name && (
                    <p className="mono-label text-muted-foreground">{c.activity_name}</p>
                  )}
                </div>
                <span className="mono-label shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                  {c.level_label}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}



      {/* Mes activités */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="display-title text-xl italic">Mes activités</h2>
          <Link
            to="/eleve/activites"
            className="mono-label flex items-center gap-1 text-muted-foreground hover:text-primary"
          >
            Voir tout <ChevronRight className="size-4" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
          {studentActivities.map((a) => (
            <article
              key={a.id}
              className="group w-[260px] shrink-0 rounded-3xl border border-border bg-surface p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-4 flex items-start justify-between">
                <ActivityIcon activity={a} />
                <LevelBars level={a.level} size="sm" />
              </div>
              <p className="mono-label text-primary">{a.cycle}</p>
              <h3 className="display-title text-xl italic">{a.name}</h3>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {a.competencies.length} compétences
                  </p>
                  <p className="mono-label mt-1 text-xs text-muted-foreground">
                    {LEVEL_LABELS[a.level as Level]}
                  </p>
                </div>
                <span className="display-title text-4xl text-surface-2 transition-colors group-hover:text-primary">
                  {String(a.level).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="animate-bar-grow h-full origin-left rounded-full bg-primary"
                  style={{ width: `${(a.level / 5) * 100}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Mon prochain objectif */}
      <section className="space-y-4">
        <h2 className="display-title text-xl italic">Mon prochain objectif</h2>
        {nextObjective ? (
          <article className="relative overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground">
            <div className="absolute -right-6 -top-6 size-32 rounded-full bg-background/10" />
            <div className="relative flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background/20">
                <Target className="size-6" />
              </div>
              <div>
                <p className="mono-label text-primary-foreground/80">{nextObjective.activity}</p>
                <p className="display-title text-xl">{nextObjective.label}</p>
                <p className="mt-2 text-sm font-medium text-primary-foreground/90">
                  Continue sur ta lancée — tu es à quelques séances de valider ce objectif.
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
            <p className="mt-3 font-bold">Tous les objectifs sont atteints !</p>
            <p className="text-sm text-muted-foreground">Bravo, tu as validé ton cycle.</p>
          </div>
        )}
      </section>

      {/* Mes réussites */}
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
          {unlockedAchievements.map((a) => (
            <article
              key={a.id}
              className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold uppercase italic">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
                <p className="mono-label mt-1 text-primary">{a.date}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
