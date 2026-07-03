"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EstacionPreparacionRestaurante } from "@/lib/prisma-types";
import {
  ChefHat, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  Timer, Flame, Bell, Package, Send,
} from "lucide-react";
import { useRestaurante } from "@/components/restaurante/context/RestauranteContext";
import { Button } from "@/components/ui/button";
import { getEstacionPreparacionLabel } from "@/lib/restaurante-shared";
import type { RestaurantePreparacionItem } from "@/types/restaurante";

const AUTO_REFRESH_MS = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMin(fecha: string) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000);
}
function tiempoStr(fecha: string) {
  const seg = Math.floor((Date.now() - new Date(fecha).getTime()) / 1000);
  if (seg < 60) return `${seg}s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}
function isNuevo(fecha: string) {
  return (Date.now() - new Date(fecha).getTime()) < 45_000;
}

// ─── Timer vivo ───────────────────────────────────────────────────────────────

function LiveTimer({ fecha }: { fecha: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const min = getMin(fecha);
  const cls = min >= 15
    ? "bg-red-500 text-white animate-pulse"
    : min >= 8
    ? "bg-amber-500 text-white"
    : "bg-emerald-600 text-white";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black tabular-nums ${cls}`}>
      <Timer className="h-3 w-3" />
      {tiempoStr(fecha)}
    </span>
  );
}

// ─── Anillo regresivo ─────────────────────────────────────────────────────────

function CountdownRing({ remaining, total }: { remaining: number; total: number }) {
  const r = 16, circ = 2 * Math.PI * r;
  return (
    <div className="relative h-10 w-10 flex-shrink-0 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-background/20" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="2"
          strokeDasharray={circ} strokeDashoffset={circ - (remaining / total) * circ}
          className="text-background/70 transition-all duration-1000 ease-linear" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-bold text-background/80 tabular-nums">{remaining}s</span>
    </div>
  );
}

// ─── Card de ítem — estilo por estado ────────────────────────────────────────

