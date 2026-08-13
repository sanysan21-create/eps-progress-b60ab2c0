import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";

import { listClasses } from "@/lib/classes.functions";
import { listClassStudents } from "@/lib/achievements.functions";
import {
  clearStudentMedal,
  listStudentMedals,
  setStudentMedal,
} from "@/lib/medals.functions";
import { MEDALS } from "@/lib/medals";
import { MedalBadge } from "@/components/eps/MedalBadge";

/**
 * Attribution manuelle des médailles : Classe → Élève → Médaille → Valider.
 * Une seule médaille par élève, remplaçable ou retirable à tout moment.
 */
export function MedalAssign() {
  const queryClient = useQueryClient();
  const fetchClasses = useServerFn(listClasses);
  const fetchClassStudents = useServerFn(listClassStudents);
  const fetchMedals = useServerFn(listStudentMedals);
  const save = useServerFn(setStudentMedal);
  const clear = useServerFn(clearStudentMedal);

  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [medalCode, setMedalCode] = useState<string>("");

  const classes = useQuery({ queryKey: ["classes"], queryFn: () => fetchClasses() });
  const students = useQuery({
    queryKey: ["class-students", classId],
    queryFn: () => fetchClassStudents({ data: { classId } }),
    enabled: Boolean(classId),
  });
  const medals = useQuery({ queryKey: ["student-medals"], queryFn: () => fetchMedals() });

  const medalOf = (id: string) =>
    (medals.data ?? []).find((row) => row.student_id === id)?.medal ?? null;

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { studentId, medal: medalCode } }),
    onSuccess: () => {
      toast.success("Médaille attribuée");
      setMedalCode("");
      queryClient.invalidateQueries({ queryKey: ["student-medals"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Attribution impossible"),
  });

  const clearMutation = useMutation({
    mutationFn: (id: string) => clear({ data: { studentId: id } }),
    onSuccess: () => {
      toast.success("Médaille retirée");
      queryClient.invalidateQueries({ queryKey: ["student-medals"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Retrait impossible"),
  });

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-display text-lg uppercase tracking-wide">🏅 Médailles</h2>
        <p className="text-sm text-muted-foreground">
          Bronze, argent ou or : une distinction visuelle attribuée manuellement, sans classement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="mono-label text-muted-foreground">Classe</span>
          <select
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudentId("");
            }}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Choisir une classe…</option>
            {(classes.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.school_year}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="mono-label text-muted-foreground">Élève</span>
          <select
            value={studentId}
            disabled={!classId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary disabled:opacity-50"
          >
            <option value="">Choisir un élève…</option>
            {(students.data ?? []).map((student) => (
              <option key={student.id} value={student.id}>
                {student.first_name} {student.last_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        {MEDALS.map((item) => (
          <button
            key={item.code}
            type="button"
            disabled={!studentId}
            onClick={() => setMedalCode(item.code)}
            className={`flex flex-1 min-w-[120px] flex-col items-center gap-2 rounded-2xl border p-4 transition disabled:opacity-50 ${
              medalCode === item.code
                ? "border-primary bg-primary/10"
                : "border-border bg-surface-2 hover:border-primary/50"
            }`}
          >
            <MedalBadge code={item.code} size={56} />
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!studentId || !medalCode || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
      >
        <Check className="size-4" /> Valider la médaille
      </button>

      {classId && (students.data ?? []).length > 0 && (
        <ul className="space-y-2 border-t border-border/60 pt-4">
          {(students.data ?? []).map((student) => {
            const code = medalOf(student.id);
            return (
              <li
                key={student.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
              >
                <span className="truncate text-sm">
                  {student.first_name} {student.last_name}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {code ? (
                    <>
                      <MedalBadge code={code} size={26} withLabel />
                      <button
                        type="button"
                        onClick={() => clearMutation.mutate(student.id)}
                        aria-label="Retirer la médaille"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  ) : (
                    <span className="mono-label text-muted-foreground">Aucune</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
