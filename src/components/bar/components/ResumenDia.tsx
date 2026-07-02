"use client";

import { TrendingUp } from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { formatCurrency } from "./utils";

export function ResumenDia() {
  const { reporte, turnoActivo } = useBarContext();
 
  const metricas = [
    {
      label: turnoActivo ? "Ventas del turno" : "Ventas de hoy",
      value: formatCurrency(reporte?.ventasHoy.total || 0),
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(reporte?.ventasHoy.ticketPromedio || 0),
    },
    {
      label: "Pedidos abiertos",
      value: String(reporte?.pedidosAbiertos || 0),
    },
    {
      label: "Listos por entregar",
      value: String(reporte?.preparacion.listos || 0),
    },
  ];
 
  return (
    <div className="space-y-3">
      {/* Indicador de período */}
      {turnoActivo && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            Turno activo desde{" "}
            {new Date(turnoActivo.abiertaEn).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
 
      <div className="grid grid-cols-2 gap-2">
        {metricas.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-muted/50 border border-border p-3">
            <p className="text-[11px] text-muted-foreground/70 mb-1">{label}</p>
            <p className="text-base font-semibold text-foreground leading-none">{value}</p>
          </div>
        ))}
      </div>
 
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-3 py-2.5 bg-muted/50 border-b border-border flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/70" />
          <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
            Top productos {turnoActivo ? "del turno" : "del día"}
          </p>
        </div>
        <div className="bg-card dark:bg-background divide-y divide-border">
          {reporte?.topProductos.length ? (
            reporte.topProductos.map((p) => (
              <div key={p.productoId} className="flex justify-between items-center px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.nombreProducto}</p>
                  <p className="text-[11px] text-muted-foreground/70">{p.cantidad} uds</p>
                </div>
                <p className="text-sm font-semibold text-foreground/80">{formatCurrency(p.total)}</p>
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground/70 text-center">
              Aún no hay ventas facturadas {turnoActivo ? "en este turno" : "hoy"}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
