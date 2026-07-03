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
import { useTheme } from "@/hooks/use-theme";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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
}

export function VentasChart({
  data = [],
  tipo = "area",
  titulo = "Ventas por Día",
  descripcion = "Evolución de las ventas en los últimos días",
  mostrarCantidad = false,
}: VentasChartProps) {
  const { coloresActuales } = useTheme();

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

  // Componente de tooltip personalizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'total' ? 'Ventas: ' : 'Cantidad: '}
              {entry.dataKey === 'total'
                ? new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                  }).format(entry.value)
                : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizar gráfico según el tipo
  const renderChart = () => {
    const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

    switch (tipo) {
      case "bar":
        return (
          <BarChart data={datosFormateados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="fechaFormateada"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
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
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            {mostrarCantidad && (
              <Bar
                dataKey="cantidad"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
            )}
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={datosFormateados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="fechaFormateada"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
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
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
            {mostrarCantidad && (
              <Line
                type="monotone"
                dataKey="cantidad"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
              />
            )}
          </LineChart>
        );

      default: // area
        return (
          <AreaChart data={datosFormateados}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="fechaFormateada"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#666' }}
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
              stroke="#3b82f6"
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
            />
            {mostrarCantidad && (
              <Area
                type="monotone"
                dataKey="cantidad"
                stroke="#10b981"
                fillOpacity={0.3}
                fill="#10b981"
                strokeWidth={1}
              />
            )}
          </AreaChart>
        );
    }
  };

  if (!datosFormateados || datosFormateados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>No hay datos suficientes para mostrar el gráfico</p>
            <p className="text-sm">Se necesitan al menos algunos datos de ventas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Leyenda personalizada */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Ventas ($)</span>
          </div>
          {mostrarCantidad && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Cantidad</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
