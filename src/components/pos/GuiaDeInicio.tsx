"use client";

import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, Play, Square } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  variant?: 'first-time' | 'feature-tour' | 'advanced-features';
}

const TOUR_STEPS: Record<string, Step[]> = {
  'first-time': [
    {
      target: '[data-tour="search-products"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">🔍 Buscar Productos</h3>
          <p>Utiliza la barra de búsqueda para encontrar productos rápidamente. Puedes buscar por nombre, código o categoría.</p>
          <Badge variant="outline" className="text-xs">
            Atajo: Ctrl+F
          </Badge>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="product-grid"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">📦 Catálogo de Productos</h3>
          <p>Aquí se muestran todos tus productos disponibles. Haz clic en cualquier producto para agregarlo al carrito.</p>
          <p className="text-sm text-muted-foreground">💡 Tip: Puedes arrastrar y soltar productos para reordenarlos.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="shopping-cart"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">🛒 Carrito de Compras</h3>
          <p>Los productos seleccionados aparecerán aquí. Puedes ajustar cantidades o eliminar productos.</p>
          <p className="text-sm text-muted-foreground">El total se calcula automáticamente con impuestos.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '[data-tour="process-sale"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">💳 Procesar Venta</h3>
          <p>Cuando tengas productos en el carrito, usa este botón para finalizar la venta.</p>
          <Badge variant="outline" className="text-xs">
            Atajo: Ctrl+S
          </Badge>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="client-selector"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">👤 Seleccionar Cliente</h3>
          <p>Opcionalmente puedes asociar la venta a un cliente registrado para llevar un mejor control.</p>
          <p className="text-sm text-muted-foreground">Esto es útil para histórico de compras y promociones.</p>
        </div>
      ),
      placement: 'bottom',
    },
  ],
  'feature-tour': [
    {
      target: '[data-tour="shortcuts-help"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">⌨️ Atajos de Teclado</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+N</kbd> Nuevo producto</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">F2</kbd> Editar</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">Ctrl+S</kbd> Procesar venta</div>
            <div><kbd className="px-1 py-0.5 bg-muted rounded">F1</kbd> Ayuda</div>
          </div>
          <p className="text-xs text-muted-foreground">Presiona F1 en cualquier momento para ver todos los atajos.</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="drag-drop"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">🫳 Arrastrar y Soltar</h3>
          <p>Puedes reordenar los productos arrastrándolos a la posición que prefieras.</p>
          <p className="text-sm text-muted-foreground">El orden se guardará automáticamente para futuras sesiones.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="accessibility-toggle"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">♿ Modo Accesibilidad</h3>
          <p>Activa el modo de alta accesibilidad para mayor contraste, texto más grande y navegación mejorada por teclado.</p>
          <Badge variant="outline" className="text-xs">
            Atajo: Ctrl+Alt+A
          </Badge>
        </div>
      ),
      placement: 'bottom',
    },
  ],
  'advanced-features': [
    {
      target: '[data-tour="offline-indicator"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">📱 Modo Offline</h3>
          <p>Esta aplicación funciona sin conexión a internet. Las ventas se sincronizarán automáticamente cuando vuelvas a estar online.</p>
          <p className="text-sm text-muted-foreground">💡 Puedes instalar la app en tu dispositivo para un acceso más rápido.</p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="categories-filter"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">🏷️ Filtros Avanzados</h3>
          <p>Usa los filtros de categorías para navegar más fácilmente entre tus productos.</p>
          <p className="text-sm text-muted-foreground">Combina filtros con la búsqueda para resultados más precisos.</p>
        </div>
      ),
      placement: 'bottom',
    },
  ]
};

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  variant = 'first-time'
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRunning(true);
      setStepIndex(0);
    } else {
      setIsRunning(false);
    }
  }, [isOpen]);

  const steps = TOUR_STEPS[variant] || TOUR_STEPS['first-time'];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setIsRunning(false);
      onComplete();
      onClose();
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Joyride
        steps={steps}
        run={isRunning}
        stepIndex={stepIndex}
        callback={handleJoyrideCallback}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        spotlightClicks
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            backgroundColor: 'hsl(var(--background))',
            textColor: 'hsl(var(--foreground))',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            arrowColor: 'hsl(var(--background))',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: '8px',
            padding: '16px',
            fontSize: '14px',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          buttonBack: {
            backgroundColor: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '14px',
            marginRight: '8px',
          },
          buttonSkip: {
            backgroundColor: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            border: 'none',
            fontSize: '14px',
          },
          buttonClose: {
            backgroundColor: 'transparent',
            color: 'hsl(var(--muted-foreground))',
            border: 'none',
            fontSize: '14px',
            padding: '4px',
          },
          spotlight: {
            borderRadius: '8px',
            border: '2px solid hsl(var(--primary))',
          },
          beacon: {
            backgroundColor: 'hsl(var(--primary))',
          },
        }}
        locale={{
          back: 'Anterior',
          close: 'Cerrar',
          last: 'Finalizar',
          next: 'Siguiente',
          skip: 'Saltar tour',
        }}
        floaterProps={{
          disableAnimation: false,
        }}
      />

      {/* Tour Control Panel - Fixed position */}
      {isRunning && (
        <div className="fixed bottom-4 right-4 z-[10001] bg-background border rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Tour Guiado</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRunning(false);
                onClose();
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Paso {stepIndex + 1} de {steps.length}</span>
            <div className="flex-1 bg-muted rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-300"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Anterior
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (stepIndex < steps.length - 1) {
                  setStepIndex(stepIndex + 1);
                } else {
                  setIsRunning(false);
                  onComplete();
                  onClose();
                }
              }}
              className="flex-1"
            >
              {stepIndex < steps.length - 1 ? (
                <>
                  Siguiente
                  <ChevronRight className="h-3 w-3 ml-1" />
                </>
              ) : (
                <>
                  Finalizar
                  <Square className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
