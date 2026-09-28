import {
  Circle,
  Flame,
  RefreshCw,
  Rocket,
  Shield,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type PowerIconOption = {
  value: string;
  label: string;
  Icon: LucideIcon;
  color: string;
  fill?: boolean;
};

export const POWER_ICON_OPTIONS: PowerIconOption[] = [
  { value: "🟢", label: "Bonus", Icon: Circle, color: "text-primary", fill: true },
  { value: "🔄", label: "Relance", Icon: RefreshCw, color: "text-chart-2" },
  { value: "🛡️", label: "Protection", Icon: Shield, color: "text-chart-2", fill: true },
  { value: "⏱️", label: "Temps", Icon: Timer, color: "text-chart-4" },
  { value: "🎯", label: "Précision", Icon: Target, color: "text-chart-5" },
  { value: "🔥", label: "Énergie", Icon: Flame, color: "text-chart-3", fill: true },
  { value: "🚀", label: "Accélération", Icon: Rocket, color: "text-chart-4", fill: true },
  { value: "👥", label: "Équipe", Icon: Users, color: "text-chart-4", fill: true },
];

export function PowerIcon({
  value,
  size = "md",
  className,
}: {
  value: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const option = POWER_ICON_OPTIONS.find((item) => item.value === value);
  const dimensions = size === "sm" ? "size-7" : size === "lg" ? "size-12" : "size-9";
  const iconSize = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4.5";

  if (!option) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-base",
          dimensions,
          className,
        )}
      >
        {value || "⚡"}
      </span>
    );
  }

  const { Icon } = option;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-current/25 bg-surface-2 shadow-sm",
        dimensions,
        option.color,
        className,
      )}
    >
      <Icon className={iconSize} strokeWidth={2.35} fill={option.fill ? "currentColor" : "none"} />
    </span>
  );
}

export function powerIconLabel(value: string | null) {
  return POWER_ICON_OPTIONS.find((item) => item.value === value)?.label ?? "Icône du pouvoir";
}