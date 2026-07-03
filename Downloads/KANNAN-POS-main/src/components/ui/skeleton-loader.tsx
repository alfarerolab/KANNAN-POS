"use client";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "pulse" | "wave" | "shimmer";
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className,
  variant = "shimmer",
  rounded = "md",
  ...props
}: SkeletonProps) {
  const { coloresActuales, isDark } = useTheme();

  const roundedClasses = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full"
  };

  const baseClasses = `
    ${isDark ? 'bg-muted' : 'bg-muted'}
    ${roundedClasses[rounded]}
  `;

  const variantClasses = {
    default: "animate-pulse",
    pulse: "animate-pulse",
    wave: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
    shimmer: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent"
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  );
}

// Componentes específicos de skeleton
export function SkeletonCard({ className }: { className?: string }) {
  const { coloresActuales } = useTheme();

  return (
    <div className={cn(`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg p-6 space-y-4`, className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12" rounded="full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  const { coloresActuales } = useTheme();

  return (
    <div className={`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-border dark:border-border">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonProductCard() {
  const { coloresActuales } = useTheme();

  return (
    <div className={`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg overflow-hidden`}>
      <Skeleton className="h-48 w-full" rounded="none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  const { coloresActuales } = useTheme();

  return (
    <div className={`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10" rounded="full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = "h-64" }: { height?: string }) {
  const { coloresActuales } = useTheme();

  return (
    <div className={`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg p-6`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className={`w-full ${height}`} />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  return <Skeleton className={sizeClasses[size]} rounded="full" />;
}

export function SkeletonButton({ width = "w-20" }: { width?: string }) {
  return <Skeleton className={`h-9 ${width}`} />;
}

export function SkeletonText({
  lines = 1,
  width = "w-full"
}: {
  lines?: number;
  width?: string | string[]
}) {
  if (lines === 1) {
    return <Skeleton className={`h-4 ${typeof width === 'string' ? width : width[0]}`} />;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => {
        const lineWidth = Array.isArray(width) ? (width[i] || "w-full") : "w-full";
        return <Skeleton key={i} className={`h-4 ${lineWidth}`} />;
      })}
    </div>
  );
}

// Skeleton para formularios
export function SkeletonForm() {
  const { coloresActuales } = useTheme();

  return (
    <div className={`${coloresActuales.surface} ${coloresActuales.border} border rounded-lg p-6 space-y-6`}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

// Agregar las animaciones al CSS global
export const skeletonAnimations = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
