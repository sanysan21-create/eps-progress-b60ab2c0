import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Lock } from "lucide-react";
import { studentAchievements } from "@/data/demo";

export const Route = createFileRoute("/eleve/reussites")({
  head: () => ({
    meta: [
      { title: "Mes réussites — EPS Progress" },
      {
        name: "description",
        content: "Badges et réussites débloqués en EPS : records battus, niveaux validés et défis relevés.",
      },
      { property: "og:title", content: "Mes réussites — EPS Progress" },
      {
        property: "og:description",
        content: "Badges débloqués, records battus et niveaux validés en EPS.",
      },
    ],
  }),
  component: StudentAchievements,
});

function StudentAchievements() {
  return (
    <div className="animate-slide-up space-y-6">
      <header className="space-y-1">
        <p className="mono-label text-primary">
          {studentAchievements.filter((a) => a.unlocked).length} badges débloqués
        </p>
        <h1 className="display-title text-4xl">Mes réussites</h1>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {studentAchievements.map((a) => (
          <article
            key={a.id}
            className={`flex items-center gap-4 rounded-3xl border p-5 ${
              a.unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-surface opacity-60"
            }`}
          >
            <div
              className={`grid size-12 shrink-0 place-items-center rounded-full ${
                a.unlocked ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
              }`}
            >
              {a.unlocked ? <Trophy className="size-5" /> : <Lock className="size-5" />}
            </div>
            <div>
              <p className="text-sm font-bold uppercase italic">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.detail}</p>
              <p className="mono-label mt-1 text-primary">{a.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
