"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, TrendingDown, BarChart3, LineChart as LineChartIcon, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface VentasChartProps {
  data: Array<{
    fecha: string;
    total: number;
    cantidad: number;
  }>;
  tipo?: "area" | "bar" | "line";
  titulo?: string;
  descripcion?: string;
  mostrarCantidad?: boolean;
  onTipoChange?: (tipo: "area" | "bar" | "line") => void;
  loading?: boolean;
  totalPeriodo?: number;
  cambioAnterior?: number;
}

export function EnhancedVentasChart({
  data = [],
  tipo = "area",
  titulo = "Ventas por Día",
  descripcion = "Evolución de las ventas en los últimos días",
  mostrarCantidad = false,
  onTipoChange,
  loading = false,
  totalPeriodo = 0,
  cambioAnterior = 0,
}: VentasChartProps) {
  const { coloresActuales, isDark } = useTheme();

  // Extraer colores del tema actual para usar en el gráfico
  const primaryColor = isDark ? "#60a5fa" : "#3b82f6"; // blue-400 / blue-500
  const secondaryColor = isDark ? "#34d399" : "#10b981"; // emerald-400 / emerald-500
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Procesar y formatear datos
  const datosFormateados = useMemo(() => {
    return data.map((item) => ({
      ...item,
      fechaFormateada: format(parseISO(item.fecha), "dd MMM", { locale: es }),
      totalFormateado: new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(item.total),
    }));
  }, [data]);

  // Calcular estadísticas resumidas
  const estadisticas = useMemo(() => {
    if (!data.length) return { total: 0, promedio: 0, maximo: 0, tendencia: 0 };

    const total = data.reduce((acc, item) => acc + item.total, 0);
    const promedio = total / data.length;
    const maximo = Math.max(...data.map(item => item.total));

    // Calcular tendencia simple (últimos vs primeros días)
    const mitad = Math.floor(data.length / 2);
    const primeraM = data.slice(0, mitad).reduce((acc, item) => acc + item.total, 0) / mitad;
    const segundaM = data.slice(mitad).reduce((acc, item) => acc + item.total, 0) / (data.length - mitad);
    const tendencia = primeraM > 0 ? ((segundaM - primeraM) / primeraM) * 100 : 0;

    return { total, promedio, maximo, tendencia };
  }, [data]);

  // Componente de tooltip personalizado con theming
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn(
          "p-4 rounded-xl shadow-xl border backdrop-blur-xl",
          "bg-card",
          "border-border/50 dark:border-border/50"
        )}>
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {entry.dataKey === 'total' ? 'Ventas:' : 'Cantidad:'}
              </span>
              <span className="font-medium text-foreground">
                {entry.dataKey === 'total'
                  ? new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                    }).format(entry.value)
                  : entry.value
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizar gráfico según el tipo
  const renderChart = () => {
    const axisProps = {
      axisLine: false,
      tickLine: false,
      tick: {
        fontSize: 12,
        fill: isDark ? '#9ca3af' : '#6b7280',
        fontWeight: 500
      }
    };

    const gridProps = {
      strokeDasharray: "3 3",
      stroke: isDark ? '#374151' : '#f3f4f6',
      opacity: 0.5
    };

    switch (tipo) {
      case "bar":
        return (
          <BarChart data={datosFormateados}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="fechaFormateada" {...axisProps} />
            <YAxis
              {...axisProps}
              tickFormatter={(value) =>
                new Intl.NumberFormat('es-CO', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(value)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="total"
              fill={primaryColor}
              radius={[6, 6, 0, 0]}
              opacity={0.9}
            />
            {mostrarCantidad && (
              <Bar
                dataKey="cantidad"
                fill={secondaryColor}
                radius={[6, 6, 0, 0]}
                opacity={0.7}
              />
            )}
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={datosFormateados}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="fechaFormateada" {...axisProps} />
            <YAxis
              {...axisProps}
              tickFormatter={(value) =>
                new Intl.NumberFormat('es-CO', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(value)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="total"
              stroke={primaryColor}
              strokeWidth={3}
              dot={{ fill: primaryColor, strokeWidth: 0, r: 5 }}
              activeDot={{ r: 7, stroke: primaryColor, strokeWidth: 2, fill: 'white' }}
            />
            {mostrarCantidad && (
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke={secondaryColor}
                strokeWidth={2}
                dot={{ fill: secondaryColor, strokeWidth: 0, r: 4 }}
              />
            )}
          </LineChart>
        );

      default: // area
        return (
          <AreaChart data={datosFormateados}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="fechaFormateada" {...axisProps} />
            <YAxis
              {...axisProps}
              tickFormatter={(value) =>
                new Intl.NumberFormat('es-CO', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(value)
              }
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={primaryColor}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              strokeWidth={3}
            />
            {mostrarCantidad && (
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke={secondaryColor}
                fillOpacity={0.2}
                fill={secondaryColor}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-muted rounded animate-pulse w-32" />
              <div className="h-4 bg-muted rounded animate-pulse w-48" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!datosFormateados || datosFormateados.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">{titulo}</CardTitle>
          <CardDescription className="text-muted-foreground">{descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay datos suficientes</p>
            <p className="text-sm">Se necesitan al menos algunos datos de ventas para mostrar el gráfico</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-foreground flex items-center gap-2">
              {titulo}
              {estadisticas.tendencia !== 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    estadisticas.tendencia > 0
                      ? "text-green-600 dark:text-green-400 border-emerald-500/30 bg-emerald-500/10 dark:text-green-400 dark:border-green-800 dark:bg-green-950"
                      : "text-red-600 dark:text-red-400 border-destructive/30 bg-destructive/10 dark:text-red-400 dark:border-red-800 dark:bg-red-950"
                  )}
                >
                  {estadisticas.tendencia > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(estadisticas.tendencia).toFixed(1)}%
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {descripcion}
            </CardDescription>
          </div>

          {onTipoChange && (
            <div className="flex gap-1">
              <Button
                variant={tipo === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTipoChange("area")}
                className="p-2"
              >
                <Activity className="h-4 w-4" />
              </Button>
              <Button
                variant={tipo === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTipoChange("bar")}
                className="p-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={tipo === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTipoChange("line")}
                className="p-2"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Estadísticas resumidas */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border dark:border-border/50 dark:border-border/50">
          <div className="grid grid-cols-3 gap-4 text-center flex-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="font-semibold text-foreground">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  notation: 'compact',
                  compactDisplay: 'short'
                }).format(estadisticas.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Promedio</p>
              <p className="font-semibold text-foreground">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  notation: 'compact',
                  compactDisplay: 'short'
                }).format(estadisticas.promedio)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Máximo</p>
              <p className="font-semibold text-foreground">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  notation: 'compact',
                  compactDisplay: 'short'
                }).format(estadisticas.maximo)}
              </p>
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 text-sm ml-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }}></div>
              <span className="text-muted-foreground">Ventas ($)</span>
            </div>
            {mostrarCantidad && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor }}></div>
                <span className="text-muted-foreground">Cantidad</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
