import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getTeacherAccount } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const account = await getTeacherAccount();
    if (!account) throw redirect({ to: "/auth" });
    return { account };
  },
  component: () => <Outlet />,
});
