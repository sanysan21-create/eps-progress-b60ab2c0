import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProgram } from "@/lib/program.functions";
import { getMyProgramSequences } from "@/lib/program-sequences.functions";
import { currentActivityName, localToday } from "@/lib/current-activity";

/** Activité en cours d'après la date du jour et les séquences programmées au calendrier. */
export function useCurrentActivityName(): string | null {
  const fetchProgram = useServerFn(getMyProgram);
  const fetchSequences = useServerFn(getMyProgramSequences);
  const program = useQuery({ queryKey: ["my-program"], queryFn: () => fetchProgram() });
  const sequences = useQuery({ queryKey: ["my-program-sequences"], queryFn: () => fetchSequences() });
  return currentActivityName(program.data ?? [], localToday(), sequences.data ?? []);
}
