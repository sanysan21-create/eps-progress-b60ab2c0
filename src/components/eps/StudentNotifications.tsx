import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyNotifications } from "@/lib/student-notifications.functions";

const icons = { achievement: Trophy, result: ClipboardList, program: CalendarDays, quiz: ClipboardList };
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
});

export function StudentNotifications() {
  const [expanded, setExpanded] = useState(false);
  const fetchNotifications = useServerFn(getMyNotifications);
  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60_000,
  });
  const items = notifications.data ?? [];
  const visible = expanded ? items : items.slice(0, 3);

  return (
    <section aria-label="Notifications" className="mb-6 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-3">
        <Bell className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="mono-label flex-1 text-xs font-bold">Notifications</h2>
        {items.length > 0 && <span className="text-xs font-bold text-primary">{items.length}</span>}
      </div>
      {notifications.isPending ? (
        <p role="status" className="px-4 pb-3 text-xs text-muted-foreground">Chargement des nouveautés…</p>
      ) : notifications.isError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
          <p className="text-xs text-muted-foreground">Les nouveautés sont momentanément indisponibles.</p>
          <Button variant="ghost" size="sm" onClick={() => void notifications.refetch()}>Réessayer</Button>
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground">Aucune nouveauté ces 30 derniers jours.</p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {visible.map((item) => {
            const Icon = icons[item.kind];
            return (
              <li key={item.id}>
                <Link to={item.to} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold">{item.title}</p>
                    <p className="break-words text-xs text-muted-foreground">{item.detail}</p>
                    <time dateTime={item.at} className="mt-1 block text-[10px] text-muted-foreground">{dateFormat.format(new Date(item.at))}</time>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 3 && (
        <Button variant="ghost" className="w-full rounded-none border-t border-border text-xs" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Réduire" : "Voir toutes les nouveautés"}
          <ChevronDown className={expanded ? "rotate-180" : ""} />
        </Button>
      )}
    </section>
  );
}