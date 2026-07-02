"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Package,
  Pill,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  TrendingDown,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface AlertasFarmacia {
  totalProductosConVencimiento: number;
  totalLotes: number;
  vencidos: number;
  proximos7Dias: number;
  proximos30Dias: number;
  vigentes: number;
  stockBajo: number;
  productosStockBajoGeneral: number;
}

interface VencimientoItem {
  productoId: string;
  productoNombre: string;
  lote: string;
  fechaVencimiento: string;
  cantidad: number;
  estado: "vigente" | "proximo" | "vencido";
  diasRestantes: number;
  categoria: string;
}

export function FarmaciaModule() {
  const [alertas, setAlertas] = useState<AlertasFarmacia | null>(null);
  const [urgentes, setUrgentes] = useState<VencimientoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [recargando, setRecargando] = useState(false);

  const cargarDatos = async (isReload = false) => {
    try {
      if (isReload) setRecargando(true);
      else setCargando(true);

      const [alertasRes, vencRes] = await Promise.all([
        fetch("/api/farmacia/alertas"),
        fetch("/api/farmacia/vencimientos?filtro=todos&dias=15"),
      ]);

      if (alertasRes.ok) {
        const data = await alertasRes.json();
        setAlertas(data);
      }

      if (vencRes.ok) {
        const data = await vencRes.json();
        setUrgentes(data.datos?.slice(0, 8) || []);
      }
    } catch (error) {
      console.error("Error cargando datos de farmacia:", error);
    } finally {
      setCargando(false);
      setRecargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-400" />
          <p className="text-sm text-muted-foreground">Cargando módulo de farmacia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary text-primary-foreground text-primary-foreground shadow-lg">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Módulo Farmacia</h2>
            <p className="text-sm text-muted-foreground">Control de medicamentos, vencimientos y lotes</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => cargarDatos(true)}
          disabled={recargando}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${recargando ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Productos vencidos */}
        <Card className={`border-l-4 ${(alertas?.vencidos || 0) > 0 ? "border-l-red-500 bg-destructive/10/50 dark:bg-red-950/20" : "border-l-green-500 bg-emerald-500/10/50 dark:bg-green-950/20"}`}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              Vencidos
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {alertas?.vencidos || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {(alertas?.vencidos || 0) > 0
                ? "⚠️ Requieren retiro inmediato"
                : "✅ Sin productos vencidos"}
            </p>
          </CardContent>
        </Card>

        {/* Próximos a vencer (7 días) */}
        <Card className={`border-l-4 ${(alertas?.proximos7Dias || 0) > 0 ? "border-l-orange-500 bg-orange-500/10/50 dark:bg-orange-950/20" : "border-l-green-500 bg-emerald-500/10/50 dark:bg-green-950/20"}`}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
              Vencen en 7 días
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {alertas?.proximos7Dias || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Críticos — revisar prioridad de venta
            </p>
          </CardContent>
        </Card>

        {/* Próximos a vencer (30 días) */}
        <Card className="border-l-4 border-l-amber-500 bg-amber-500/10/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Vencen en 30 días
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {alertas?.proximos30Dias || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Monitoreo activo de rotación
            </p>
          </CardContent>
        </Card>

        {/* Stock bajo */}
        <Card className={`border-l-4 ${(alertas?.stockBajo || 0) > 0 ? "border-l-purple-500 bg-purple-500/10/50 dark:bg-purple-950/20" : "border-l-green-500 bg-emerald-500/10/50 dark:bg-green-950/20"}`}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <TrendingDown className="h-3.5 w-3.5 text-purple-500" />
              Stock Bajo
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {alertas?.stockBajo || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Productos por debajo del mínimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats generales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Productos con Vencimiento</CardDescription>
            <CardTitle className="text-2xl">{alertas?.totalProductosConVencimiento || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{alertas?.totalLotes || 0} lotes registrados en total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Productos Vigentes</CardDescription>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">{alertas?.vigentes || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Lotes en buen estado (más de 30 días)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa de Salud del Inventario</CardDescription>
            <CardTitle className="text-2xl">
              {alertas && alertas.totalLotes > 0
                ? `${Math.round((alertas.vigentes / alertas.totalLotes) * 100)}%`
                : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-muted dark:bg-muted rounded-full h-2.5">
              <div
                className="bg-primary text-primary-foreground h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: alertas && alertas.totalLotes > 0
                    ? `${Math.round((alertas.vigentes / alertas.totalLotes) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Urgentes */}
      {urgentes.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Alertas Urgentes
                </CardTitle>
                <CardDescription>Productos que vencen en los próximos 15 días o ya vencidos</CardDescription>
              </div>
              <Link href="/dashboard/farmacia/vencimientos">
                <Button variant="outline" size="sm" className="gap-2">
                  Ver todos <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentes.map((item, idx) => (
                <div
                  key={`${item.productoId}-${item.lote}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg ${
                      item.estado === "vencido" ? "bg-destructive/15 dark:bg-red-900/30" :
                      item.estado === "proximo" ? "bg-amber-500/15 dark:bg-amber-900/30" :
                      "bg-emerald-500/15 dark:bg-green-900/30"
                    }`}>
                      {item.estado === "vencido" ? (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : item.estado === "proximo" ? (
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.productoNombre}</p>
                      <p className="text-xs text-muted-foreground">
                        Lote: {item.lote} · Cant: {item.cantidad} · {item.categoria}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Badge
                      variant={item.estado === "vencido" ? "destructive" : "secondary"}
                      className={
                        item.estado === "proximo" ? "bg-amber-500/15 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" : ""
                      }
                    >
                      {item.estado === "vencido"
                        ? `Venció hace ${Math.abs(item.diasRestantes)} días`
                        : `${item.diasRestantes} días`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/farmacia/vencimientos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-emerald-500/30 dark:border-green-800">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-primary text-primary-foreground text-primary-foreground group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Control de Vencimientos</h3>
                <p className="text-sm text-muted-foreground">Tabla completa con filtros por estado y búsqueda</p>
              </div>
              <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/farmacia/lotes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group border-emerald-500/30 dark:border-green-800">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-primary text-primary-foreground text-primary-foreground group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Gestión de Lotes</h3>
                <p className="text-sm text-muted-foreground">Trazabilidad de lotes agrupados por producto</p>
              </div>
              <ArrowRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
