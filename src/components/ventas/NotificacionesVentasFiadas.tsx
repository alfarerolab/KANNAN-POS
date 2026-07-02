// src/components/ventas/NotificacionesVentasFiadas.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NotificacionVentaFiada {
  id: string;
  tipo: "vencimiento_proximo" | "vencida" | "pago_registrado" | "pago_parcial";
  ventaId: string;
  clienteNombre: string;
  mensaje: string;
  monto: number;
  prioridad: "alta" | "media" | "baja";
  timestamp: string;
  leida: boolean;
  fechaVencimiento?: string;
}

interface NotificacionesVentasFiadaProps {
  maxItems?: number;
  mostrarTodas?: boolean;
  onNotificacionClick?: (ventaId: string) => void;
}

export function NotificacionesVentasFiadas({
  maxItems = 5,
  mostrarTodas = false,
  onNotificacionClick,
}: NotificacionesVentasFiadaProps) {
  const [notificaciones, setNotificaciones] = useState<NotificacionVentaFiada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarLeidas, setMostrarLeidas] = useState(false);

  // Cargar notificaciones
  const cargarNotificaciones = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/ventas/fiadas/notificaciones");
      
      if (!response.ok) {
        throw new Error("Error al cargar notificaciones");
      }

      const data = await response.json();
      setNotificaciones(data.notificaciones || []);
    } catch (err) {
      console.error("Error al cargar notificaciones:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    // Recargar cada 5 minutos
    const interval = setInterval(cargarNotificaciones, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Marcar como leída
  const marcarLeida = async (notificacionId: string) => {
    try {
      await fetch(`/api/ventas/fiadas/notificaciones/${notificacionId}/leer`, {
        method: "POST",
      });
      
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === notificacionId ? { ...n, leida: true } : n))
      );
    } catch (err) {
      console.error("Error al marcar notificación:", err);
    }
  };

  // Filtrar notificaciones
  const notificacionesFiltradas = mostrarLeidas
    ? notificaciones
    : notificaciones.filter((n) => !n.leida);

  const notificacionesMostradas = mostrarTodas
    ? notificacionesFiltradas
    : notificacionesFiltradas.slice(0, maxItems);

  const totalNoLeidas = notificaciones.filter((n) => !n.leida).length;

  // Obtener icono según tipo
  const obtenerIcono = (tipo: NotificacionVentaFiada["tipo"], prioridad: string) => {
    const iconClass = cn(
      "h-5 w-5",
      prioridad === "alta" && "text-red-600 dark:text-red-400",
      prioridad === "media" && "text-orange-600 dark:text-orange-400",
      prioridad === "baja" && "text-blue-600 dark:text-blue-400"
    );

    switch (tipo) {
      case "vencida":
        return <AlertCircle className={iconClass} />;
      case "vencimiento_proximo":
        return <AlertTriangle className={iconClass} />;
      case "pago_registrado":
        return <CheckCircle className={cn(iconClass, "text-green-600 dark:text-green-400")} />;
      case "pago_parcial":
        return <DollarSign className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones de Ventas Fiadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones de Ventas Fiadas
            </CardTitle>
            {totalNoLeidas > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalNoLeidas}
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMostrarLeidas(!mostrarLeidas)}
          >
            {mostrarLeidas ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Ocultar leídas
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Mostrar todas
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          {totalNoLeidas === 0
            ? "No hay notificaciones pendientes"
            : `${totalNoLeidas} notificación${totalNoLeidas !== 1 ? "es" : ""} sin leer`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notificacionesMostradas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {notificacionesMostradas.map((notificacion) => (
                <div
                  key={notificacion.id}
                  className={cn(
                    "flex items-start gap-3 p-4 border rounded-lg transition-all cursor-pointer hover:bg-muted/50",
                    !notificacion.leida && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notificacion.leida) {
                      marcarLeida(notificacion.id);
                    }
                    onNotificacionClick?.(notificacion.ventaId);
                  }}
                >
                  <div className="mt-1">
                    {obtenerIcono(notificacion.tipo, notificacion.prioridad)}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{notificacion.clienteNombre}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            notificacion.prioridad === "alta"
                              ? "destructive"
                              : notificacion.prioridad === "media"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {notificacion.prioridad === "alta"
                            ? "Urgente"
                            : notificacion.prioridad === "media"
                            ? "Importante"
                            : "Info"}
                        </Badge>
                        {!notificacion.leida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              marcarLeida(notificacion.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {notificacion.mensaje}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(notificacion.monto)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(notificacion.timestamp), "d MMM, HH:mm", {
                          locale: es,
                        })}
                      </div>
                      {notificacion.fechaVencimiento && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Vence:{" "}
                          {format(new Date(notificacion.fechaVencimiento), "d MMM", {
                            locale: es,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {!mostrarTodas && notificacionesFiltradas.length > maxItems && (
          <div className="mt-4 text-center">
            <Link href="/dashboard/ventas/fiadas">
              <Button variant="outline" size="sm">
                Ver todas las notificaciones ({notificacionesFiltradas.length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}