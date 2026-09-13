import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMyRewards, setMyProfileTitle, setMyRewardTheme } from "@/lib/rewards.functions";

export const rewardsKey = ["my-rewards"] as const;

/** Personnalisations enregistrées de l'élève connecté (thème et titre de profil). */
export function useMyRewards() {
  const fetchRewards = useServerFn(getMyRewards);
  return useQuery({ queryKey: rewardsKey, queryFn: () => fetchRewards() });
}

export function useSetRewardTheme() {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyRewardTheme);
  return useMutation({
    mutationFn: (theme: string) => save({ data: { theme } }),
    onSuccess: (data) => queryClient.setQueryData(rewardsKey, data),
  });
}

export function useSetProfileTitle() {
  const queryClient = useQueryClient();
  const save = useServerFn(setMyProfileTitle);
  return useMutation({
    mutationFn: (title: string) => save({ data: { title } }),
    onSuccess: (data) => queryClient.setQueryData(rewardsKey, data),
  });
}
