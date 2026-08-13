import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyProgram } from "@/lib/program.functions";
import { nextSession, sessionWhen, upcomingSessions } from "@/lib/program";
import { activityEmoji } from "@/lib/activity-emoji";

export const Route = createFileRoute("/eleve/programme")({
  head: () => ({
    meta: [
      { title: "Mon programme EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Programme des séances d'EPS : prochaine séance, objectif du jour et activités prévues par l'enseignant.",
      },
      { property: "og:title", content: "Mon programme EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Prochaine séance, objectif et activités à venir renseignés par l'enseignant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProgram,
});

function StudentProgram() {
  const fetchProgram = useServerFn(getMyProgram);
  const program = useQuery({ queryKey: ["my-program"], queryFn: () => fetchProgram() });
  const sessions = program.data ?? [];
  const next = nextSession(sessions);
  const upcoming = upcomingSessions(sessions);

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-2xl leading-tight">📅 Programme</h1>
        <p className="text-sm text-muted-foreground">
          Programmation renseignée par ton enseignant, en lecture seule.
        </p>
      </header>

      {program.isPending ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
          Le programme sera bientôt disponible.
        </div>
      ) : (
        <>
          {next && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                🎯 Prochaine séance
              </h2>
              <article className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
                <p className="mono-label text-primary">{sessionWhen(next)}</p>
                <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold">
                  <span aria-hidden>{activityEmoji(next.activity_name)}</span>
                  {next.activity_name}
                </h3>
                {next.objective && (
                  <div className="mt-4">
                    <p className="mono-label text-muted-foreground">Objectif</p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                      {next.objective}
                    </p>
                  </div>
                )}
                {next.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{next.description}</p>
                )}
              </article>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                À venir
              </h2>
              <ul className="space-y-3">
                {upcoming.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-2xl border border-border bg-surface px-5 py-4"
                  >
                    <p className="flex items-center gap-2 text-base font-semibold">
                      <span aria-hidden>{activityEmoji(session.activity_name)}</span>
                      {session.activity_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{sessionWhen(session)}</p>
                    {session.objective && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                        {session.objective}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
