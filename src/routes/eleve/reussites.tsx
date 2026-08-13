import { createFileRoute } from "@tanstack/react-router";

import { AchievementBadges } from "@/components/eps/AchievementBadges";
import { RankJourney } from "@/components/eps/RankJourney";
import { computeProgression, splitAchievements } from "@/lib/progression";
import {
  flattenActivities,
  useMyGoal,
  useMyStrengths,
  useStudentActivities,
  useStudentEngagement,
} from "@/hooks/use-student-profile";

export const Route = createFileRoute("/eleve/reussites")({
  head: () => ({
    meta: [
      { title: "Mes réussites EPS — EPS Progress" },
      {
        name: "description",
        content:
          "Réussites personnelles de l'élève en EPS : badges d'engagement et de progrès obtenus au fil du parcours.",
      },
      { property: "og:title", content: "Mes réussites EPS — EPS Progress" },
      {
        property: "og:description",
        content: "Badges d'engagement et de progrès obtenus au fil du parcours personnel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentAchievements,
});

function StudentAchievements() {
  const activities = useStudentActivities();
  const engagement = useStudentEngagement();
  const strengths = useMyStrengths();
  const goal = useMyGoal();

  const input = {
    marks: flattenActivities(activities.data ?? []),
    engagement: engagement.data ?? [],
    strengths: strengths.data ?? [],
    goal: goal.data ?? null,
  };
  const journey = computeProgression(input);
  const { unlocked, locked } = splitAchievements(input);

  return (
    <div className="animate-slide-up space-y-8 pb-4">
      <header className="space-y-1">
        <h1 className="display-title text-3xl leading-tight">Mes réussites</h1>
        <p className="text-sm text-muted-foreground">
          Les traces de ton parcours personnel, séance après séance.
        </p>
      </header>

      {activities.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <AchievementBadges unlocked={unlocked} locked={locked} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          🚀 Mon parcours
        </h2>
        <RankJourney state={journey} />
      </section>
    </div>
  );
}
