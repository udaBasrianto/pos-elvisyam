import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ColoredCardProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    icon?: LucideIcon;
    iconColor?: "green" | "blue" | "purple" | "orange" | "emerald" | "red" | "yellow" | "amber" | "pink" | "primary";
    children?: React.ReactNode;
}

const cardBgColors = {
    green: "bg-green-50 dark:bg-green-950/20",
    blue: "bg-blue-50 dark:bg-blue-950/20",
    purple: "bg-purple-50 dark:bg-purple-950/20",
    orange: "bg-orange-50 dark:bg-orange-950/20",
    emerald: "bg-emerald-50 dark:bg-emerald-950/20",
    red: "bg-red-50 dark:bg-red-950/20",
    yellow: "bg-yellow-50 dark:bg-yellow-950/20",
    amber: "bg-amber-50 dark:bg-amber-950/20",
    pink: "bg-pink-50 dark:bg-pink-950/20",
    primary: "bg-primary/5 dark:bg-primary/10",
};

const iconWatermarkColors = {
    green: "text-green-500/10",
    blue: "text-blue-500/10",
    purple: "text-purple-500/10",
    orange: "text-orange-500/10",
    emerald: "text-emerald-500/10",
    red: "text-red-500/10",
    yellow: "text-yellow-500/10",
    amber: "text-amber-500/10",
    pink: "text-pink-500/10",
    primary: "text-primary/10",
};

const iconBadgeColors = {
    green: "bg-green-500 text-white",
    blue: "bg-blue-500 text-white",
    purple: "bg-purple-500 text-white",
    orange: "bg-orange-500 text-white",
    emerald: "bg-emerald-500 text-white",
    red: "bg-red-500 text-white",
    yellow: "bg-yellow-500 text-white",
    amber: "bg-amber-500 text-white",
    pink: "bg-pink-500 text-white",
    primary: "bg-primary text-primary-foreground",
};

const ColoredCard = forwardRef<HTMLDivElement, ColoredCardProps>(
    ({ className, title, icon: Icon, iconColor = "primary", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-2xl p-3.5 sm:p-5",
                    cardBgColors[iconColor],
                    "shadow-sm border border-gray-100/50 dark:border-border/30",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:shadow-primary/5",
                    "group",
                    className
                )}
                {...props}
            >
                {/* Large Watermark Icon - Right */}
                {Icon && (
                    <div className="absolute top-1/2 -translate-y-1/2 -right-2 sm:-right-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                        <Icon className={cn("h-24 w-24 sm:h-32 sm:w-32", iconWatermarkColors[iconColor])} strokeWidth={1} />
                    </div>
                )}

                {/* Header */}
                {(title || Icon) && (
                    <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4 relative z-10">
                        {Icon && (
                            <div className={cn(
                                "flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center",
                                "shadow-md transition-all duration-300 group-hover:scale-105",
                                iconBadgeColors[iconColor]
                            )}>
                                <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2} />
                            </div>
                        )}
                        {title && (
                            <h3 className="text-sm sm:text-lg font-semibold text-foreground">{title}</h3>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="relative z-10">
                    {children}
                </div>
            </div>
        );
    }
);
ColoredCard.displayName = "ColoredCard";

// Simple metric card variant
interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    iconColor?: "green" | "blue" | "purple" | "orange" | "emerald" | "red" | "yellow" | "amber" | "pink" | "primary";
    subtitle?: string;
}

const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
    ({ className, title, value, icon: Icon, iconColor = "blue", subtitle, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "relative overflow-hidden rounded-2xl p-3.5 sm:p-5",
                    cardBgColors[iconColor],
                    "shadow-sm border border-gray-100/50 dark:border-border/30",
                    "transition-all duration-300 ease-out",
                    "hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01]",
                    "group",
                    className
                )}
                {...props}
            >
                {/* Large Watermark Icon - Right */}
                {Icon && (
                    <div className="absolute top-1/2 -translate-y-1/2 -right-2 sm:-right-4 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                        <Icon className={cn("h-20 w-20 sm:h-24 sm:w-24", iconWatermarkColors[iconColor])} strokeWidth={1} />
                    </div>
                )}

                {/* Content */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between relative z-10 gap-2 w-full">
                    {Icon && (
                        <div className={cn(
                            "w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 order-first sm:order-last",
                            "shadow-md transition-all duration-300 group-hover:scale-105",
                            iconBadgeColors[iconColor]
                        )}>
                            <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6" strokeWidth={2} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 w-full">
                        <p className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate block">{title}</p>
                        <p className="text-base sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 truncate block">{value}</p>
                        {subtitle && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate block">{subtitle}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);
MetricCard.displayName = "MetricCard";

export { ColoredCard, MetricCard, cardBgColors, iconWatermarkColors, iconBadgeColors };
