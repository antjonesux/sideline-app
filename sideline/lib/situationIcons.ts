import {
  User,
  Zap,
  Flame,
  Rocket,
  Swords,
  Target,
  Eye,
  Crosshair,
  FastForward,
  Wind,
  Timer,
  Shield,
  Lock,
  Trophy,
  Flag,
  TrendingUp,
  ArrowUpRight,
  Star,
  type LucideIcon,
} from "lucide-react";

export const SITUATION_ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  User,
  Flame,
  Rocket,
  Swords,
  Target,
  Eye,
  Crosshair,
  FastForward,
  Wind,
  Timer,
  Shield,
  Lock,
  Trophy,
  Flag,
  TrendingUp,
  ArrowUpRight,
  Star,
};

/** Returns the Lucide component or null (caller handles first-letter fallback). */
export function getSituationIcon(iconName: string | null | undefined): LucideIcon | null {
  if (!iconName) return null;
  return SITUATION_ICON_MAP[iconName] ?? null;
}
