import { Button } from "@/components/ui/button";
import { activityEmoji } from "@/lib/activity-emoji";

/**
 * Pastilles de choix d'activité, affichées en haut des écrans élève.
 * L'activité active est celle du jour au calendrier, sauf si l'élève en choisit une autre.
 */
export function ActivityPills({
  names,
  active,
  onSelect,
  label = "🗂️ Mes activités",
}: {
  names: string[];
  active: string | null;
  onSelect: (name: string) => void;
  label?: string;
}) {
  if (names.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">{label}</h2>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Activités programmées">
        {names.map((name) => (
          <Button
            key={name}
            variant={active === name ? "default" : "outline"}
            size="sm"
            role="tab"
            aria-selected={active === name}
            onClick={() => onSelect(name)}
          >
            {activityEmoji(name)} {name}
          </Button>
        ))}
      </div>
    </section>
  );
}
