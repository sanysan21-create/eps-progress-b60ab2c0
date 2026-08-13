import { createFileRoute, Outlet, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";

import { StudentNav } from "@/components/eps/StudentNav";
import { getStudentSessionInfo, signOutStudent } from "@/lib/student-access.functions";

export const Route = createFileRoute("/eleve")({
  ssr: false,
  beforeLoad: async () => {
    const info = await getStudentSessionInfo();
    if (!info) throw redirect({ to: "/acces-eleve" });
    return { studentInfo: info };
  },
  component: StudentLayout,
});

function StudentLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchInfo = useServerFn(getStudentSessionInfo);
  const signOut = useServerFn(signOutStudent);

  const session = useQuery({ queryKey: ["student-session"], queryFn: () => fetchInfo() });
  const info = session.data;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    await signOut();
    queryClient.clear();
    void navigate({ to: "/acces-eleve", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto w-full max-w-md px-4 pt-6 lg:max-w-2xl lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="mono-label text-muted-foreground hover:text-primary">
            EPS Progress
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface-2 px-2 py-1 font-mono text-[9px] uppercase tracking-tight text-primary">
              {info ? `${info.firstName} · ${info.className ?? "sans classe"}` : "Espace élève"}
            </span>
            <button
              onClick={() => void handleSignOut()}
              aria-label="Se déconnecter"
              className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[9px] uppercase tracking-tight text-muted-foreground hover:text-primary"
            >
              <LogOut className="size-3" /> Se déconnecter
            </button>
          </div>
        </div>
        <Outlet />
      </div>
      <StudentNav />
    </div>
  );
}
