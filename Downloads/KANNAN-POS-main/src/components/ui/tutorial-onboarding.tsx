"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Circle,
  Rocket,
  Settings,
  Store,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Lightbulb,
  BookOpen,
  Play,
  X
} from "lucide-react";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: React.ReactNode;
  actionText: string;
  actionUrl?: string;
  completed?: boolean;
  estimatedTime?: string;
}

interface TutorialOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function TutorialOnboarding({ isOpen, onClose, onComplete }: TutorialOnboardingProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps: TutorialStep[] = [
    {
      id: "bienvenida",
      title: "¡Bienvenido a tu Sistema POS!",
      description: "Te guiaremos paso a paso para configurar tu negocio",
      icon: Rocket,
      estimatedTime: "2 min",
      actionText: "Comenzar",
      content: (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-2">¡Tu sistema POS está listo!</h3>
            <p className="text-muted-foreground mb-4">
              En los próximos pasos configuraremos todo lo necesario para que puedas empezar a vender inmediatamente.
            </p>
          </div>

          <div className="bg-blue-500/10 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ¿Qué vamos a configurar?
            </h4>
            <ul className="text-sm space-y-1 text-foreground/80">
              <li>• Tipo de negocio y funcionalidades</li>
              <li>• Información básica de tu empresa</li>
              <li>• Usuarios y empleados</li>
              <li>• Productos o servicios</li>
              <li>• Configuración del punto de venta</li>
            </ul>
          </div>

          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <strong>Tiempo estimado:</strong> 10-15 minutos
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "tipo-negocio",
      title: "Configura tu Tipo de Negocio",
      description: "Personaliza las funcionalidades según tu negocio",
      icon: Store,
      estimatedTime: "3 min",
      actionText: "Configurar Negocio",
      actionUrl: "/dashboard/configuracion-inicial",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Cada tipo de negocio tiene funcionalidades específicas. Esto nos ayuda a mostrarte solo lo que necesitas.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <div className="text-2xl mb-1">🏪</div>
              <div className="text-sm font-medium">Tienda/Retail</div>
              <div className="text-xs text-muted-foreground">Inventario, códigos de barras</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl mb-1">✂️</div>
              <div className="text-sm font-medium">Servicios</div>
              <div className="text-xs text-muted-foreground">Citas, empleados especializados</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl mb-1">🍽️</div>
              <div className="text-sm font-medium">Restaurante</div>
              <div className="text-xs text-muted-foreground">Mesas, comandas, cocina</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm font-medium">Personalizado</div>
              <div className="text-xs text-muted-foreground">Configura según tus necesidades</div>
            </div>
          </div>

          <div className="bg-amber-500/10 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              💡 <strong>Consejo:</strong> Puedes cambiar estas configuraciones más tarde desde el panel de configuración.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "usuarios",
      title: "Gestión de Usuarios",
      description: "Agrega empleados y define sus permisos",
      icon: Users,
      estimatedTime: "2 min",
      actionText: "Gestionar Usuarios",
      actionUrl: "/dashboard/usuarios",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Agrega a tus empleados y define qué pueden hacer en el sistema.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium">Administrador</div>
                <div className="text-sm text-muted-foreground">Acceso completo al sistema</div>
              </div>
              <Badge variant="outline">Tu rol actual</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
              <div className="w-10 h-10 bg-emerald-500/15 rounded-full flex items-center justify-center">
                <Circle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium">Empleado</div>
                <div className="text-sm text-muted-foreground">Puede hacer ventas y gestionar productos</div>
              </div>
              <Button variant="outline" size="sm">Agregar</Button>
            </div>
          </div>

          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              📋 <strong>Recomendación:</strong> Comienza agregando un empleado de prueba para familiarizarte con el sistema.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "productos",
      title: "Agrega tus Productos",
      description: "Carga el inventario inicial de tu negocio",
      icon: Package,
      estimatedTime: "5 min",
      actionText: "Gestionar Productos",
      actionUrl: "/dashboard/productos",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Agrega los productos que vendes. Puedes hacerlo uno por uno o importar desde un archivo Excel.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">Agregar Producto Individual</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Perfecto para empezar con pocos productos o agregar uno específico.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Nombre, precio y descripción</div>
                <div>• Código de barras (opcional)</div>
                <div>• Categoría y stock inicial</div>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-emerald-500/10">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-medium">Importación Masiva</span>
                <Badge variant="outline" className="text-xs">Recomendado</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Sube muchos productos a la vez desde un archivo Excel.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• Descarga nuestra plantilla</div>
                <div>• Llena los datos de tus productos</div>
                <div>• Sube el archivo y listo</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/10 p-4 rounded-lg">
            <p className="text-sm text-purple-700">
              🚀 <strong>Tip Pro:</strong> Si tienes códigos de barras, el sistema puede buscar automáticamente información del producto.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "pos",
      title: "Configura tu Punto de Venta",
      description: "Personaliza la experiencia de venta",
      icon: CreditCard,
      estimatedTime: "2 min",
      actionText: "Ir al POS",
      actionUrl: "/dashboard/pos",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Tu punto de venta (POS) es donde realizarás las ventas diarias. Vamos a configurarlo.
          </p>

          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">💳 Métodos de Pago</div>
              <div className="text-sm text-muted-foreground">Efectivo, tarjeta, transferencia</div>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">🖨️ Impresión de Recibos</div>
              <div className="text-sm text-muted-foreground">Configura tu impresora térmica</div>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="font-medium mb-1">📊 Vista de Productos</div>
              <div className="text-sm text-muted-foreground">Organiza por categorías</div>
            </div>
          </div>

          <div className="bg-emerald-500/10 p-4 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
              <Play className="h-4 w-4" />
              <strong>¡Prueba tu primera venta!</strong> Haz una venta de prueba para familiarizarte.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "finalizacion",
      title: "¡Todo Listo!",
      description: "Tu sistema está configurado y listo para usar",
      icon: CheckCircle,
      estimatedTime: "1 min",
      actionText: "Ir al Dashboard",
      actionUrl: "/dashboard",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-6xl mb-4">🎊</div>
          <h3 className="text-xl font-bold mb-2">¡Felicitaciones!</h3>
          <p className="text-muted-foreground mb-4">
            Has completado la configuración inicial de tu sistema POS. Ahora puedes empezar a vender.
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">🎯 Próximos Pasos Recomendados:</h4>
            <div className="text-sm space-y-2 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Hacer una venta de prueba</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground/70" />
                <span>Explorar los reportes de ventas</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground/70" />
                <span>Configurar notificaciones de stock bajo</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground/70" />
                <span>Invitar a más empleados</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <strong>¿Necesitas ayuda?</strong> Visita nuestro centro de ayuda o contacta soporte.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    const currentStepData = steps[currentStep];

    // Marcar paso actual como completado
    if (!completedSteps.includes(currentStepData.id)) {
      setCompletedSteps(prev => [...prev, currentStepData.id]);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial completado
      onComplete();
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    const currentStepData = steps[currentStep];

    if (currentStepData.actionUrl) {
      // Marcar como completado y navegar
      if (!completedSteps.includes(currentStepData.id)) {
        setCompletedSteps(prev => [...prev, currentStepData.id]);
      }
      router.push(currentStepData.actionUrl);
      onClose();
    } else {
      handleNext();
    }
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/15 rounded-lg">
                <StepIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
                <DialogDescription>{currentStepData.description}</DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Paso {currentStep + 1} de {steps.length}</span>
            <span>{currentStepData.estimatedTime && `⏱️ ${currentStepData.estimatedTime}`}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="py-4">
          {currentStepData.content}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-blue-600'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button onClick={handleAction} className="bg-blue-600 hover:bg-blue-700">
            {currentStepData.actionText}
            {!currentStepData.actionUrl && (
              <ArrowRight className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>

        {/* Skip Tutorial Option */}
        <div className="text-center pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground/80"
          >
            Saltar tutorial (puedes acceder más tarde desde Ayuda)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
