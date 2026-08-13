import { createFileRoute } from "@tanstack/react-router";

import { LevelDots } from "@/components/eps/LevelDots";
import { StrengthPicker } from "@/components/eps/StrengthPicker";
import {
  ENGAGEMENT_INDICATORS,
  ENGAGEMENT_LEVEL_MAX,
  engagementLevelLabel,
} from "@/lib/engagement";
import {
  averageProgress,
  flattenActivities,
  initialsOf,
  useMyStrength,
  useStudentActivities,
  useStudentEngagement,
  useStudentSession,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Profil EPS de l'élève : progression, compétences, implication en cours et points forts renseignés par l'enseignant.",
      },
      { property: "og:title", content: "Mon profil EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Progression, compétences, implication et points forts de l'élève.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProfile,
});

const activityEmojis: { match: string; emoji: string }[] = [
  { match: "natation", emoji: "🏊" },
  { match: "nage", emoji: "🏊" },
  { match: "basket", emoji: "🏀" },
  { match: "hand", emoji: "🤾" },
  { match: "foot", emoji: "⚽" },
  { match: "volley", emoji: "🏐" },
  { match: "badminton", emoji: "🏸" },
  { match: "tennis", emoji: "🎾" },
  { match: "course", emoji: "🏃" },
  { match: "athl", emoji: "🏃" },
  { match: "gym", emoji: "🤸" },
  { match: "danse", emoji: "💃" },
  { match: "escalade", emoji: "🧗" },
  { match: "muscu", emoji: "🏋️" },
  { match: "vélo", emoji: "🚴" },
  { match: "rugby", emoji: "🏉" },
];

function activityEmoji(name: string) {
  const normalized = name.toLowerCase();
  return activityEmojis.find((entry) => normalized.includes(entry.match))?.emoji ?? "🎽";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 px-5 py-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StudentProfile() {
  const session = useStudentSession();
  const profile = useStudentActivities();
  const engagement = useStudentEngagement();
  const myStrength = useMyStrength();

  const info = session.data;
  const activities = profile.data ?? [];
  const marks = flattenActivities(activities);
  const progress = averageProgress(marks);

  const engagementMarks = (engagement.data ?? [])
    .map((mark) => ({
      ...mark,
      indicator: ENGAGEMENT_INDICATORS.find((i) => i.code === mark.indicator_code),
    }))
    .filter((mark): mark is typeof mark & { indicator: (typeof ENGAGEMENT_INDICATORS)[number] } =>
      Boolean(mark.indicator),
    )
    .sort(
      (a, b) =>
        ENGAGEMENT_INDICATORS.indexOf(a.indicator) - ENGAGEMENT_INDICATORS.indexOf(b.indicator),
    );

  return (
    <div className="animate-slide-up space-y-10 pb-4">
      {/* Identité */}
      <header className="flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-border">
          <span className="display-title text-xl text-primary">
            {info ? initialsOf(info.firstName, info.lastName) : "?"}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="display-title text-2xl leading-tight">
            Bonjour {info?.firstName ?? "…"} 👋
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {info ? `${info.firstName} ${info.lastName}` : ""}
            {info?.className ? ` · ${info.className}` : ""}
          </p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-foreground/80">
        {progress === null
          ? "Ton profil se construira au fil des séances. Chaque effort compte."
          : "Continue à progresser, chaque effort compte."}
      </p>

      {/* Progression */}
      <Section title="Ma progression">
        {progress === null ? (
          <EmptyNote>Tes premières évaluations apparaîtront ici.</EmptyNote>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-end justify-between">
              <p className="text-sm text-muted-foreground">Niveaux atteints</p>
              <p className="display-title text-3xl text-primary">{progress}%</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full origin-left rounded-full bg-primary animate-bar-grow"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Moyenne de tes niveaux sur {marks.length} compétence{marks.length > 1 ? "s" : ""}{" "}
              évaluée{marks.length > 1 ? "s" : ""}.
            </p>
          </div>
        )}
      </Section>

      {/* Compétences */}
      <Section title="Mes compétences">
        {activities.length === 0 ? (
          <EmptyNote>Aucune compétence renseignée pour le moment.</EmptyNote>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <article
                key={activity.activity_id}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <span aria-hidden>{activityEmoji(activity.activity_name)}</span>
                  {activity.activity_name}
                </h3>
                <ul className="mt-4 space-y-4">
                  {activity.competencies.map((competency) => (
                    <li key={competency.id} className="space-y-1.5">
                      <p className="text-sm font-medium leading-snug">{competency.label}</p>
                      <div className="flex items-center gap-3">
                        <LevelDots
                          level={competency.level_position}
                          max={competency.level_max}
                          label={`${competency.label} : niveau ${competency.level_position} sur ${competency.level_max}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {competency.level_label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* Implication */}
      <Section title="Mon implication en EPS">
        {engagementMarks.length === 0 ? (
          <EmptyNote>Ton implication sera renseignée au fil des séances.</EmptyNote>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <ul className="space-y-4">
              {engagementMarks.map((mark) => (
                <li key={mark.indicator_code} className="space-y-1.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span aria-hidden>{mark.indicator.emoji}</span>
                    {mark.indicator.label}
                  </p>
                  <div className="flex items-center gap-3">
                    <LevelDots
                      level={mark.level}
                      max={ENGAGEMENT_LEVEL_MAX}
                      label={`${mark.indicator.label} : ${engagementLevelLabel(mark.level)}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {engagementLevelLabel(mark.level)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Point fort personnel : choisi par l'élève lui-même */}
      <Section title="Mon point fort ⭐">
        <StrengthPicker current={myStrength.data ?? null} />
      </Section>
    </div>
  );
}
