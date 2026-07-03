// src/components/dashboard/MetricasVentasFiadas.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EstadisticasVentasFiadas {
  resumen: {
    totalVentasFiadas: number;
    montoTotalFiado: number;
    saldoPendienteTotal: number;
    montoPagadoTotal: number;
    tasaRecuperacion: number;
  };
  vencimientos: {
    ventasVencidas: number;
    montoVencido: number;
    ventasPorVencer: number;
    montoPorVencer: number;
  };
  estadosPago: {
    ventasConPagoParcial: number;
  };
}

export function MetricasVentasFiadas() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasVentasFiadas | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        const response = await fetch("/api/ventas/fiadas/estadisticas");
        if (response.ok) {
          const data = await response.json();
          setEstadisticas(data);
        }
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarEstadisticas();
    // Actualizar cada 5 minutos
    const interval = setInterval(cargarEstadisticas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (cargando) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!estadisticas) {
    return null;
  }

  const { resumen, vencimientos, estadosPago } = estadisticas;

  const metricas = [
    {
      titulo: "Total Fiado",
      valor: formatCurrency(resumen.montoTotalFiado),
      descripcion: `${resumen.totalVentasFiadas} ventas fiadas`,
      icono: DollarSign,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/15 dark:bg-blue-900/30",
    },
    {
      titulo: "Saldo Pendiente",
      valor: formatCurrency(resumen.saldoPendienteTotal),
      descripcion: `Recuperación: ${resumen.tasaRecuperacion.toFixed(1)}%`,
      icono: TrendingDown,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/15 dark:bg-orange-900/30",
      alerta: resumen.saldoPendienteTotal > resumen.montoPagadoTotal,
    },
    {
      titulo: "Ventas Vencidas",
      valor: vencimientos.ventasVencidas.toString(),
      descripcion: formatCurrency(vencimientos.montoVencido),
      icono: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-destructive/15 dark:bg-red-900/30",
      alerta: vencimientos.ventasVencidas > 0,
    },
    {
      titulo: "Por Vencer (7 días)",
      valor: vencimientos.ventasPorVencer.toString(),
      descripcion: formatCurrency(vencimientos.montoPorVencer),
      icono: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-amber-500/15 dark:bg-yellow-900/30",
      alerta: vencimientos.ventasPorVencer > 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ventas Fiadas</h3>
        <Link href="/dashboard/ventas/fiadas">
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Ver detalles →
          </Badge>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricas.map((metrica, index) => {
          const Icono = metrica.icono;
          return (
            <Card
              key={index}
              className={cn(
                "transition-all hover:shadow-md",
                metrica.alerta && "border-l-4 border-l-red-500"
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metrica.titulo}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", metrica.bgColor)}>
                  <Icono className={cn("h-4 w-4", metrica.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold">{metrica.valor}</div>
                    {metrica.alerta && (
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrica.descripcion}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerta si hay ventas vencidas */}
      {vencimientos.ventasVencidas > 0 && (
        <div className="bg-destructive/10 dark:bg-red-900/20 border border-destructive/30 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">
                Atención: Ventas vencidas
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 dark:text-red-200 mt-1">
                Tienes {vencimientos.ventasVencidas} venta{vencimientos.ventasVencidas !== 1 ? "s" : ""} vencida{vencimientos.ventasVencidas !== 1 ? "s" : ""} con un monto total de{" "}
                {formatCurrency(vencimientos.montoVencido)}. Se recomienda hacer seguimiento a estos clientes.
              </p>
              <Link href="/dashboard/ventas/fiadas?filtro=vencidas">
                <Badge
                  variant="destructive"
                  className="mt-2 cursor-pointer hover:bg-red-700"
                >
                  Ver ventas vencidas
                </Badge>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de pagos parciales */}
      {estadosPago.ventasConPagoParcial > 0 && (
        <div className="bg-blue-500/10 dark:bg-blue-900/20 border border-blue-500/30 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {estadosPago.ventasConPagoParcial} venta{estadosPago.ventasConPagoParcial !== 1 ? "s" : ""} con pago parcial en proceso
            </p>
          </div>
        </div>
      )}
    </div>
  );
}