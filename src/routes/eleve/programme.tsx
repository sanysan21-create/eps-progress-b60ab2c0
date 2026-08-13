import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyProgram } from "@/lib/program.functions";
import { nextSession, sessionWhen, upcomingSessions } from "@/lib/program";
import { getMyProgramSequences } from "@/lib/program-sequences.functions";
import { sequenceRange } from "@/lib/program-sequences";
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
  const fetchSequences = useServerFn(getMyProgramSequences);
  const program = useQuery({ queryKey: ["my-program"], queryFn: () => fetchProgram() });
  const sequencesQuery = useQuery({
    queryKey: ["my-program-sequences"],
    queryFn: () => fetchSequences(),
  });
  const sessions = program.data ?? [];
  const sequences = sequencesQuery.data ?? [];
  const next = nextSession(sessions);
  const upcoming = upcomingSessions(sessions);
  const [zoom, setZoom] = useState<string | null>(null);

  // Barèmes disponibles : une entrée par activité, dédoublonnée.
  const scales = sessions
    .filter((session) => session.scale_image_url)
    .filter(
      (session, index, all) =>
        all.findIndex(
          (other) =>
            (other.scale_activity_name ?? other.activity_name) ===
            (session.scale_activity_name ?? session.activity_name),
        ) === index,
    );

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-2xl leading-tight">📅 Programme</h1>
        <p className="text-sm text-muted-foreground">
          Programmation renseignée par ton enseignant, en lecture seule.
        </p>
      </header>

      {sequences.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            🗂️ Mes séquences
          </h2>
          <ul className="space-y-3">
            {sequences.map((sequence) => (
              <li
                key={sequence.id}
                className="rounded-2xl border border-border bg-surface px-5 py-4"
              >
                <p className="flex items-center gap-2 text-base font-semibold">
                  <span aria-hidden>{activityEmoji(sequence.activity_name ?? sequence.name)}</span>
                  {sequence.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[sequenceRange(sequence), sequence.activity_name].filter(Boolean).join(" · ") ||
                    "Séquence à venir"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {program.isPending ? (
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
      ) : sessions.length === 0 ? (
        sequences.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
            Le programme sera bientôt disponible.
          </div>
        ) : null
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
                {next.scale_image_url && (
                  <button
                    type="button"
                    onClick={() => setZoom(next.scale_image_url)}
                    className="mt-4 w-full overflow-hidden rounded-xl border border-border bg-background text-left"
                  >
                    <img
                      src={next.scale_image_url}
                      alt="Barème de la séance"
                      className="max-h-48 w-full object-contain"
                    />
                    <span className="block px-3 py-2 text-xs text-muted-foreground">
                      📊 Barème — appuie pour agrandir
                    </span>
                  </button>
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
                    {session.scale_image_url && (
                      <button
                        type="button"
                        onClick={() => setZoom(session.scale_image_url)}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        📊 Voir le barème
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-label="Barème"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
        >
          <img
            src={zoom}
            alt="Barème de la séance"
            className="max-h-[85vh] w-full max-w-3xl rounded-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="absolute right-4 top-4 rounded-full border border-border bg-surface px-4 py-2 text-sm"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
