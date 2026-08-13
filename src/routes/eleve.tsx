import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { StudentNav } from "@/components/eps/StudentNav";
import { student } from "@/data/demo";

export const Route = createFileRoute("/eleve")({
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="mx-auto w-full max-w-md px-4 pt-6 lg:max-w-2xl lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="mono-label text-muted-foreground hover:text-primary">
            EPS Progress
          </Link>
          <span className="rounded bg-surface-2 px-2 py-1 font-mono text-[9px] uppercase tracking-tight text-primary">
            Espace élève · {student.className}
          </span>
        </div>
        <Outlet />
      </div>
      <StudentNav />
    </div>
  );
}
