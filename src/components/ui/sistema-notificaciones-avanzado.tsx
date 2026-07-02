"use client";

import { useState, useEffect } from "react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Settings,
  Filter,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notificacion {
  id: string;
  tipo: "info" | "warning" | "error" | "success" | "feature";
  titulo: string;
  mensaje: string;
  fechaCreacion: Date;
  leida: boolean;
  accionUrl?: string;
  accionTexto?: string;
  prioridad: "alta" | "media" | "baja";
  categoria: string;
  persistente?: boolean;
}

export default function SistemaNotificacionesAvanzado() {
  const { configuracion, configNegocio, tieneServicios, tieneCitas, obtenerTema } = useConfiguracionEmpresa();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>("todas");
  const [mostrarLeidas, setMostrarLeidas] = useState(false);

  const tema = obtenerTema();

  useEffect(() => {
    generarNotificacionesPersonalizadas();
  }, [configuracion, configNegocio]);

  const generarNotificacionesPersonalizadas = () => {
    if (!configuracion || !configNegocio) return;

    const notificacionesGeneradas: Notificacion[] = [];

    // Notificación de bienvenida
    notificacionesGeneradas.push({
      id: "bienvenida",
      tipo: "success",
      titulo: `¡Bienvenido a tu ${configNegocio.nombre}!`,
      mensaje: "Tu sistema POS está configurado y listo para usar. Te recomendamos completar el tutorial inicial.",
      fechaCreacion: new Date(),
      leida: false,
      accionUrl: "/dashboard/configuracion-inicial",
      accionTexto: "Comenzar configuración",
      prioridad: "alta",
      categoria: "configuracion",
      persistente: true
    });

    // Notificaciones específicas por tipo de negocio
    if (tieneServicios()) {
      notificacionesGeneradas.push({
        id: "servicios-disponibles",
        tipo: "feature",
        titulo: "Funcionalidad de Servicios Habilitada",
        mensaje: `Los servicios están disponibles para tu ${configNegocio.nombre.toLowerCase()}. ¡Configúralos para aumentar tus ingresos!`,
        fechaCreacion: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
        leida: false,
        accionUrl: "/dashboard/servicios",
        accionTexto: "Configurar servicios",
        prioridad: "media",
        categoria: "funcionalidades"
      });
    }

    if (tieneCitas()) {
      notificacionesGeneradas.push({
        id: "citas-disponibles",
        tipo: "feature",
        titulo: "Sistema de Citas Activado",
        mensaje: "Organiza mejor tu tiempo con el sistema de citas. Tus clientes podrán reservar con anticipación.",
        fechaCreacion: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 horas atrás
        leida: false,
        accionUrl: "/dashboard/citas",
        accionTexto: "Gestionar citas",
        prioridad: "media",
        categoria: "funcionalidades"
      });
    }

    // Notificaciones de configuración pendiente
    if (configNegocio.funcionalidades.variantes) {
      notificacionesGeneradas.push({
        id: "variantes-tip",
        tipo: "info",
        titulo: "Tip: Productos con Variantes",
        mensaje: "Tu tipo de negocio se beneficia de productos con variantes (tallas, colores, medidas). ¿Ya los configuraste?",
        fechaCreacion: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
        leida: false,
        accionUrl: "/dashboard/productos",
        accionTexto: "Ver productos",
        prioridad: "baja",
        categoria: "tips"
      });
    }

    if (configNegocio.funcionalidades.vencimientos) {
      notificacionesGeneradas.push({
        id: "vencimientos-importante",
        tipo: "warning",
        titulo: "Control de Vencimientos Crítico",
        mensaje: "Para tu tipo de negocio es importante controlar fechas de vencimiento. Asegúrate de configurar alertas.",
        fechaCreacion: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
        leida: false,
        accionUrl: "/dashboard/inventario",
        accionTexto: "Configurar alertas",
        prioridad: "alta",
        categoria: "inventario"
      });
    }

    // Notificaciones de nuevas funcionalidades
    notificacionesGeneradas.push({
      id: "nueva-funcionalidad",
      tipo: "feature",
      titulo: "🎉 Nueva Funcionalidad: Reportes Avanzados",
      mensaje: "Ahora puedes generar reportes más detallados de ventas, productos y clientes.",
      fechaCreacion: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 horas atrás
      leida: false,
      accionUrl: "/dashboard/reportes",
      accionTexto: "Explorar reportes",
      prioridad: "media",
      categoria: "nuevas-funcionalidades"
    });

    // Notificación de rendimiento
    notificacionesGeneradas.push({
      id: "rendimiento-tip",
      tipo: "info",
      titulo: "Mejora tu Eficiencia",
      mensaje: "¿Sabías que puedes usar atajos de teclado en el POS? Presiona F1 para ver todos los atajos disponibles.",
      fechaCreacion: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 días atrás
      leida: true,
      prioridad: "baja",
      categoria: "tips"
    });

    setNotificaciones(notificacionesGeneradas);
  };

  const marcarComoLeida = (id: string) => {
    setNotificaciones(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, leida: true } : notif
      )
    );
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => prev.filter(notif => notif.id !== id));
  };

  const marcarTodasComoLeidas = () => {
    setNotificaciones(prev =>
      prev.map(notif => ({ ...notif, leida: true }))
    );
  };

  const obtenerIconoPorTipo = (tipo: Notificacion["tipo"]) => {
    switch (tipo) {
      case "success": return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case "error": return <X className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "feature": return <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      default: return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  const obtenerColorPorPrioridad = (prioridad: Notificacion["prioridad"]) => {
    switch (prioridad) {
      case "alta": return "border-l-red-500 bg-destructive/10";
      case "media": return "border-l-yellow-500 bg-amber-500/10";
      default: return "border-l-blue-500 bg-blue-500/10";
    }
  };

  const notificacionesFiltradas = notificaciones.filter(notif => {
    const cumpleTipo = filtroTipo === "todas" || notif.tipo === filtroTipo;
    const cumpleLeida = mostrarLeidas || !notif.leida;
    return cumpleTipo && cumpleLeida;
  });

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Centro de Notificaciones</CardTitle>
            {notificacionesNoLeidas > 0 && (
              <Badge variant="destructive">{notificacionesNoLeidas}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFiltroTipo("todas")}>
                  Todas las notificaciones
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltroTipo("feature")}>
                  Nuevas funcionalidades
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltroTipo("warning")}>
                  Advertencias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFiltroTipo("info")}>
                  Información
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={marcarTodasComoLeidas}>
              Marcar todas como leídas
            </Button>
          </div>
        </div>
        <CardDescription>
          Mantente al día con las últimas novedades y recomendaciones para tu {configNegocio?.nombre.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notificacionesFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay notificaciones para mostrar</p>
            </div>
          ) : (
            notificacionesFiltradas.map((notificacion) => (
              <div
                key={notificacion.id}
                className={`border-l-4 p-4 rounded-lg transition-all duration-200 ${
                  obtenerColorPorPrioridad(notificacion.prioridad)
                } ${!notificacion.leida ? 'shadow-md' : 'opacity-75'}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {obtenerIconoPorTipo(notificacion.tipo)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{notificacion.titulo}</h4>
                        {!notificacion.leida && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {notificacion.categoria}
                        </Badge>
                        <Badge
                          variant={notificacion.prioridad === "alta" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {notificacion.prioridad}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notificacion.mensaje}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{notificacion.fechaCreacion.toLocaleDateString()}</span>
                        {notificacion.accionUrl && (
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => marcarComoLeida(notificacion.id)}
                          >
                            <a href={notificacion.accionUrl}>
                              {notificacion.accionTexto || "Ver más"}
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {!notificacion.leida && (
                        <DropdownMenuItem onClick={() => marcarComoLeida(notificacion.id)}>
                          Marcar como leída
                        </DropdownMenuItem>
                      )}
                      {!notificacion.persistente && (
                        <DropdownMenuItem
                          onClick={() => eliminarNotificacion(notificacion.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Configuración de notificaciones */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Configuración de Notificaciones</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mostrarLeidas}
                  onChange={(e) => setMostrarLeidas(e.target.checked)}
                  className="rounded"
                />
                Mostrar notificaciones leídas
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
