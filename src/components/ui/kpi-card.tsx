import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string | number;
  badgeColor?: "green" | "blue" | "purple" | "orange" | "emerald" | "red" | "yellow";
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
}

const colorThemes = {
  green: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
    accent: "bg-emerald-500",
    cardHover: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20",
    accent: "bg-emerald-500",
    cardHover: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
  },
  blue: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/25",
    iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20",
    accent: "bg-blue-600",
    cardHover: "hover:border-blue-500/40 hover:shadow-blue-500/5",
  },
  purple: {
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/25",
    iconBg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20",
    accent: "bg-purple-600",
    cardHover: "hover:border-purple-500/40 hover:shadow-purple-500/5",
  },
  orange: {
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25",
    iconBg: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20",
    accent: "bg-orange-500",
    cardHover: "hover:border-orange-500/40 hover:shadow-orange-500/5",
  },
  red: {
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
    iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20",
    accent: "bg-rose-500",
    cardHover: "hover:border-rose-500/40 hover:shadow-rose-500/5",
  },
  yellow: {
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20",
    accent: "bg-amber-500",
    cardHover: "hover:border-amber-500/40 hover:shadow-amber-500/5",
  },
};

const KpiCard = forwardRef<HTMLDivElement, KpiCardProps>(
  ({ className, title, value, subtitle, badge, badgeColor = "blue", icon: Icon, trend, ...props }, ref) => {
    const theme = colorThemes[badgeColor] || colorThemes.blue;

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 sm:p-5",
          "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md",
          "border border-slate-200/80 dark:border-slate-800",
          "shadow-xs hover:shadow-lg transition-all duration-300",
          "active:scale-[0.99] group",
          theme.cardHover,
          className
        )}
        {...props}
      >
        {/* Subtle Top Ambient Gradient Line */}
        <div className={cn("absolute top-0 inset-x-0 h-1 opacity-80", theme.accent)} />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              {title}
            </span>
            {badge !== undefined && (
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0 border", theme.badge)}>
                {badge}
              </span>
            )}
            {Icon && !badge && (
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-110", theme.iconBg)}>
                <Icon className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">
            {value}
          </div>

          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 pt-0.5 text-xs text-muted-foreground flex-wrap">
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                  trend.isPositive !== false && trend.value >= 0 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                )}>
                  {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}% {trend.label || ""}
                </span>
              )}
              {subtitle && <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }
);
KpiCard.displayName = "KpiCard";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: "green" | "blue" | "purple" | "orange" | "emerald" | "red" | "yellow";
  trend?: {
    value: number;
    label?: string;
  };
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, title, value, subtitle, icon: Icon, iconColor = "blue", trend, ...props }, ref) => {
    const theme = colorThemes[iconColor] || colorThemes.blue;

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl p-3.5 sm:p-5",
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md",
          "border border-slate-200/80 dark:border-slate-800",
          "shadow-xs hover:shadow-md transition-all duration-300",
          "active:scale-[0.99] group",
          theme.cardHover,
          className
        )}
        {...props}
      >
        {/* Subtle Top Glow Accent */}
        <div className={cn("absolute top-0 inset-x-0 h-0.5 opacity-60", theme.accent)} />

        <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-tight">
            {title}
          </span>
          {Icon && (
            <div className={cn(
              "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-110",
              theme.iconBg
            )}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          )}
        </div>

        <div className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono truncate">
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] sm:text-xs flex-wrap">
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border shrink-0",
                trend.value >= 0 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="truncate text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);
StatCard.displayName = "StatCard";

export { KpiCard, StatCard };
