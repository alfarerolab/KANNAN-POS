"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTheme, type ModoOscuro } from "@/hooks/use-theme";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
  variant?: "button" | "compact" | "dropdown";
  size?: "sm" | "lg" | "default";
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = "dropdown",
  size = "default",
  showLabel = false
}: ThemeToggleProps) {
  const { modoOscuro, isDark, cambiarModoOscuro, coloresActuales } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`
        ${size === 'sm' ? 'h-8 w-8' : size === 'default' ? 'h-9 w-9' : 'h-10 w-10'}
        rounded-lg bg-muted animate-pulse
      `} />
    );
  }

  const getModoInfo = (modo: ModoOscuro) => {
    const modos = {
      light: {
        icon: Sun,
        label: "Claro",
        description: "Tema claro",
        gradient: "from-yellow-400 to-orange-500"
      },
      dark: {
        icon: Moon,
        label: "Oscuro",
        description: "Tema oscuro",
        gradient: "from-slate-700 to-slate-900"
      },
      system: {
        icon: Monitor,
        label: "Sistema",
        description: "Automático",
        gradient: "from-blue-500 to-purple-600"
      }
    };
    return modos[modo];
  };

  const ciclarModo = () => {
    const modos: ModoOscuro[] = ['light', 'dark', 'system'];
    const currentIndex = modos.indexOf(modoOscuro);
    const nextIndex = (currentIndex + 1) % modos.length;
    cambiarModoOscuro(modos[nextIndex]);
  };

  const modoActual = getModoInfo(modoOscuro);
  const IconComponent = modoActual.icon;

  if (variant === "button") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={ciclarModo}
        className={`
          ${coloresActuales.surface} ${coloresActuales.border}
          hover:scale-105 active:scale-95 transition-all duration-300
          group relative overflow-hidden
        `}
      >
        <div className={`
          absolute inset-0 bg-gradient-to-r ${modoActual.gradient}
          opacity-0 group-hover:opacity-10 transition-opacity duration-300
        `} />
        <IconComponent className={`
          ${size === 'sm' ? 'h-3 w-3' : size === 'default' ? 'h-4 w-4' : 'h-5 w-5'}
          ${coloresActuales.text} transition-all duration-300 group-hover:scale-110
        `} />
        {showLabel && (
          <span className={`ml-2 ${coloresActuales.text} font-medium`}>
            {modoActual.label}
          </span>
        )}
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <button
        onClick={ciclarModo}
        className={`
          p-2 rounded-xl ${coloresActuales.surface} ${coloresActuales.border}
          hover:scale-105 active:scale-95 transition-all duration-300
          group relative overflow-hidden
          ${size === 'sm' ? 'p-1.5' : size === 'lg' ? 'p-3' : 'p-2'}
        `}
        title={`Cambiar a ${modoActual.label}`}
      >
        <div className={`
          absolute inset-0 bg-gradient-to-r ${modoActual.gradient}
          opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl
        `} />
        <IconComponent className={`
          ${size === 'sm' ? 'h-3 w-3' : size === 'default' ? 'h-4 w-4' : 'h-5 w-5'}
          ${coloresActuales.text} transition-all duration-300 group-hover:scale-110
          relative z-10
        `} />
      </button>
    );
  }

  // Dropdown por defecto
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`
            ${coloresActuales.surface} ${coloresActuales.border}
            hover:scale-105 active:scale-95 transition-all duration-300
            group relative overflow-hidden
          `}
        >
          <div className={`
            absolute inset-0 bg-gradient-to-r ${modoActual.gradient}
            opacity-0 group-hover:opacity-10 transition-opacity duration-300
          `} />
          <IconComponent className={`
            ${size === 'sm' ? 'h-3 w-3' : size === 'default' ? 'h-4 w-4' : 'h-5 w-5'}
            ${coloresActuales.text} transition-all duration-300 group-hover:scale-110
          `} />
          {showLabel && (
            <span className={`ml-2 ${coloresActuales.text} font-medium`}>
              {modoActual.label}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`
          ${coloresActuales.surface} ${coloresActuales.border} backdrop-blur-xl
          w-56 p-2
        `}
      >
        <DropdownMenuLabel className={`${coloresActuales.text} flex items-center gap-2`}>
          <Palette className="h-4 w-4" />
          Apariencia
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={coloresActuales.border} />

        {(['light', 'dark', 'system'] as ModoOscuro[]).map((modo) => {
          const info = getModoInfo(modo);
          const IconComponent = info.icon;
          const isSelected = modoOscuro === modo;

          return (
            <DropdownMenuItem
              key={modo}
              onClick={() => cambiarModoOscuro(modo)}
              className={`
                cursor-pointer rounded-lg transition-all duration-300
                ${isSelected
                  ? `bg-gradient-to-r ${info.gradient} text-primary-foreground hover:bg-primary/90`
                  : `hover:bg-card/10 ${coloresActuales.text}`
                }
              `}
            >
              <div className="flex items-center gap-3 w-full">
                <IconComponent className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{info.label}</div>
                  <div className={`text-xs ${isSelected ? 'text-primary-foreground/80' : coloresActuales.textSecondary}`}>
                    {info.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 bg-card dark:bg-background rounded-full animate-pulse" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}