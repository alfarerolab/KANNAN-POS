"use client";

import { useMemo } from "react";
import Particles from "@tsparticles/react";
import { useTheme } from "@/hooks/use-theme";

interface ParticleBackgroundProps {
  className?: string;
  zIndex?: number;
}

export function ParticleBackground({ className = "", zIndex = -1 }: ParticleBackgroundProps) {
  const { particulas, isDark, coloresActuales } = useTheme();

  // Configuraciones de partículas por tipo
  const configuracionParticulas = useMemo(() => {
    if (!particulas?.enabled) return null;

    const baseColor = isDark ? "#ffffff" : "#000000";
    const accentColors = isDark
      ? ["#60a5fa", "#c084fc", "#34d399", "#f59e0b", "#ef4444"]
      : ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

    const configuraciones = {
      stars: {
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: particulas.interactivo,
              mode: "push",
            },
            onHover: {
              enable: particulas.interactivo,
              mode: "repulse",
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            repulse: {
              distance: 200,
              duration: 0.4,
            },
          },
        },
        particles: {
          color: {
            value: baseColor,
          },
          links: {
            enable: false,
          },
          move: {
            direction: "none" as const,
            enable: true,
            outModes: {
              default: "bounce" as const,
            },
            random: true,
            speed: particulas.velocidad,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              value_area: 800,
            },
            value: particulas.densidad,
          },
          opacity: {
            value: isDark ? 0.7 : 0.4,
            random: true,
            animation: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
            },
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
            random: true,
          },
          twinkle: {
            particles: {
              enable: true,
              frequency: 0.05,
              opacity: 1,
            },
          },
        },
        detectRetina: true,
      },

      floating: {
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: particulas.interactivo,
              mode: "bubble",
            },
            onHover: {
              enable: particulas.interactivo,
              mode: "grab",
            },
          },
          modes: {
            bubble: {
              distance: 400,
              duration: 2,
              opacity: 0.8,
              size: 40,
            },
            grab: {
              distance: 400,
              line_linked: {
                opacity: 1,
              },
            },
          },
        },
        particles: {
          color: {
            value: accentColors,
          },
          links: {
            color: baseColor,
            distance: 150,
            enable: true,
            opacity: isDark ? 0.2 : 0.1,
            width: 1,
          },
          move: {
            direction: "none" as const,
            enable: true,
            outModes: {
              default: "bounce" as const,
            },
            random: false,
            speed: particulas.velocidad,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              value_area: 800,
            },
            value: particulas.densidad,
          },
          opacity: {
            value: isDark ? 0.5 : 0.3,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 5 },
          },
        },
        detectRetina: true,
      },

      geometric: {
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 120,
        interactivity: {
          events: {
            onClick: {
              enable: particulas.interactivo,
              mode: "push",
            },
            onHover: {
              enable: particulas.interactivo,
              mode: "slow",
            },
          },
          modes: {
            push: {
              quantity: 4,
            },
            slow: {
              factor: 3,
              radius: 200,
            },
          },
        },
        particles: {
          color: {
            value: accentColors,
          },
          links: {
            enable: false,
          },
          move: {
            direction: "none" as const,
            enable: true,
            outModes: {
              default: "out" as const,
            },
            random: true,
            speed: particulas.velocidad,
            straight: false,
          },
          number: {
            density: {
              enable: true,
              value_area: 800,
            },
            value: particulas.densidad,
          },
          opacity: {
            value: isDark ? 0.4 : 0.2,
            random: true,
            animation: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
            },
          },
          shape: {
            type: ["triangle", "square", "polygon"],
            options: {
              polygon: {
                nb_sides: 6,
              },
            },
          },
          size: {
            value: { min: 2, max: 8 },
            random: true,
          },
          rotate: {
            value: 0,
            random: true,
            direction: "clockwise" as const,
            animation: {
              enable: true,
              speed: 5,
            },
          },
        },
        detectRetina: true,
      },

      minimal: {
        background: {
          color: {
            value: "transparent",
          },
        },
        fpsLimit: 60,
        interactivity: {
          events: {
            onClick: {
              enable: false,
            },
            onHover: {
              enable: false,
            },
          },
        },
        particles: {
          color: {
            value: baseColor,
          },
          links: {
            enable: false,
          },
          move: {
            direction: "top" as const,
            enable: true,
            outModes: {
              default: "out" as const,
            },
            random: false,
            speed: particulas.velocidad,
            straight: true,
          },
          number: {
            density: {
              enable: true,
              value_area: 800,
            },
            value: particulas.densidad,
          },
          opacity: {
            value: isDark ? 0.2 : 0.1,
          },
          shape: {
            type: "circle",
          },
          size: {
            value: 1,
          },
        },
        detectRetina: true,
      },
    };

    return configuraciones[particulas.tipo] || configuraciones.minimal;
  }, [particulas, isDark]);

  // No renderizar si las partículas están deshabilitadas
  if (!particulas?.enabled || !configuracionParticulas) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex }}>
      <Particles
        id="tsparticles"
        options={configuracionParticulas}
        className="w-full h-full"
      />
    </div>
  );
}