import { createFileRoute } from "@tanstack/react-router";
import { studentHistory, progressionSeries } from "@/data/demo";

export const Route = createFileRoute("/eleve/progression")({
  head: () => ({
    meta: [
      { title: "Ma progression — EPS Progress" },
      {
        name: "description",
        content:
          "Historique de progression de l'élève en EPS : évolution du niveau moyen et validations mois par mois.",
      },
      { property: "og:title", content: "Ma progression — EPS Progress" },
      {
        property: "og:description",
        content: "Évolution du niveau moyen et validations de compétences mois par mois.",
      },
    ],
  }),
  component: StudentProgress,
});

function StudentProgress() {
  const max = 5;

  return (
    <div className="animate-slide-up space-y-8">
      <header className="space-y-1">
        <p className="mono-label text-primary">Évolution du niveau moyen</p>
        <h1 className="display-title text-4xl">Ma progression</h1>
      </header>

      <section className="rounded-3xl border border-border bg-surface p-5">
        <div className="flex h-44 items-end gap-3">
          {progressionSeries.map((p) => (
            <div key={p.month} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[10px] text-primary">{p.value}</span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-lg bg-primary/80"
                  style={{ height: `${(p.value / max) * 100}%` }}
                />
              </div>
              <span className="mono-label text-muted-foreground">{p.month}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="display-title text-xl italic">Historique</h2>
        <div className="relative space-y-8 pl-8 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-border">
          {studentHistory.map((h) => (
            <div key={h.id} className="relative">
              <div
                className={`absolute -left-[26px] top-1.5 size-2.5 rounded-full ring-4 ring-background ${
                  h.highlight ? "bg-primary" : "bg-surface-2"
                }`}
              />
              <p className="mono-label text-primary">{h.date}</p>
              <p className="mt-1 font-bold">{h.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{h.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