const STATE_CONFIG = {
  PENDIENTE: {
    bar: "bg-orange-500",
    ring: "ring-orange-500/30",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",
    label: "NUEVO PEDIDO",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  EN_PREPARACION: {
    bar: "bg-amber-500",
    ring: "ring-amber-500/20",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    label: "EN PREPARACIÓN",
    icon: <Flame className="h-3.5 w-3.5" />,
  },
  LISTO: {
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/25",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
    label: "LISTO ✓",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ENTREGADO: {
    bar: "bg-slate-400",
    ring: "",
    badge: "bg-slate-100 text-slate-600",
    label: "ENTREGADO",
    icon: <Send className="h-3.5 w-3.5" />,
  },
};

function ItemCard({ item, nuevo }: { item: RestaurantePreparacionItem; nuevo: boolean }) {
  const { actualizarPreparacion, actualizandoPreparacionId } = useRestaurante();
  const loading = actualizandoPreparacionId === item.id;
  const cfg = STATE_CONFIG[item.estadoPreparacion as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.PENDIENTE;
  const min = getMin(item.fechaSolicitud);

  return (
    <div className={`relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm ring-2 ${cfg.ring} ${nuevo ? "animate-in slide-in-from-top-4 fade-in duration-500" : ""} ${min >= 15 ? "ring-red-500/40" : ""}`}>
      {/* Barra de estado en la parte superior */}
      <div className={`${cfg.bar} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest">
          {cfg.icon}
          {cfg.label}
          {nuevo && (
            <span className="ml-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-black animate-pulse">
              ¡NUEVO!
            </span>
          )}
        </div>
        <LiveTimer fecha={item.fechaSolicitud} />
      </div>

      <div className="p-4 space-y-3">
        {/* Producto */}
        <div>
          <p className="text-2xl font-black text-foreground leading-tight">
            {item.cantidad}× {item.nombreProducto}
          </p>
          <p className="text-sm text-muted-foreground font-semibold mt-0.5">
            {item.mesas.join(" + ")}
            {item.nombreCuenta ? ` · ${item.nombreCuenta}` : ""}
            {item.cliente ? ` · ${item.cliente}` : ""}
          </p>
        </div>

        {/* Nota especial */}
        {item.notas && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{item.notas}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 pt-1">
          {item.estadoPreparacion === "PENDIENTE" && (
            <>
              <Button size="lg" className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                disabled={loading} onClick={() => actualizarPreparacion(item, "EN_PREPARACION")}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Flame className="mr-2 h-5 w-5" />}
                Preparando
              </Button>
              <Button size="lg" className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={loading} onClick={() => actualizarPreparacion(item, "LISTO")}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Listo
              </Button>
            </>
          )}
          {item.estadoPreparacion === "EN_PREPARACION" && (
            <Button size="lg" className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg"
              disabled={loading} onClick={() => actualizarPreparacion(item, "LISTO")}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
              ✓ Marcar Listo
            </Button>
          )}
          {item.estadoPreparacion === "LISTO" && (
            <Button size="lg" className="flex-1 h-12 bg-foreground hover:bg-foreground/90 text-background font-bold"
              disabled={loading} onClick={() => actualizarPreparacion(item, "ENTREGADO")}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
              Entregado al mesero
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Columna kanban ───────────────────────────────────────────────────────────

function KanbanCol({
  titulo, colorHeader, items, nuevosIds, emptyMsg,
}: {
  titulo: string;
  colorHeader: string;
  items: RestaurantePreparacionItem[];
  nuevosIds: Set<string>;
  emptyMsg: string;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className={`rounded-2xl ${colorHeader} px-4 py-3 flex items-center justify-between`}>
        <span className="font-black text-white text-sm uppercase tracking-widest">{titulo}</span>
        {items.length > 0 && (
          <span className="rounded-full bg-white/20 text-white font-black text-sm px-2.5 py-0.5">
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <ItemCard key={item.id} item={item} nuevo={nuevosIds.has(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vista principal KDS ──────────────────────────────────────────────────────

export function CocinaView() {
  const { preparacionItems, recargarOperativo, recargandoVista } = useRestaurante();
  const [ultimaAct, setUltimaAct] = useState(new Date());
  const [segundos, setSegundos] = useState(AUTO_REFRESH_MS / 1000);
  const [estacion, setEstacion] = useState<EstacionPreparacionRestaurante>("COCINA" as EstacionPreparacionRestaurante);
  const [nuevosIds, setNuevosIds] = useState<Set<string>>(new Set());
  const [alertaNueva, setAlertaNueva] = useState<{ count: number; timestamp: number } | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const estaciones: EstacionPreparacionRestaurante[] = [
    "COCINA" as EstacionPreparacionRestaurante,
    "GENERAL" as EstacionPreparacionRestaurante,
  ];

  // Detectar pedidos nuevos
  useEffect(() => {
    const currentIds = new Set(preparacionItems.map(i => i.id));
    const appeared = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIdsRef.current.has(id)) appeared.add(id);
    });
    if (appeared.size > 0) {
      setNuevosIds(appeared);
      setAlertaNueva({ count: appeared.size, timestamp: Date.now() });
      // Quitar el badge "NUEVO" después de 45s
      setTimeout(() => setNuevosIds(new Set()), 45_000);
      // Quitar alerta flotante después de 6s
      setTimeout(() => setAlertaNueva(null), 6_000);
    }
    prevIdsRef.current = currentIds;
  }, [preparacionItems]);

  const handleRefresh = useCallback(async () => {
    await recargarOperativo();
    setUltimaAct(new Date());
    setSegundos(AUTO_REFRESH_MS / 1000);
  }, [recargarOperativo]);

  useEffect(() => {
    const id = setInterval(async () => {
      await recargarOperativo();
      setUltimaAct(new Date());
      setSegundos(AUTO_REFRESH_MS / 1000);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [recargarOperativo]);

  useEffect(() => {
    const id = setInterval(() => setSegundos(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const itemsEstacion = preparacionItems.filter(i => i.estacion === estacion);
  const pendientes = itemsEstacion.filter(i => i.estadoPreparacion === "PENDIENTE")
    .sort((a, b) => new Date(a.fechaSolicitud).getTime() - new Date(b.fechaSolicitud).getTime());
  const enPrep = itemsEstacion.filter(i => i.estadoPreparacion === "EN_PREPARACION")
    .sort((a, b) => new Date(a.fechaSolicitud).getTime() - new Date(b.fechaSolicitud).getTime());
  const listos = itemsEstacion.filter(i => i.estadoPreparacion === "LISTO")
    .sort((a, b) => new Date(a.fechaSolicitud).getTime() - new Date(b.fechaSolicitud).getTime());

  const totalActivos = itemsEstacion.filter(i => i.estadoPreparacion !== "ENTREGADO").length;

  return (
    <div className="space-y-5">

      {/* Alerta flotante de nuevo pedido */}
      {alertaNueva && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 rounded-2xl bg-orange-500 px-6 py-4 shadow-2xl shadow-orange-500/40 text-white">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Bell className="h-6 w-6 animate-bounce" />
            </div>
            <div>
              <p className="font-black text-lg leading-none">
                ¡{alertaNueva.count === 1 ? "Nuevo pedido" : `${alertaNueva.count} nuevos pedidos`}!
              </p>
              <p className="text-sm opacity-80 mt-0.5">Ha llegado una nueva comanda a cocina</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header KDS ───────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] bg-foreground text-background p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-orange-500 p-3 shadow-md shadow-orange-500/30">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Pantalla de Cocina</h1>
              <p className="text-sm opacity-60 mt-0.5">
                {totalActivos > 0 ? (
                  <><span className="font-bold text-orange-400">{totalActivos}</span>{" "}
                  orden{totalActivos !== 1 ? "es" : ""} activa{totalActivos !== 1 ? "s" : ""}</>
                ) : "Sin órdenes pendientes · Todo al día ✓"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] opacity-40 uppercase tracking-wider">Actualizado</p>
              <p className="text-sm font-semibold opacity-80">
                {ultimaAct.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
            <CountdownRing remaining={segundos} total={AUTO_REFRESH_MS / 1000} />
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={recargandoVista}
              className="bg-background/10 text-background hover:bg-background/20 border-background/20">
              {recargandoVista ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refrescar
            </Button>
          </div>
        </div>

        {/* Tabs de estación */}
        <div className="mt-5 flex gap-2">
          {estaciones.map(est => {
            const cnt = preparacionItems.filter(i => i.estacion === est && i.estadoPreparacion !== "ENTREGADO").length;
            const active = est === estacion;
            return (
              <button key={est} type="button" onClick={() => setEstacion(est)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active ? "bg-background text-foreground shadow-sm" : "bg-background/10 text-background/60 hover:bg-background/20"
                }`}>
                {getEstacionPreparacionLabel(est)}
                {cnt > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-black ${active ? "bg-orange-500 text-white" : "bg-background/20 text-background"}`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Leyenda de estados ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 px-1">
        {[
          { color: "bg-orange-500", label: "Nuevo pedido" },
          { color: "bg-amber-500",  label: "En preparación" },
          { color: "bg-emerald-600", label: "Listo para entregar" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            {s.label}
          </div>
        ))}
      </div>

      {/* ── Kanban 3 columnas ─────────────────────────────────────────────────── */}
      {totalActivos === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500/30 mb-4" />
          <p className="text-xl font-bold text-foreground/60">¡Todo al día!</p>
          <p className="mt-2 text-sm text-muted-foreground">No hay órdenes activas en esta estación.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <KanbanCol
            titulo="Nuevos pedidos"
            colorHeader="bg-orange-500"
            items={pendientes}
            nuevosIds={nuevosIds}
            emptyMsg="Sin pedidos nuevos"
          />
          <KanbanCol
            titulo="En preparación"
            colorHeader="bg-amber-500"
            items={enPrep}
            nuevosIds={nuevosIds}
            emptyMsg="Nada en preparación"
          />
          <KanbanCol
            titulo="Listos para entregar"
            colorHeader="bg-emerald-600"
            items={listos}
            nuevosIds={nuevosIds}
            emptyMsg="Ninguno listo aún"
          />
        </div>
      )}
    </div>
  );
}