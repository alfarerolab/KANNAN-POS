"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "accent" | "success" | "warning" | "error";
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

/* SLATE PROFESSIONAL — colores sólidos, SIN gradientes */
const variantStyles = {
  default: {
    iconBg: "bg-[#020617] dark:bg-[#f8fafc]",
    iconText: "text-[#f8fafc] dark:text-[#020617]",
    bg: "bg-slate-50/80 dark:bg-slate-800/30",
    text: "text-slate-700 dark:text-slate-300",
    accent: "#020617"
  },
  accent: {
    iconBg: "bg-[#0f172a] dark:bg-[#f8fafc]",
    iconText: "text-[#f8fafc] dark:text-[#0f172a]",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    text: "text-slate-600 dark:text-slate-400",
    accent: "#0f172a"
  },
  success: {
    iconBg: "bg-[#10b981]",
    iconText: "text-white",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    accent: "#10b981"
  },
  warning: {
    iconBg: "bg-[#f59e0b]",
    iconText: "text-white",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    accent: "#f59e0b"
  },
  error: {
    iconBg: "bg-[#e11d48]",
    iconText: "text-white",
    bg: "bg-rose-50/80 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    accent: "#e11d48"
  }
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  loading = false,
  className,
  onClick
}: MetricCardProps) {
  const { coloresActuales, isDark } = useTheme();
  const variantStyle = variantStyles[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-green-600 dark:text-green-400 dark:text-green-400";
    if (trend.value < 0) return "text-red-600 dark:text-red-400 dark:text-red-400";
    return "text-muted-foreground";
  };

  const TrendIcon = getTrendIcon();

  if (loading) {
    return (
      <Card className={cn(
        "transition-all duration-300 hover:shadow-lg group relative overflow-hidden",
        variantStyle.bg,
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-20" />
              <div className="h-6 bg-muted rounded animate-pulse w-16" />
            </div>
            <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="h-3 bg-muted rounded animate-pulse w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md group relative overflow-hidden cursor-pointer animate-fade-in-up",
        "border-border",
        "bg-card",
        onClick && "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      {/* Acento de color sólido — borde izquierdo */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: variantStyle.accent }}
      />

      <CardHeader className="pb-3 relative pl-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground leading-tight">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground leading-none">
                {value}
              </p>
              {trend && TrendIcon && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getTrendColor()
                )}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{Math.abs(trend.value)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Icono con color sólido, sin gradiente */}
          <div className={cn(
            "p-3 rounded-xl transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
            variantStyle.iconBg,
            variantStyle.iconText
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      {(subtitle || trend) && (
        <CardContent className="pt-0 pb-4 relative pl-5">
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-xs text-muted-foreground leading-tight">
                {subtitle}
              </p>
            )}
            {trend && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium border-border/50",
                  "bg-muted/50",
                  getTrendColor()
                )}
              >
                {trend.label}
              </Badge>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
