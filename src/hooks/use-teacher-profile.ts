import { useQuery } from "@tanstack/react-query";

import { fetchTeacherProfile } from "@/lib/teacher-profile";

export const teacherProfileKey = ["teacher-profile"] as const;

export function useTeacherProfile() {
  return useQuery({
    queryKey: teacherProfileKey,
    queryFn: fetchTeacherProfile,
    staleTime: 30_000,
  });
}
