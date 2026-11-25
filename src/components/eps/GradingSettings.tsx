import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateActivity, updateCompetency, type ActivityTree, type Competency } from "@/lib/competencies.functions";
import { activityScale, competencyBudgetKey, competencyMaxPoints, formatPoints, type ActivityScale, type Afl1Part } from "@/lib/grades";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const keys = ["AFL1a", "AFL1b", "AFL2", "AFL3"] as const;

function report(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Barème non enregistré");
}

export function ActivityGrading({ activity, onChanged }: { activity: ActivityTree; onChanged: () => Promise<void> }) {
  const save = useServerFn(updateActivity);
  const [draft, setDraft] = useState<ActivityScale>(() => activityScale(activity.grading_scale));
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(activityScale(activity.grading_scale)), [activity.grading_scale]);
  const total = Object.values(draft).reduce((sum, value) => sum + value, 0);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { id: activity.id, gradingScale: draft } });
      await onChanged();
      toast.success("Barème de l'activité enregistré");
    } catch (error) { report(error); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3 border-y border-border py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="mono-label text-primary">Points par AFL</h3>
        <p className="font-mono text-sm">AFL1 : {formatPoints(draft.AFL1a + draft.AFL1b)} pts · Total : {formatPoints(total)} pts</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {keys.map((key) => {
          const group = activity.competencies.filter((item) => competencyBudgetKey(item) === key);
          const allocated = group.reduce((sum, item) => sum + competencyMaxPoints(item, activity.competencies, draft), 0);
          return (
            <label key={key} className="space-y-1.5">
              <span className="text-sm font-semibold">{key} · points maximum</span>
              <input type="number" min="0" max="100" step="0.5" required value={draft[key]}
                aria-label={`Points maximum ${key}`}
                onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))}
                className={inputClass} />
              <span className={`block text-xs ${allocated > draft[key] + 0.01 ? "text-destructive" : "text-muted-foreground"}`}>
                Compétences : {formatPoints(allocated)} / {formatPoints(draft[key])} pts
              </span>
            </label>
          );
        })}
      </div>
      <Button size="sm" disabled={saving} onClick={() => void submit()}><Save /> Enregistrer le barème AFL</Button>
    </div>
  );
}

export function CompetencyGrading({ competency, activity, onChanged }: { competency: Competency; activity: ActivityTree; onChanged: () => Promise<void> }) {
  const save = useServerFn(updateCompetency);
  const [points, setPoints] = useState(competency.max_points == null ? "" : String(competency.max_points));
  const [part, setPart] = useState<Afl1Part>(competency.afl1_part ?? "a");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setPoints(competency.max_points == null ? "" : String(competency.max_points));
    setPart(competency.afl1_part ?? "a");
  }, [competency.max_points, competency.afl1_part]);
  const key = competencyBudgetKey(competency);
  if (!key) return null;
  const resolved = competencyMaxPoints({ ...competency, afl1_part: part, max_points: points === "" ? null : Number(points) },
    activity.competencies.map((item) => item.id === competency.id ? { ...item, afl1_part: part, max_points: points === "" ? null : Number(points) } : item), activity.grading_scale);

  async function submit() {
    setSaving(true);
    try {
      await save({ data: { id: competency.id, maxPoints: points === "" ? null : Number(points), afl1Part: part } });
      await onChanged();
      toast.success("Points de la compétence enregistrés");
    } catch (error) { report(error); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
      {competency.afl === "AFL1" && (
        <fieldset className="space-y-1.5">
          <legend className="text-xs text-muted-foreground">Volet AFL1</legend>
          <div className="flex gap-1">
            {(["a", "b"] as const).map((value) => <Button key={value} size="sm" variant={part === value ? "default" : "outline"}
              aria-pressed={part === value} onClick={() => setPart(value)}>AFL1{value}</Button>)}
          </div>
        </fieldset>
      )}
      <label className="w-40 space-y-1.5">
        <span className="text-xs text-muted-foreground">Points maximum</span>
        <input type="number" min="0" max="100" step="0.5" value={points} placeholder={`Auto : ${formatPoints(resolved)}`}
          aria-label={`Points maximum — ${competency.label}`} className={inputClass} onChange={(event) => setPoints(event.target.value)} />
      </label>
      <span className="py-2 text-xs text-muted-foreground">{points === "" ? "Répartition automatique" : "Barème personnalisé"} : {formatPoints(resolved)} pts</span>
      <Button size="sm" variant="outline" disabled={saving} onClick={() => void submit()}><Save /> Enregistrer les points</Button>
    </div>
  );
}