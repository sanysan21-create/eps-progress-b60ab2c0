import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listProgramSequences } from "@/lib/program-sequences.functions";

/**
 * Activités réellement programmées pour une classe (via les séquences de l'onglet Programme).
 * Les séquences sans classe s'appliquent à toutes les classes.
 * `ids` vaut null quand aucune classe n'est choisie : dans ce cas, pas de filtrage.
 */
export function useProgrammedActivities(options: {
  classId?: string | null;
  className?: string | null;
}) {
  const { classId, className } = options;
  const fetchSequences = useServerFn(listProgramSequences);
  const sequences = useQuery({
    queryKey: ["program-sequences"],
    queryFn: () => fetchSequences(),
  });

  const hasClass = Boolean(classId || className);

  const ids = useMemo(() => {
    if (!hasClass) return null;
    const set = new Set<string>();
    for (const sequence of sequences.data ?? []) {
      const matches =
        sequence.class_id === null ||
        (classId ? sequence.class_id === classId : false) ||
        (className ? sequence.class_name === className : false);
      if (matches && sequence.activity_id) set.add(sequence.activity_id);
    }
    return set;
  }, [sequences.data, hasClass, classId, className]);

  return {
    /** null = pas de classe sélectionnée, donc aucun filtrage. */
    ids,
    isPending: sequences.isPending,
    /** true quand la classe a au moins une séquence avec une activité. */
    hasProgram: ids === null ? true : ids.size > 0,
  };
}
