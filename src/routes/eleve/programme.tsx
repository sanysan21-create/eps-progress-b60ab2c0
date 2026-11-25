import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyProgram } from "@/lib/program.functions";
import { nextSession, sessionWhen } from "@/lib/program";
import { getMyProgramSequences } from "@/lib/program-sequences.functions";
import { sequenceRange } from "@/lib/program-sequences";
import { activityEmoji } from "@/lib/activity-emoji";
import { UltimateSessionMatches } from "@/components/eps/UltimateSessionMatches";
import { CaptainPowers } from "@/components/eps/CaptainPowers";
import { StudentQuizzes } from "@/components/eps/StudentQuizzes";
import { AcrosportGroupPicker } from "@/components/eps/AcrosportGroupPicker";
import { AcrosportMusic } from "@/components/eps/AcrosportMusic";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAcrosportActivity } from "@/lib/acrosport";
import { isUltimateActivity } from "@/lib/ultimate";
import { localToday, currentActivityName, currentSessionId, isPastSession, programActivityNames } from "@/lib/current-activity";
import { ActivityPills } from "@/components/eps/ActivityPills";

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
  const [zoom, setZoom] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Activités programmées : une entrée par nom, issues des séquences et des séances libres.
  const activityNames = programActivityNames(sessions, sequences);
  // Aucune activité présélectionnée : l'élève doit cliquer pour afficher les séances.
  // L'activité en cours est mise au premier plan par défaut ; les autres restent accessibles.
  const currentActivity = currentActivityName(sessions, localToday(), sequences);
  const currentId = currentSessionId(sessions);
  const activeActivity =
    selectedActivity && activityNames.includes(selectedActivity)
      ? selectedActivity
      : currentActivity && activityNames.includes(currentActivity)
        ? currentActivity
        : null;
  const openSessionId = selectedSessionId ?? currentId;
  const visibleSequences = sequences.filter(
    (sequence) => sequence.activity_name === activeActivity,
  );
  const visibleFreeSessions = sessions.filter(
    (session) => !session.sequence_id && session.activity_name === activeActivity,
  );

  // Barèmes photo attachés aux séquences, affichés en bas de page.
  const sequenceScales = sequences.filter((sequence) => sequence.scale_image_url);

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

      <ActivityPills
        names={activityNames}
        active={activeActivity}
        onSelect={(name) => {
          setSelectedActivity(name);
          setSelectedSessionId(null);
        }}
      />

      {isUltimateActivity(activeActivity) && <CaptainPowers />}
      {isAcrosportActivity(activeActivity) && (
        <Tabs defaultValue="group">
          <TabsList>
            <TabsTrigger value="group">Groupe d’acrosport</TabsTrigger>
            <TabsTrigger value="music">Musique</TabsTrigger>
          </TabsList>
          <TabsContent value="group"><AcrosportGroupPicker /></TabsContent>
          <TabsContent value="music"><AcrosportMusic /></TabsContent>
        </Tabs>
      )}

      {visibleSequences.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            Mes séquences
          </h2>
          <ul className="space-y-3">
            {visibleSequences.map((sequence) => (
              <li
                key={sequence.id}
                className="rounded-2xl border border-border bg-surface px-5 py-4"
              >
                <p className="flex items-center gap-2 text-base font-semibold">
                  <span aria-hidden className="text-xl leading-none">{activityEmoji(sequence.activity_name ?? sequence.name)}</span>
                  {sequence.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[sequenceRange(sequence), sequence.activity_name].filter(Boolean).join(" · ") ||
                    "Séquence à venir"}
                </p>
                {(() => {
                  const seqSessions = sessions.filter((session) => session.sequence_id === sequence.id);
                  const pastSessions = seqSessions.filter((session) => isPastSession(session, currentId));
                  const renderBtn = (session: (typeof seqSessions)[number], index: number) => (
                    <Button key={session.id} variant={openSessionId === session.id ? "default" : "outline"} size="sm"
                      aria-pressed={openSessionId === session.id}
                      aria-label={`${sequence.name} — Séance ${session.session_number ?? index + 1}`}
                      onClick={() => setSelectedSessionId(session.id)}>
                      S{session.session_number ?? index + 1} · {sessionWhen(session)}
                    </Button>
                  );
                  return (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {seqSessions.filter((session) => !pastSessions.includes(session)).map((session) => renderBtn(session, seqSessions.indexOf(session)))}
                      </div>
                      {pastSessions.length > 0 && (
                        <details className="mt-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground">📂 Séances précédentes ({pastSessions.length})</summary>
                          <div className="mt-2 flex flex-wrap gap-2 opacity-80">
                            {pastSessions.map((session) => renderBtn(session, seqSessions.indexOf(session)))}
                          </div>
                        </details>
                      )}
                    </>
                  );
                })()}
                {sessions.filter((session) => session.sequence_id === sequence.id && session.id === openSessionId).map((session) => (
                  <div key={session.id} className="mt-4 space-y-3">
                    {session.objective && <p className="text-sm">{session.objective}</p>}
                    {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}
                    <UltimateSessionMatches sessionId={session.id} />
                    <StudentQuizzes sessionId={session.id} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}

      {visibleFreeSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Mes séances</h2>
          <div className="flex flex-wrap gap-2">
            {visibleFreeSessions.map((session) => (
              <Button key={session.id} variant={selectedSessionId === session.id ? "default" : "outline"}
                aria-pressed={selectedSessionId === session.id}
                onClick={() => setSelectedSessionId((id) => id === session.id ? null : session.id)}>
                {session.activity_name} · {sessionWhen(session)}
              </Button>
            ))}
          </div>
          {visibleFreeSessions.filter((session) => session.id === openSessionId).map((session) => (
            <div key={session.id} className="space-y-3">
              {session.objective && <p className="text-sm">{session.objective}</p>}
              {session.description && (
                <p className="text-sm text-muted-foreground">{session.description}</p>
              )}
              <UltimateSessionMatches sessionId={session.id} />
              <StudentQuizzes sessionId={session.id} />
            </div>
          ))}
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
                  <span aria-hidden className="text-xl leading-none">{activityEmoji(next.activity_name)}</span>
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

          {scales.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                📊 Mes barèmes
              </h2>
              <ul className="space-y-3">
                {scales.map((session) => (
                  <li
                    key={`scale-${session.id}`}
                    className="overflow-hidden rounded-2xl border border-border bg-surface"
                  >
                    <button
                      type="button"
                      onClick={() => setZoom(session.scale_image_url)}
                      className="w-full text-left"
                    >
                      <img
                        src={session.scale_image_url ?? ""}
                        alt={`Barème ${session.scale_activity_name ?? session.activity_name}`}
                        className="max-h-44 w-full bg-background object-contain"
                      />
                      <span className="flex items-center justify-between gap-2 px-5 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <span aria-hidden>
                            {activityEmoji(session.scale_activity_name ?? session.activity_name)}
                          </span>
                          {session.scale_activity_name ?? session.activity_name}
                        </span>
                        <span className="text-xs text-muted-foreground">Voir le barème</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {sequenceScales.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            📊 Barèmes de mes séquences
          </h2>
          <ul className="space-y-3">
            {sequenceScales.map((sequence) => (
              <li
                key={`seq-scale-${sequence.id}`}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setZoom(sequence.scale_image_url)}
                  className="w-full text-left"
                >
                  <img
                    src={sequence.scale_image_url ?? ""}
                    alt={`Barème ${sequence.name}`}
                    className="max-h-56 w-full bg-background object-contain"
                  />
                  <span className="flex items-center justify-between gap-2 px-5 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span aria-hidden>
                        {activityEmoji(sequence.activity_name ?? sequence.name)}
                      </span>
                      {sequence.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Appuie pour agrandir</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
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
