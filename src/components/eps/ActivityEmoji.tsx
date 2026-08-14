import { activityEmoji } from "@/lib/activity-emoji";

/** Emoji d'activité, taille lisible et cohérente dans tout l'espace élève. */
export function ActivityEmoji({
  name,
  className = "text-xl",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={`leading-none ${className}`}>
      {activityEmoji(name)}
    </span>
  );
}

/** Pastille arrondie contenant l'emoji de l'activité. */
export function ActivityEmojiBadge({
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
      <ActivityEmoji name={name} />
    </span>
  );
}
