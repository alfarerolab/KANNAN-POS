"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  ClipboardList,
  TrendingUp,
  RefreshCw,
  Wine,
  ShoppingCart,
  CreditCard,
} from "lucide-react";

import { useBarContext } from "@/components/bar/context/BarContext";
import { Button } from "@/components/ui/button";
import { ModalGestorVentas } from "./ModalGestorVentas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTO_REFRESH_INTERVAL = 15_000;

import { formatCurrency } from "../components/utils";

// ─── Caja: Grid de Mesas ─────────────────────────────────────────────────────

import { GridMesas } from "../components/GridMesas";

// ─── Caja: Detalle editable de la cuenta seleccionada ─────────────────────────

import { DetalleCuentaMesa } from "../components/DetalleCuentaMesa";

import { PanelCobro } from "../components/PanelCobro";

// ─── Caja: Resumen del día ────────────────────────────────────────────────────

import { ResumenDia } from "../components/ResumenDia";

import { CajaAccionesPrincipales } from "../components/CajaAccionesPrincipales";
import { BannerTurno } from "../components/BannerTurno";

// ─── Vista Caja ──────────────────────────────────────────────────────────────

// ─── BarraCajaView Premium ────────────────────────────────────────────────────

const REFRESH_INTERVAL = 15_000;

function CountdownRingBar({ remaining, total }: { remaining: number; total: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const dash = (remaining / total) * circ;
  return (
    <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-background/20" />
        <circle cx="16" cy="16" r={r} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={circ} strokeDashoffset={circ - dash} className="text-background/70 transition-all duration-1000 ease-linear" strokeLinecap="round" />
      </svg>
      <span className="text-[9px] font-bold text-background/80 tabular-nums">{remaining}s</span>
    </div>
  );
}

export function BarraCajaView() {
  const {
    recargarOperativo,
    recargandoVista,
    ventasModalModo,
    ventasModalOpen,
    setVentasModalOpen,
    mesas,
    reporte,
    cuentasAbiertas,
  } = useBarContext();

  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());
  const [segundos, setSegundos] = useState(REFRESH_INTERVAL / 1000);

  const handleRefresh = useCallback(async () => {
    await recargarOperativo();
    setUltimaActualizacion(new Date());
    setSegundos(REFRESH_INTERVAL / 1000);
  }, [recargarOperativo]);

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(async () => {
      await recargarOperativo();
      setUltimaActualizacion(new Date());
      setSegundos(REFRESH_INTERVAL / 1000);
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [recargarOperativo]);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // KPI rápidos
  const mesasOcupadas = mesas.filter((m) => m.estado === "OCUPADA" && m.activa).length;
  const totalCuentas = mesasOcupadas + (cuentasAbiertas?.length || 0);

  return (
    <div className="space-y-5">

      {/* ── Header premium oscuro ─────────────────────────────────────────── */}
      <div className="rounded-[24px] bg-foreground text-background p-5 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Título */}
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-violet-500 p-3 shadow-md shadow-violet-500/30">
              <Wine className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Barra &amp; Caja</h1>
              <p className="text-sm opacity-60 mt-0.5">
                {totalCuentas > 0 ? (
                  <><span className="font-bold text-violet-400">{totalCuentas}</span> cuenta{totalCuentas !== 1 ? "s" : ""} activa{totalCuentas !== 1 ? "s" : ""}</>
                ) : (
                  "Sin cuentas abiertas · Listo para operar"
                )}
              </p>
            </div>
          </div>

          {/* Controles derecha */}
          <div className="flex items-center gap-3">
            {/* Métricas rápidas */}
            <div className="hidden md:flex items-center gap-3 mr-2">
              <div className="text-center">
                <p className="text-lg font-black tabular-nums text-violet-400">{mesasOcupadas}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-40">Mesas</p>
              </div>
              <div className="h-8 w-px bg-background/20" />
              <div className="text-center">
                <p className="text-lg font-black tabular-nums text-emerald-400">
                  {formatCurrency(reporte?.ventasHoy.total || 0)}
                </p>
                <p className="text-[10px] uppercase tracking-widest opacity-40">Ventas hoy</p>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-[11px] opacity-40 uppercase tracking-wider">Actualizado</p>
              <p className="text-sm font-semibold opacity-80">
                {ultimaActualizacion.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
            <CountdownRingBar remaining={segundos} total={REFRESH_INTERVAL / 1000} />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={recargandoVista}
              className="bg-background/10 text-background hover:bg-background/20 border-background/20"
            >
              {recargandoVista ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refrescar
            </Button>
          </div>
        </div>
      </div>

      {/* Banner de turno */}
      <BannerTurno />

      {/* ── Grid de mesas ─────────────────────────────────────────────────── */}
      <div className="rounded-[20px] border border-border bg-card dark:bg-background overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold text-foreground">Mesas activas</h3>
          </div>
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            {mesas.filter(m => m.activa && !m.id.startsWith("synthetic-")).length} mesas
          </span>
        </div>
        <div className="p-4">
          <GridMesas />
        </div>
      </div>

      {/* ── Acciones + detalle + cobro ────────────────────────────────────── */}
      <div className="space-y-4">
        <CajaAccionesPrincipales />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_300px]">

          {/* Col 1: Resumen del día */}
          <div className="rounded-[20px] border border-border bg-card dark:bg-background overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <TrendingUp className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-bold text-foreground">Resumen del día</h3>
            </div>
            <div className="p-4">
              <ResumenDia />
            </div>
          </div>

          {/* Col 2: Detalle cuenta */}
          <div className="rounded-[20px] border border-border bg-card dark:bg-background overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <ShoppingCart className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-bold text-foreground">Detalle de la cuenta</h3>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <DetalleCuentaMesa />
            </div>
          </div>

          {/* Col 3: Cobro */}
          <div className="rounded-[20px] border border-border bg-card dark:bg-background overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <CreditCard className="h-4 w-4 text-violet-500" />
              <h3 className="text-sm font-bold text-foreground">Cobrar</h3>
            </div>
            <div className="p-4">
              <PanelCobro />
            </div>
          </div>
        </div>
      </div>

      <ModalGestorVentas
        modo={ventasModalModo}
        isOpen={ventasModalOpen}
        onClose={() => setVentasModalOpen(false)}
      />
    </div>
  );
}