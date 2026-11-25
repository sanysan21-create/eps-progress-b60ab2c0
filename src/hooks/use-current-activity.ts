import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProgram } from "@/lib/program.functions";
import { currentActivityName } from "@/lib/current-activity";

export function useCurrentActivityName(): string | null {
  const fetchProgram = useServerFn(getMyProgram);
  const program = useQuery({ queryKey: ["my-program"], queryFn: () => fetchProgram() });
  return currentActivityName(program.data ?? []);
}
