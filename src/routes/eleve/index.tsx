import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Target, Trophy } from "lucide-react";

import {
  averageProgress,
  flattenActivities,
  initialsOf,
  useStudentActivities,
  useStudentSession,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/")({
  head: () => ({
    meta: [
      { title: "Mon tableau de bord EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Tableau de bord de l'élève : activités suivies, compétences évaluées et progression réelle en EPS.",
      },
      { property: "og:title", content: "Mon tableau de bord EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Activités suivies, compétences évaluées et progression réelle de l'élève.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const session = useStudentSession();
  const activities = useStudentActivities();
  const info = session.data;
  const marks = flattenActivities(activities.data ?? []);
  const progress = averageProgress(marks);
  const nextStep = marks
    .filter((m) => m.levelPosition < m.levelMax)
    .sort((a, b) => a.levelPosition / a.levelMax - b.levelPosition / b.levelMax)[0];
  const mastered = marks.filter((m) => m.levelPosition >= m.levelMax);

  return (
    <div className="animate-slide-up space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="mono-label inline-block rounded bg-surface-2 px-2 py-1 text-primary">
            {info?.className ? `Classe : ${info.className}` : "Sans classe"}
          </div>
          <h1 className="display-title text-4xl">
            {info ? `${info.firstName} ${info.lastName}` : "…"}
          </h1>
          {info && <p className="mono-label text-muted-foreground">Code : {info.studentCode}</p>}
        </div>
        <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2 ring-1 ring-border">
          <span className="display-title text-2xl text-primary">
            {info ? initialsOf(info.firstName, info.lastName) : "?"}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Activités" value={String((activities.data ?? []).length)} />
        <Stat label="Compétences" value={String(marks.length)} />
        <Stat label="Progression" value={progress === null ? "—" : `${progress}%`} />
      </section>

      {marks.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Flame className="mx-auto size-8 text-primary" />
          <p className="mt-3 font-bold">Aucune compétence n'a encore été évaluée.</p>
          <p className="text-sm text-muted-foreground">
            Ton professeur renseignera tes niveaux au fil des séances.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="display-title text-xl italic">Mes activités</h2>
              <Link
                to="/eleve/activites"
                className="mono-label flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                Tout voir <ChevronRight className="size-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {(activities.data ?? []).slice(0, 3).map((activity) => (
                <article
                  key={activity.activity_id}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-surface p-5"
                >
                  <div className="min-w-0">
                    <h3 className="display-title truncate text-xl italic">
                      {activity.activity_name}
                    </h3>
                    <p className="mono-label text-muted-foreground">
                      {activity.competencies.length} compétence
                      {activity.competencies.length > 1 ? "s" : ""} évaluée
                      {activity.competencies.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="display-title text-xl italic">Mon prochain objectif</h2>
            {nextStep ? (
              <article className="rounded-3xl bg-primary p-6 text-primary-foreground">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background/20">
                    <Target className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="mono-label text-primary-foreground/80">
                      {nextStep.activityName}
                    </p>
                    <p className="display-title text-xl">{nextStep.competencyLabel}</p>
                    <p className="mt-2 text-sm font-medium text-primary-foreground/90">
                      Niveau {nextStep.levelPosition} / {nextStep.levelMax} — passe au niveau{" "}
                      {nextStep.levelPosition + 1}.
                    </p>
                  </div>
                </div>
              </article>
            ) : (
              <div className="rounded-3xl border border-border bg-surface p-6 text-center">
                <Trophy className="mx-auto size-8 text-primary" />
                <p className="mt-3 font-bold">Tous tes niveaux maximum sont atteints !</p>
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
              <div className="space-y-3">
                {mastered.slice(0, 3).map((mark) => (
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
                      <p className="text-xs text-muted-foreground">
                        {mark.activityName} · {mark.levelLabel}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="display-title text-2xl text-primary">{value}</p>
      <p className="mono-label text-muted-foreground">{label}</p>
    </div>
  );
}
