"use client";

import { useEffect, useState } from "react";
import { EstacionPreparacionRestaurante } from "@/lib/prisma-types";
import { ChefHat, Clock, RefreshCw, Loader2, Wine } from "lucide-react";

import { useBarContext } from "@/components/bar/context/BarContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ESTACIONES_PREPARACION,
  getEstacionPreparacionLabel,
  getEstadoPreparacionLabel,
  getEstadoPreparacionTone,
} from "@/lib/restaurante-shared";
import type { RestaurantePreparacionItem } from "@/types/restaurante";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTO_REFRESH_INTERVAL = 15_000; // 15 segundos

function tiempoTranscurrido(fechaSolicitud: string): string {
  const segundos = Math.floor((Date.now() - new Date(fechaSolicitud).getTime()) / 1000);
  if (segundos < 60) return `${segundos}s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `${minutos}m`;
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
}

function getTimerColor(fechaSolicitud: string): string {
  const minutos = Math.floor(
    (Date.now() - new Date(fechaSolicitud).getTime()) / 60_000
  );
  if (minutos >= 15) return "text-red-600 bg-red-50";
  if (minutos >= 8) return "text-amber-600 bg-amber-50";
  return "text-emerald-600 bg-emerald-50";
}

// ─── Tarjeta de Item de Cocina ────────────────────────────────────────────────

function ItemCocinaCard({ item }: { item: RestaurantePreparacionItem }) {
  const { actualizarPreparacion, actualizandoPreparacionId } = useBarContext();
  const [, setTick] = useState(0);

  // Re-render cada minuto para actualizar el timer
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const cargando = actualizandoPreparacionId === item.id;
  const timerClass = getTimerColor(item.fechaSolicitud);

  return (
    <div
      className={`rounded-xl sm:rounded-2xl border-2 bg-white p-3 sm:p-5 transition-all ${
        item.estadoPreparacion === "EN_PREPARACION"
          ? "border-amber-300"
          : item.estadoPreparacion === "LISTO"
          ? "border-emerald-400 bg-emerald-50/40"
          : "border-slate-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-base sm:text-xl font-bold text-slate-900 leading-tight">
            {item.cantidad}× {item.nombreProducto}
          </p>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 truncate">
            Mesa {item.mesas.join(" + ")}
            {item.nombreCuenta ? ` · ${item.nombreCuenta}` : ""}
            {item.cliente ? ` · ${item.cliente}` : ""}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold ${timerClass} shrink-0`}>
          <Clock className="h-4 w-4" />
          {tiempoTranscurrido(item.fechaSolicitud)}
        </span>
      </div>

      {/* Notas */}
      {item.notas ? (
        <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-amber-800">
          ⚠️ {item.notas}
        </div>
      ) : null}

      {/* Estado */}
      <div className="mb-3 sm:mb-4">
        <Badge className={`${getEstadoPreparacionTone(item.estadoPreparacion)} text-sm px-3 py-1`}>
          {getEstadoPreparacionLabel(item.estadoPreparacion)}
        </Badge>
      </div>

      {/* Botones de acción — grandes para uso en cocina */}
      <div className="flex flex-wrap gap-2">
        {item.estadoPreparacion !== "LISTO" && (
          <Button
            size="lg"
            variant="outline"
            className="flex-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
            disabled={cargando}
            onClick={() => actualizarPreparacion(item, "LISTO")}
          >
            {cargando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            ✓ Listo
          </Button>
        )}
        {item.estadoPreparacion !== "ENTREGADO" && (
          <Button
            size="lg"
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            disabled={cargando}
            onClick={() => actualizarPreparacion(item, "ENTREGADO")}
          >
            {cargando ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Entregado
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Panel por Estación ───────────────────────────────────────────────────────

function PanelEstacion({
  estacion,
  items,
}: {
  estacion: EstacionPreparacionRestaurante;
  items: RestaurantePreparacionItem[];
}) {
  const itemsActivos = items.filter(
    (item) =>
      item.estacion === estacion &&
      item.estadoPreparacion !== "ENTREGADO"
  );

  return (
    <div className="space-y-4">
      {/* Contador */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-700">
          {getEstacionPreparacionLabel(estacion)}
        </h2>
        <Badge
          variant={itemsActivos.length > 0 ? "default" : "secondary"}
          className={itemsActivos.length > 0 ? "bg-orange-600" : ""}
        >
          {itemsActivos.length} pendiente{itemsActivos.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {itemsActivos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          Sin órdenes activas en {getEstacionPreparacionLabel(estacion).toLowerCase()}
        </div>
      ) : (
        <div className="space-y-3">
          {itemsActivos.map((item) => (
            <ItemCocinaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista Barra ─────────────────────────────────────────────────────────────

export function BarraView() {
  const { preparacionItems, recargarOperativo, recargandoVista, modo } = useBarContext();
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  // Estaciones visibles según el modo
  const estacionesVisibles: EstacionPreparacionRestaurante[] =
    modo === "bar"
      ? ["BARRA" as EstacionPreparacionRestaurante, "GENERAL" as EstacionPreparacionRestaurante]
      : ["COCINA" as EstacionPreparacionRestaurante, "GENERAL" as EstacionPreparacionRestaurante];

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    const interval = setInterval(async () => {
      await recargarOperativo();
      setUltimaActualizacion(new Date());
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [recargarOperativo]);

  

  const handleRefresh = async () => {
    await recargarOperativo();
    setUltimaActualizacion(new Date());
  };

  const totalPendientes = preparacionItems.filter(
    (item) =>
      estacionesVisibles.includes(item.estacion as EstacionPreparacionRestaurante) &&
      item.estadoPreparacion !== "ENTREGADO"
  ).length;

  const esBar = false;
  const HeaderIcon = ChefHat;
  const headerTitle = "Pantalla de Barra";
  const headerBgAccent = "bg-violet-600";

  return (
    <div className="space-y-6">
      {/* Header KDS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl sm:rounded-2xl border border-violet-100 bg-primary text-primary-foreground p-3 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg sm:rounded-xl ${headerBgAccent} p-1.5 sm:p-2`}>
            <HeaderIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold">{headerTitle}</h1>
            <p className="text-xs sm:text-sm opacity-70">
              {totalPendientes} orden{totalPendientes !== 1 ? "es" : ""} pendiente
              {totalPendientes !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-xs opacity-80 hidden sm:block">
            Actualizado: {ultimaActualizacion.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            {" · "}Auto cada 15s
          </p>
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={recargandoVista}>
            {recargandoVista ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refrescar
          </Button>
        </div>
      </div>

      {/* Columnas por estación */}
      <div className={`grid gap-4 sm:gap-6 ${estacionesVisibles.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {estacionesVisibles.map((estacion) => (
          <PanelEstacion key={estacion} estacion={estacion} items={preparacionItems} />
        ))}
      </div>
    </div>
  );
}
