import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Medal,
  Music,
  Mountain,
  Target,
  Waves,
  type LucideIcon,
} from "lucide-react";

/** Icône vectorielle déduite du nom de l'activité renseigné par l'enseignant. */
const ICONS: { match: string; icon: LucideIcon }[] = [
  { match: "natation", icon: Waves },
  { match: "nage", icon: Waves },
  { match: "basket", icon: Target },
  { match: "hand", icon: Target },
  { match: "foot", icon: Footprints },
  { match: "volley", icon: Target },
  { match: "badminton", icon: Activity },
  { match: "tennis", icon: Activity },
  { match: "course", icon: Footprints },
  { match: "athl", icon: Footprints },
  { match: "gym", icon: Activity },
  { match: "danse", icon: Music },
  { match: "escalade", icon: Mountain },
  { match: "muscu", icon: Dumbbell },
  { match: "vélo", icon: Bike },
  { match: "velo", icon: Bike },
  { match: "rugby", icon: Medal },
];

export function activityIcon(name: string): LucideIcon {
  const normalized = (name ?? "").toLowerCase();
  return ICONS.find((entry) => normalized.includes(entry.match))?.icon ?? Medal;
}

export function ActivityIcon({
  name,
  className = "size-5",
}: {
  name: string;
  className?: string;
}) {
  const Icon = activityIcon(name);
  return <Icon aria-hidden className={className} />;
}

/** Pastille d'icône homogène, utilisée dans les listes d'activités. */
export function ActivityIconBadge({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary ${className}`}
    >
      <ActivityIcon name={name} />
    </span>
  );
}
