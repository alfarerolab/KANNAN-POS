"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles
} from "lucide-react";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  type: "success" | "error" | "warning" | "info";
  duration: number; // Removido el opcional para evitar undefined
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = "top-right",
  maxToasts = 5
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, "id" | "duration"> & { duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 5000; // Asegurar que siempre tenga un valor
    
    const newToast: Toast = {
      ...toast,
      id,
      duration
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  const getPositionClasses = () => {
    const positions = {
      "top-right": "top-4 right-4",
      "top-left": "top-4 left-4",
      "bottom-right": "bottom-4 right-4",
      "bottom-left": "bottom-4 left-4",
      "top-center": "top-4 left-1/2 transform -translate-x-1/2",
      "bottom-center": "bottom-4 left-1/2 transform -translate-x-1/2"
    };
    return positions[position];
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      {typeof window !== "undefined" && createPortal(
        <div className={`fixed z-[100] ${getPositionClasses()} pointer-events-none`}>
          <div className="space-y-3 w-96 max-w-[calc(100vw-2rem)]">
            {toasts.map((toast, index) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRemove={() => removeToast(toast.id)}
                index={index}
                position={position}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
  index: number;
  position: string;
}

function ToastItem({ toast, onRemove, index, position }: ToastItemProps) {
  const { coloresActuales, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(onRemove, 300);
  };

  const getTypeConfig = () => {
    const configs = {
      success: {
        icon: CheckCircle2,
        gradient: "from-green-500 to-emerald-500",
        bg: isDark ? "bg-green-900/90" : "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: isDark ? "text-green-100" : "text-green-800 dark:text-green-300",
        iconColor: "text-green-500"
      },
      error: {
        icon: AlertCircle,
        gradient: "from-red-500 to-pink-500",
        bg: isDark ? "bg-red-900/90" : "bg-destructive/10",
        border: "border-destructive/30",
        text: isDark ? "text-red-100" : "text-red-800 dark:text-red-300",
        iconColor: "text-red-500"
      },
      warning: {
        icon: AlertTriangle,
        gradient: "from-yellow-500 to-orange-500",
        bg: isDark ? "bg-yellow-900/90" : "bg-amber-500/10",
        border: "border-amber-500/30",
        text: isDark ? "text-yellow-100" : "text-yellow-800",
        iconColor: "text-yellow-500"
      },
      info: {
        icon: Info,
        gradient: "from-blue-500 to-cyan-500",
        bg: isDark ? "bg-blue-900/90" : "bg-blue-500/10",
        border: "border-blue-500/30",
        text: isDark ? "text-blue-100" : "text-blue-800 dark:text-blue-300",
        iconColor: "text-blue-500"
      }
    };
    return configs[toast.type];
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  const animationDelay = index * 100;
  const slideDirection = position.includes("right") ? "translate-x-full" :
                       position.includes("left") ? "-translate-x-full" :
                       "translate-y-[-100%]";

  return (
    <div
      className={cn(
        "pointer-events-auto relative transform transition-all duration-300 ease-out",
        isVisible && !isLeaving ? "translate-x-0 translate-y-0 opacity-100 scale-100" :
        isLeaving ? `${slideDirection} opacity-0 scale-95` :
        `${slideDirection} opacity-0 scale-95`
      )}
      style={{
        animationDelay: isVisible ? `${animationDelay}ms` : "0ms",
        zIndex: 1000 - index
      }}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-20 blur-xl rounded-xl`} />

      {/* Main toast */}
      <div className={cn(
        "relative backdrop-blur-xl border shadow-2xl rounded-xl p-4 min-h-[80px]",
        config.bg,
        config.border,
        coloresActuales.surface
      )}>
        {/* Progress bar */}
        {toast.duration > 0 && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted dark:bg-muted rounded-t-xl overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${config.gradient} rounded-t-xl`}
              style={{
                animation: `progress ${toast.duration}ms linear forwards`
              }}
            />
          </div>
        )}

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg bg-gradient-to-r ${config.gradient} shadow-lg`}>
            <IconComponent className="h-5 w-5 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <h3 className={`font-semibold text-sm ${config.text} mb-1`}>
                {toast.title}
              </h3>
            )}
            <p className={`text-sm ${config.text} opacity-90 leading-relaxed`}>
              {toast.description}
            </p>

            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className={`mt-2 text-xs font-medium bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleRemove}
            className={`p-1 rounded-md hover:bg-card/10 transition-colors ${config.text} opacity-70 hover:opacity-100`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-2 right-2 opacity-10">
          <Sparkles className="h-4 w-4 text-current animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Helper functions
export const toast = {
  success: (description: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("toast", {
        detail: { type: "success", description, ...options }
      });
      window.dispatchEvent(event);
    }
  },
  error: (description: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("toast", {
        detail: { type: "error", description, ...options }
      });
      window.dispatchEvent(event);
    }
  },
  warning: (description: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("toast", {
        detail: { type: "warning", description, ...options }
      });
      window.dispatchEvent(event);
    }
  },
  info: (description: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    if (typeof window !== "undefined") {
      const event = new CustomEvent("toast", {
        detail: { type: "info", description, ...options }
      });
      window.dispatchEvent(event);
    }
  }
};

// CSS para la animación de progreso
export const toastAnimations = `
  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;