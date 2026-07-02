"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accessibility,
  Eye,
  Type,
  MousePointer,
  Keyboard,
  Volume2,
  Monitor,
  Zap,
  Settings,
  X
} from 'lucide-react';
import { useAccessibility } from '@/hooks/use-accessibility';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose
}) => {
  const {
    settings,
    isEnabled,
    updateSetting,
    toggleAccessibilityMode,
    resetSettings,
    announceToScreenReader
  } = useAccessibility();

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    updateSetting(key, value);

    // Anunciar cambio para lectores de pantalla
    const settingNames = {
      highContrast: 'Alto contraste',
      largeText: 'Texto grande',
      reducedMotion: 'Movimiento reducido',
      keyboardNavigation: 'Navegación por teclado',
      screenReaderFriendly: 'Modo lector de pantalla',
      focusIndicators: 'Indicadores de foco'
    };

    const action = value ? 'activado' : 'desactivado';
    announceToScreenReader(`${settingNames[key]} ${action}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          data-tour="accessibility-toggle"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground">
                  <Accessibility className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Accesibilidad</h2>
                  <p className="text-sm text-muted-foreground">
                    Configurar opciones de accesibilidad
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Cerrar panel de accesibilidad"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Toggle */}
            <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-medium">Modo Accesibilidad</h3>
                    <p className="text-sm text-muted-foreground">
                      Activar configuración optimizada
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEnabled && (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-green-700 dark:text-green-400">
                      Activo
                    </Badge>
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={toggleAccessibilityMode}
                    aria-label="Alternar modo de accesibilidad"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="flex-1 p-6 space-y-6">
              {/* Visual Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5" />
                    Configuración Visual
                  </CardTitle>
                  <CardDescription>
                    Opciones para mejorar la visibilidad
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Alto Contraste</div>
                      <div className="text-xs text-muted-foreground">
                        Colores más contrastantes para mejor visibilidad
                      </div>
                    </div>
                    <Switch
                      checked={settings.highContrast}
                      onCheckedChange={(value) => handleSettingChange('highContrast', value)}
                      aria-label="Alto contraste"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Texto Grande</div>
                      <div className="text-xs text-muted-foreground">
                        Aumentar el tamaño de fuente y botones
                      </div>
                    </div>
                    <Switch
                      checked={settings.largeText}
                      onCheckedChange={(value) => handleSettingChange('largeText', value)}
                      aria-label="Texto grande"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Movimiento Reducido</div>
                      <div className="text-xs text-muted-foreground">
                        Reducir animaciones y transiciones
                      </div>
                    </div>
                    <Switch
                      checked={settings.reducedMotion}
                      onCheckedChange={(value) => handleSettingChange('reducedMotion', value)}
                      aria-label="Movimiento reducido"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Keyboard className="h-5 w-5" />
                    Navegación
                  </CardTitle>
                  <CardDescription>
                    Opciones para navegación y control
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Navegación por Teclado</div>
                      <div className="text-xs text-muted-foreground">
                        Navegación mejorada usando solo el teclado
                      </div>
                    </div>
                    <Switch
                      checked={settings.keyboardNavigation}
                      onCheckedChange={(value) => handleSettingChange('keyboardNavigation', value)}
                      aria-label="Navegación por teclado"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Indicadores de Foco</div>
                      <div className="text-xs text-muted-foreground">
                        Resaltar elemento activo más claramente
                      </div>
                    </div>
                    <Switch
                      checked={settings.focusIndicators}
                      onCheckedChange={(value) => handleSettingChange('focusIndicators', value)}
                      aria-label="Indicadores de foco"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Screen Reader Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Volume2 className="h-5 w-5" />
                    Lector de Pantalla
                  </CardTitle>
                  <CardDescription>
                    Optimizaciones para lectores de pantalla
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">Modo Lector de Pantalla</div>
                      <div className="text-xs text-muted-foreground">
                        Anuncios y etiquetas optimizadas
                      </div>
                    </div>
                    <Switch
                      checked={settings.screenReaderFriendly}
                      onCheckedChange={(value) => handleSettingChange('screenReaderFriendly', value)}
                      aria-label="Modo lector de pantalla"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Information */}
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Atajos de Teclado</h4>
                      <div className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
                        <div><kbd className="px-1 py-0.5 bg-blue-500/15 rounded text-xs">Ctrl+Alt+A</kbd> Alternar accesibilidad</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-500/15 rounded text-xs">Tab</kbd> Navegar elementos</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-500/15 rounded text-xs">Enter/Space</kbd> Activar</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-500/15 rounded text-xs">Esc</kbd> Cancelar</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-muted/50">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={resetSettings}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Restablecer
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1"
                >
                  Aplicar Cambios
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
