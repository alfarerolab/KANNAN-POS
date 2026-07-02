"use client";

import { useState } from "react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Target,
  Lightbulb,
  Rocket
} from "lucide-react";

interface PasoTutorial {
  id: number;
  titulo: string;
  descripcion: string;
  accion: string;
  ruta: string;
  completado?: boolean;
  prioridad: "alta" | "media" | "baja";
}

export default function TutorialInteractivo() {
  const { configuracion, configNegocio, obtenerTema } = useConfiguracionEmpresa();
  const [pasoActual, setPasoActual] = useState(0);
  const [tutorialIniciado, setTutorialIniciado] = useState(false);
  const [pasosCompletados, setPasosCompletados] = useState<number[]>([]);

  const tema = obtenerTema();

  if (!configuracion || !configNegocio) {
    return null;
  }

  // Generar pasos específicos según el tipo de negocio
  const generarPasosTutorial = (): PasoTutorial[] => {
    const pasos: PasoTutorial[] = [
      {
        id: 1,
        titulo: "Configuración inicial",
        descripcion: "Revisa y completa la configuración básica de tu empresa",
        accion: "Ir a Configuración",
        ruta: "/dashboard/configuracion-inicial",
        prioridad: "alta"
      },
      {
        id: 2,
        titulo: "Agregar productos",
        descripcion: "Comienza agregando los productos que vendes en tu negocio",
        accion: "Crear productos",
        ruta: "/dashboard/productos/nuevo",
        prioridad: "alta"
      },
      {
        id: 3,
        titulo: "Crear categorías",
        descripcion: "Organiza tus productos en categorías para facilitar la gestión",
        accion: "Gestionar categorías",
        ruta: "/dashboard/categorias",
        prioridad: "media"
      }
    ];

    // Agregar pasos específicos según el tipo de negocio
    if (configNegocio.funcionalidades.servicios) {
      pasos.push({
        id: 4,
        titulo: "Configurar servicios",
        descripcion: `Los servicios son importantes para tu ${configNegocio.nombre.toLowerCase()}`,
        accion: "Crear servicios",
        ruta: "/dashboard/servicios",
        prioridad: "alta"
      });
    }

    if (configNegocio.funcionalidades.citas) {
      pasos.push({
        id: 5,
        titulo: "Sistema de citas",
        descripcion: "Configura el sistema de citas para organizar mejor tu tiempo",
        accion: "Ver citas",
        ruta: "/dashboard/citas",
        prioridad: "alta"
      });
    }

    if (configNegocio.funcionalidades.variantes) {
      pasos.push({
        id: 6,
        titulo: "Productos con variantes",
        descripcion: "Aprende a manejar productos con tallas, colores o medidas",
        accion: "Ver variantes",
        ruta: "/dashboard/productos",
        prioridad: "media"
      });
    }

    if (configNegocio.funcionalidades.mascotas) {
      pasos.push({
        id: 7,
        titulo: "Registro de mascotas",
        descripcion: "Registra las mascotas de tus clientes para un mejor servicio",
        accion: "Ver mascotas",
        ruta: "/dashboard/mascotas",
        prioridad: "media"
      });
    }

    pasos.push(
      {
        id: 8,
        titulo: "Registrar clientes",
        descripcion: "Mantén un registro de tus clientes para mejorar el servicio",
        accion: "Gestionar clientes",
        ruta: "/dashboard/clientes",
        prioridad: "media"
      },
      {
        id: 9,
        titulo: "Primera venta",
        descripcion: "Realiza tu primera venta usando el punto de venta",
        accion: "Ir al POS",
        ruta: "/dashboard/pos",
        prioridad: "alta"
      },
      {
        id: 10,
        titulo: "Ver reportes",
        descripcion: "Aprende a generar reportes para analizar tu negocio",
        accion: "Ver reportes",
        ruta: "/dashboard/reportes",
        prioridad: "baja"
      }
    );

    return pasos.sort((a, b) => {
      const prioridadOrden = { alta: 1, media: 2, baja: 3 };
      return prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad];
    });
  };

  const pasos = generarPasosTutorial();
  const pasoCompleto = pasoActual > 0 && pasos[pasoActual - 1];
  const progreso = (pasosCompletados.length / pasos.length) * 100;

  const marcarComoCompletado = (pasoId: number) => {
    if (!pasosCompletados.includes(pasoId)) {
      setPasosCompletados([...pasosCompletados, pasoId]);
    }
  };

  const siguientePaso = () => {
    if (pasoActual < pasos.length) {
      setPasoActual(pasoActual + 1);
    }
  };

  const pasoAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  const iniciarTutorial = () => {
    setTutorialIniciado(true);
    setPasoActual(1);
  };

  if (!tutorialIniciado) {
    return (
      <Card className={`border-l-4 border-l-${tema.color}-500 bg-gradient-to-r ${tema.gradiente}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            ¡Bienvenido a tu {configNegocio.nombre}!
          </CardTitle>
          <CardDescription>
            Te guiaremos paso a paso para configurar tu sistema POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{tema.icon}</div>
              <div>
                <h3 className="font-semibold">Tutorial personalizado</h3>
                <p className="text-sm text-muted-foreground">
                  Este tutorial está diseñado específicamente para {configNegocio.nombre.toLowerCase()}s
                </p>
              </div>
            </div>

            <div className="bg-card dark:bg-background/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Lo que aprenderás:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Configuración básica
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Gestión de productos
                </div>
                {configNegocio.funcionalidades.servicios && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Configuración de servicios
                  </div>
                )}
                {configNegocio.funcionalidades.citas && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Sistema de citas
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Primera venta
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Análisis y reportes
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={iniciarTutorial}
                className={`${tema.accent} hover:bg-primary/90`}
              >
                <Play className="h-4 w-4 mr-2" />
                Comenzar Tutorial
              </Button>
              <Button variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Saltar por ahora
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            <CardTitle>Tutorial Paso a Paso</CardTitle>
            <Badge variant="outline">
              Paso {pasoActual} de {pasos.length}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(progreso)}% completado
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`bg-${tema.color}-500 h-2 rounded-full transition-all duration-300`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      </CardHeader>

      {pasoCompleto && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-${tema.color}-100`}>
                <span className="font-bold text-lg">{pasoCompleto.id}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{pasoCompleto.titulo}</h3>
                  <Badge
                    variant={pasoCompleto.prioridad === "alta" ? "destructive" :
                             pasoCompleto.prioridad === "media" ? "default" : "secondary"}
                  >
                    {pasoCompleto.prioridad === "alta" ? "Importante" :
                     pasoCompleto.prioridad === "media" ? "Recomendado" : "Opcional"}
                  </Badge>
                  {pasosCompletados.includes(pasoCompleto.id) && (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <p className="text-muted-foreground mb-4">
                  {pasoCompleto.descripcion}
                </p>

                <div className="flex gap-2">
                  <Button
                    asChild
                    className={`${tema.accent} hover:bg-primary/90`}
                    onClick={() => marcarComoCompletado(pasoCompleto.id)}
                  >
                    <a href={pasoCompleto.ruta} target="_blank" rel="noopener noreferrer">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      {pasoCompleto.accion}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => marcarComoCompletado(pasoCompleto.id)}
                  >
                    Marcar como completado
                  </Button>
                </div>
              </div>
            </div>

            {/* Tips específicos del paso */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900">Tip para tu {configNegocio.nombre.toLowerCase()}</span>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {pasoCompleto.id === 1 && "Una configuración inicial completa te ahorrará tiempo más adelante."}
                {pasoCompleto.id === 2 && configNegocio.funcionalidades.variantes && "Si vendes productos con variantes (tallas, colores), podrás configurarlas después."}
                {pasoCompleto.id === 4 && "Los servicios son tan importantes como los productos en tu tipo de negocio."}
                {pasoCompleto.id === 5 && "Las citas te ayudarán a organizar mejor tu agenda y mejorar la experiencia del cliente."}
                {pasoCompleto.id === 9 && "El punto de venta es el corazón de tu sistema, aquí realizarás la mayoría de transacciones."}
              </p>
            </div>

            {/* Navegación */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={pasoAnterior}
                disabled={pasoActual <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                {pasosCompletados.length} de {pasos.length} pasos completados
              </span>

              <Button
                onClick={siguientePaso}
                disabled={pasoActual >= pasos.length}
                className={pasoActual >= pasos.length ? "" : `${tema.accent} hover:bg-primary/90`}
              >
                {pasoActual >= pasos.length ? "Finalizado" : "Siguiente"}
                {pasoActual < pasos.length && <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
