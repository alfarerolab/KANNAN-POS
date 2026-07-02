"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme, TEMAS_PREDEFINIDOS, type ModoOscuro } from "@/hooks/use-theme";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Sparkles,
  Eye,
  Settings2,
  CheckCircle2,
  Circle
} from "lucide-react";

export function ThemeSelector() {
  const {
    temaActual,
    modoOscuro,
    isDark,
    cambiarTema,
    cambiarModoOscuro,
    coloresActuales,
    particulas
  } = useTheme();

  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);

  const getModoInfo = (modo: ModoOscuro) => {
    const modos = {
      light: { icon: Sun, label: "Claro", description: "Tema claro siempre" },
      dark: { icon: Moon, label: "Oscuro", description: "Tema oscuro siempre" },
      system: { icon: Monitor, label: "Sistema", description: "Sigue preferencias del sistema" }
    };
    return modos[modo];
  };

  const getParticleInfo = (tipo: string) => {
    const tipos = {
      stars: { emoji: "⭐", name: "Estrellas", description: "Partículas brillantes tipo estrellas" },
      floating: { emoji: "🔵", name: "Flotantes", description: "Partículas conectadas flotando" },
      geometric: { emoji: "🔷", name: "Geométricas", description: "Formas geométricas rotando" },
      minimal: { emoji: "⚪", name: "Minimalista", description: "Partículas simples y sutiles" }
    };
    return tipos[tipo as keyof typeof tipos] || tipos.minimal;
  };

  return (
    <div className="space-y-6">
      {/* Selector de Modo Oscuro */}
      <Card className={`${coloresActuales.surface} ${coloresActuales.border} transition-all duration-300`}>
        <CardHeader>
          <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${coloresActuales.primary}`}>
              <Palette className="h-4 w-4 text-primary-foreground" />
            </div>
            Modo de Apariencia
          </CardTitle>
          <CardDescription className={coloresActuales.textSecondary}>
            Elige cómo quieres que se vea la interfaz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as ModoOscuro[]).map((modo) => {
              const modoInfo = getModoInfo(modo);
              const IconComponent = modoInfo.icon;
              const isSelected = modoOscuro === modo;

              return (
                <button
                  key={modo}
                  onClick={() => cambiarModoOscuro(modo)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105
                    ${isSelected
                      ? `border-blue-500 bg-gradient-to-r ${coloresActuales.primary} text-primary-foreground shadow-lg`
                      : `${coloresActuales.border} hover:border-blue-500/40 bg-card/50`
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <IconComponent className={`h-6 w-6 ${isSelected ? 'text-primary-foreground' : coloresActuales.text}`} />
                    <span className={`font-medium text-sm ${isSelected ? 'text-primary-foreground' : coloresActuales.text}`}>
                      {modoInfo.label}
                    </span>
                    <span className={`text-xs text-center ${isSelected ? 'text-primary-foreground/80' : coloresActuales.textSecondary}`}>
                      {modoInfo.description}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <div className="p-1 rounded-full bg-green-500 text-primary-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selector de Temas */}
      <Card className={`${coloresActuales.surface} ${coloresActuales.border} transition-all duration-300`}>
        <CardHeader>
          <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${coloresActuales.secondary}`}>
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            Temas de Color
          </CardTitle>
          <CardDescription className={coloresActuales.textSecondary}>
            Personaliza la paleta de colores de tu sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TEMAS_PREDEFINIDOS.map((tema) => {
              const isSelected = temaActual.id === tema.id;
              const colores = isDark ? tema.colores.dark : tema.colores.light;

              return (
                <div
                  key={tema.id}
                  className={`
                    relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                    hover:scale-105 hover:shadow-xl group
                    ${isSelected
                      ? 'border-blue-500 shadow-lg'
                      : `${coloresActuales.border} hover:border-blue-500/40`
                    }
                  `}
                  onClick={() => cambiarTema(tema.id)}
                  onMouseEnter={() => setHoveredTheme(tema.id)}
                  onMouseLeave={() => setHoveredTheme(null)}
                >
                  {/* Preview de colores */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex gap-1">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colores.primary} shadow-lg`} />
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colores.secondary} shadow-lg`} />
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${colores.accent} shadow-lg`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${coloresActuales.text}`}>{tema.nombre}</h3>
                      <p className={`text-xs ${coloresActuales.textSecondary}`}>
                        {tema.particulas?.enabled ? 'Con partículas' : 'Sin partículas'}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>

                  {/* Preview del fondo */}
                  <div className={`h-16 rounded-lg bg-gradient-to-r ${colores.gradiente} relative overflow-hidden`}>
                    <div className={`absolute inset-2 rounded bg-gradient-to-r ${colores.surface.replace('backdrop-blur-xl', '')} opacity-80`} />

                    {/* Indicador de partículas */}
                    {tema.particulas?.enabled && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs bg-card dark:bg-background/20 text-primary-foreground/80 border-white/30">
                          {getParticleInfo(tema.particulas.tipo).emoji} {getParticleInfo(tema.particulas.tipo).name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Efectos hover */}
                  {hoveredTheme === tema.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Partículas */}
      {particulas?.enabled && (
        <Card className={`${coloresActuales.surface} ${coloresActuales.border} transition-all duration-300`}>
          <CardHeader>
            <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
              <div className={`p-2 rounded-lg bg-gradient-to-r ${coloresActuales.accent}`}>
                <Settings2 className="h-4 w-4 text-primary-foreground" />
              </div>
              Configuración de Partículas
            </CardTitle>
            <CardDescription className={coloresActuales.textSecondary}>
              Tu tema actual incluye efectos de partículas animadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getParticleInfo(particulas.tipo).emoji}</span>
                  <div>
                    <p className={`font-medium ${coloresActuales.text}`}>
                      {getParticleInfo(particulas.tipo).name}
                    </p>
                    <p className={`text-sm ${coloresActuales.textSecondary}`}>
                      {getParticleInfo(particulas.tipo).description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`${coloresActuales.border} font-medium`}>
                  Activo
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className={coloresActuales.textSecondary}>Densidad:</span>
                  <span className={coloresActuales.text}>{particulas.densidad} partículas</span>
                </div>
                <div className="flex justify-between">
                  <span className={coloresActuales.textSecondary}>Velocidad:</span>
                  <span className={coloresActuales.text}>{particulas.velocidad}x</span>
                </div>
                <div className="flex justify-between">
                  <span className={coloresActuales.textSecondary}>Interactivo:</span>
                  <span className={coloresActuales.text}>{particulas.interactivo ? '✓ Sí' : '✗ No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={coloresActuales.textSecondary}>Tipo:</span>
                  <span className={coloresActuales.text}>{getParticleInfo(particulas.tipo).name}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista Previa en Tiempo Real */}
      <Card className={`${coloresActuales.surface} ${coloresActuales.border} transition-all duration-300`}>
        <CardHeader>
          <CardTitle className={`${coloresActuales.text} flex items-center gap-2`}>
            <div className={`p-2 rounded-lg bg-gradient-to-r ${coloresActuales.success}`}>
              <Eye className="h-4 w-4 text-primary-foreground" />
            </div>
            Vista Previa
          </CardTitle>
          <CardDescription className={coloresActuales.textSecondary}>
            Así se ve tu configuración actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`h-32 rounded-xl bg-gradient-to-r ${coloresActuales.gradiente} relative overflow-hidden border-2 ${coloresActuales.border}`}>
            {/* Elementos de ejemplo */}
            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${coloresActuales.surface} ${coloresActuales.text} text-sm font-medium`}>
              Modo: {isDark ? 'Oscuro' : 'Claro'}
            </div>
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r ${coloresActuales.primary} text-primary-foreground text-sm font-medium`}>
              {temaActual.nombre}
            </div>
            <div className={`absolute bottom-4 left-4 px-3 py-1 rounded-full bg-gradient-to-r ${coloresActuales.secondary} text-primary-foreground text-sm font-medium`}>
              Vista previa del tema
            </div>
            {particulas?.enabled && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-primary-foreground text-sm">
                <Sparkles className="h-3 w-3" />
                Partículas: {getParticleInfo(particulas.tipo).name}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
