import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProgram } from "@/lib/program.functions";
import { getMyProgramSequences } from "@/lib/program-sequences.functions";
import { currentActivityName, localToday, programActivityNames } from "@/lib/current-activity";

/**
 * Programme de l'élève connecté, partagé entre les écrans : les mêmes clés de cache
 * sont utilisées par Programme, Profil et Progrès, donc une seule lecture serveur.
 */
function useMyProgramData() {
  const fetchProgram = useServerFn(getMyProgram);
  const fetchSequences = useServerFn(getMyProgramSequences);
  const program = useQuery({ queryKey: ["my-program"], queryFn: () => fetchProgram() });
  const sequences = useQuery({
    queryKey: ["my-program-sequences"],
    queryFn: () => fetchSequences(),
  });
  return { sessions: program.data ?? [], sequences: sequences.data ?? [] };
}

/** Activité en cours d'après la date du jour et les séquences programmées au calendrier. */
export function useCurrentActivityName(): string | null {
  const { sessions, sequences } = useMyProgramData();
  return currentActivityName(sessions, localToday(), sequences);
}

/**
 * Base du sélecteur d'activité affiché en haut des écrans élève : la liste des
 * activités programmées et celle qui correspond à la date du jour.
 */
export function useMyProgramActivities() {
  const { sessions, sequences } = useMyProgramData();
  return {
    names: programActivityNames(sessions, sequences),
    current: currentActivityName(sessions, localToday(), sequences),
  };
}
