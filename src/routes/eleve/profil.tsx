import { createFileRoute } from "@tanstack/react-router";

import { LevelDots } from "@/components/eps/LevelDots";
import { StrengthPicker } from "@/components/eps/StrengthPicker";
import { GoalPicker } from "@/components/eps/GoalPicker";
import { computeProgression } from "@/lib/progression";
import {
  ENGAGEMENT_INDICATORS,
  ENGAGEMENT_LEVEL_MAX,
  engagementLevelLabel,
} from "@/lib/engagement";
import {
  averageProgress,
  flattenActivities,
  initialsOf,
  useMyGoal,
  useMyStrengths,
  useStudentActivities,
  useStudentEngagement,
  useStudentSession,
  useMyMedal,
  useMyAsMember,
} from "@/hooks/use-student-profile";
import { MedalBadge } from "@/components/eps/MedalBadge";
import { AsBadge } from "@/components/eps/AsBadge";

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
  const myStrengths = useMyStrengths();
  const myGoal = useMyGoal();
  const myMedal = useMyMedal();
  const myAs = useMyAsMember();

  const info = session.data;
  const activities = profile.data ?? [];
  const marks = flattenActivities(activities);
  const progress = averageProgress(marks);

  const strengths = myStrengths.data ?? [];
  const goal = myGoal.data ?? null;
  const progressionInput = {
    marks,
    engagement: engagement.data ?? [],
    strengths,
    goal,
  };
  const journey = computeProgression(progressionInput);

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
        <div className="min-w-0 flex-1">
          <h1 className="display-title text-2xl leading-tight">
            Bonjour {info?.firstName ?? "…"} 👋
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {info ? `${info.firstName} ${info.lastName}` : ""}
            {info?.className ? ` · ${info.className}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {myAs.data && (
            <div className="animate-slide-up text-center">
              <AsBadge size={48} />
            </div>
          )}
          {myMedal.data && (
            <div className="animate-slide-up text-center">
              <MedalBadge code={myMedal.data} size={92} withLabel />
            </div>
          )}
        </div>
      </header>

      <p className="text-sm leading-relaxed text-foreground/80">
        {journey.hasData
          ? "Ton parcours se construit étape par étape : tu progresses par rapport à toi-même."
          : "Ton parcours se construira au fil des séances. Chaque étape compte."}
      </p>

      {/* Progression synthétique — le détail est dans l'onglet Progrès */}


      {/* Progression */}
      <Section title="📈 Ma progression">
        {progress === null ? (
          <EmptyNote>Tes premières évaluations apparaîtront ici.</EmptyNote>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-muted-foreground">Niveaux atteints dans tes compétences</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full origin-left rounded-full bg-primary animate-bar-grow"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Moyenne de tes niveaux sur {marks.length} compétence{marks.length > 1 ? "s" : ""}{" "}
              évaluée{marks.length > 1 ? "s" : ""}. Ce repère te concerne uniquement toi.
            </p>
          </div>
        )}
      </Section>

      {/* Compétences */}
      <Section title="🎯 Mes compétences">
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
                      {competency.level_tip && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
                          <p className="mono-label text-primary">
                            💡 Conseil de ton enseignant
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
                            {competency.level_tip}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* Implication */}
      <Section title="💪 Mon implication en EPS">
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

      {/* Points forts : choisis par l'élève lui-même */}
      <Section title="⭐ Mes points forts">
        <StrengthPicker current={strengths} />
      </Section>

      {/* Objectif : point à travailler choisi par l'élève lui-même */}
      <Section title="🚀 Mon objectif">
        <GoalPicker current={goal} />
      </Section>
    </div>
  );
}
