import { activityEmoji } from "@/lib/activity-emoji";

/**
 * Visuel d'activité unique dans toute l'application : les émojis de l'espace
 * élève sont la référence, y compris côté enseignant.
 * L'API est conservée pour ne rien casser dans les écrans existants.
 */

/** Retire les classes de dimension (size-4…) inadaptées à un émoji texte. */
function withoutSize(className: string): string {
  return className
    .split(/\s+/)
    .filter((token) => token && !/^(size|h|w)-/.test(token))
    .join(" ");
}

export function ActivityIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={`inline-block leading-none ${withoutSize(className)}`}>
      {activityEmoji(name)}
    </span>
  );
}

/** Pastille homogène contenant l'émoji, utilisée dans les listes d'activités. */
export function ActivityIconBadge({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xl ${className}`}
    >
      <ActivityIcon name={name} />
    </span>
  );
}
