"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Play,
  CheckCircle,
  ArrowRight,
  X,
  Lightbulb,
  MessageCircle,
  ExternalLink,
  Settings,
  Users,
  Package,
  CreditCard,
  BarChart3
} from "lucide-react";
import { useTutorial } from "@/hooks/use-tutorial";
import { useRouter } from "next/navigation";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  completed?: boolean;
}

export function DashboardTutorialHelper() {
  const tutorial = useTutorial();
  const router = useRouter();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || tutorial.hasSeenTutorial) {
    return null;
  }

  const progress = tutorial.getTutorialProgress();

  const quickActions: QuickAction[] = [
    {
      title: "Configurar negocio",
      description: "Define el tipo de negocio y funcionalidades",
      icon: Settings,
      action: () => router.push("/dashboard/configuracion-inicial"),
      completed: tutorial.tutorialState.completedSteps.includes("tipo-negocio")
    },
    {
      title: "Agregar usuarios",
      description: "Invita empleados y define permisos",
      icon: Users,
      action: () => router.push("/dashboard/usuarios"),
      completed: tutorial.tutorialState.completedSteps.includes("usuarios")
    },
    {
      title: "Cargar productos",
      description: "Agrega tu inventario inicial",
      icon: Package,
      action: () => router.push("/dashboard/productos"),
      completed: tutorial.tutorialState.completedSteps.includes("productos")
    },
    {
      title: "Probar POS",
      description: "Haz tu primera venta de prueba",
      icon: CreditCard,
      action: () => router.push("/dashboard/pos"),
      completed: tutorial.tutorialState.completedSteps.includes("pos")
    }
  ];

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 shadow-2xl border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50 z-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/15 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Centro de Ayuda</h4>
                <p className="text-xs text-muted-foreground">
                  {progress.completed}/{progress.total} pasos completados
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-8 w-8 p-0"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDismissed(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress.percentage} className="mt-2 h-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-blue-500/30 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-blue-900">
                ¡Bienvenido a tu Sistema POS! 🎉
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-400">
                Te ayudamos a configurar todo para que puedas empezar a vender
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400"
            >
              Minimizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progreso */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900">
              Configuración inicial
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-400">
              {progress.completed}/{progress.total} completados
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {/* Acciones rápidas */}
        <div>
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Próximos pasos recomendados
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    action.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-card hover:bg-blue-500/10 border-border hover:border-blue-500/40'
                  }`}
                  onClick={action.action}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        action.completed
                          ? 'bg-emerald-500/15'
                          : 'bg-blue-500/15'
                      }`}>
                        {action.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ActionIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm text-foreground dark:text-foreground">
                          {action.title}
                          {action.completed && (
                            <Badge variant="outline" className="ml-2 text-xs border-green-500/40 text-green-700 dark:text-green-400">
                              Completado
                            </Badge>
                          )}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Botones principales */}
        <div className="flex gap-3">
          <Button
            onClick={tutorial.startTutorial}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {tutorial.hasSeenTutorial ? "Ver tutorial de nuevo" : "Iniciar tutorial guiado"}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/configuracion-inicial")}
            className="border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar ahora
          </Button>
        </div>

        {/* Enlaces de ayuda */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <button className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400">
                <MessageCircle className="h-4 w-4" />
                Soporte
              </button>
              <button className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400">
                <ExternalLink className="h-4 w-4" />
                Documentación
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              ⏱️ Tiempo estimado: 10-15 min
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
