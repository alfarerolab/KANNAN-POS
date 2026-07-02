"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Package,
  ArrowUp,
  DollarSign,
  BarChart3,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Boxes,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MovimientoInventario {
  id: string;
  fechaMovimiento: string;
  productoId: string;
  cantidad: number;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  producto: { id: string; nombre: string; sku?: string };
}

interface ProductoCatalogo {
  id: string;
  nombre: string;
  precio: number;
  precioCosto: number;
}

interface ResumenProducto {
  productoId: string;
  nombre: string;
  sku?: string;
  unidadesAgregadas: number;
  movimientosPorDia: Array<{ fecha: string; cantidad: number }>;
  valorInvertido: number;
  precioCosto: number;
  unidadesVendidas: number;
  dineroVendido: number;
  precioVenta: number;
}

interface Props {
  fechaInicio?: Date;
  fechaFin?: Date;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function InventarioPorPeriodo({ fechaInicio, fechaFin }: Props) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    setCargando(true);
    try {
      const url = new URL("/api/inventario/movimientos", window.location.origin);
      url.searchParams.append("fechaInicio", isoDate(fechaInicio));
      url.searchParams.append("fechaFin", isoDate(fechaFin));

      const [resMovimientos, resProductos] = await Promise.all([
        fetch(url.toString(), { cache: "no-store" }),
        // Sin ?inventario=true → respuesta normal que SÍ incluye precioCosto
        fetch("/api/productos?limite=500&activo=true", { cache: "no-store" }),
      ]);

      if (resMovimientos.ok) {
        const data = await resMovimientos.json();
        setMovimientos(Array.isArray(data.movimientos) ? data.movimientos : []);
      }
      if (resProductos.ok) {
        const data = await resProductos.json();
        const lista: any[] = data.datos || [];
        setProductos(
          lista.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            precio: Number(p.precio ?? 0),
            precioCosto: Number(p.precioCosto ?? 0), // campo real de la API normal
          }))
        );
      }
    } catch (e) {
      console.error("Error cargando inventario por período:", e);
    } finally {
      setCargando(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Resumen por producto ──────────────────────────────────────────────────
  const resumenPorProducto: ResumenProducto[] = (() => {
    const mapa: Record<string, ResumenProducto> = {};

    for (const mov of movimientos) {
      const pid = mov.productoId;
      const prod = productos.find((p) => p.id === pid);
      const precioVenta = prod?.precio ?? 0;
      const precioCosto = prod?.precioCosto ?? 0;

      if (!mapa[pid]) {
        mapa[pid] = {
          productoId: pid,
          nombre: mov.producto.nombre,
          sku: mov.producto.sku,
          unidadesAgregadas: 0,
          movimientosPorDia: [],
          valorInvertido: 0,
          precioCosto,
          unidadesVendidas: 0,
          dineroVendido: 0,
          precioVenta,
        };
      }

      const entry = mapa[pid];
      const fecha = isoDate(new Date(mov.fechaMovimiento));

      if (mov.tipo === "ENTRADA") {
        const cant = Math.abs(mov.cantidad);
        entry.unidadesAgregadas += cant;
        const dia = entry.movimientosPorDia.find((d) => d.fecha === fecha);
        if (dia) dia.cantidad += cant;
        else entry.movimientosPorDia.push({ fecha, cantidad: cant });
      }
      if (mov.tipo === "SALIDA") {
        entry.unidadesVendidas += Math.abs(mov.cantidad);
      }
    }

    // Calcular totales en dinero con el precio final correcto
    for (const entry of Object.values(mapa)) {
      const prod = productos.find((p) => p.id === entry.productoId);
      const pc = prod?.precioCosto ?? entry.precioCosto;
      const pv = prod?.precio ?? entry.precioVenta;
      entry.precioCosto = pc;
      entry.precioVenta = pv;
      entry.valorInvertido = entry.unidadesAgregadas * pc;
      entry.dineroVendido = entry.unidadesVendidas * pv;
    }

    return Object.values(mapa)
      .filter((r) => r.unidadesAgregadas > 0 || r.unidadesVendidas > 0)
      .sort((a, b) => b.unidadesAgregadas - a.unidadesAgregadas);
  })();

  const filtrados = resumenPorProducto.filter(
    (r) =>
      r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (r.sku ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalUnidades = filtrados.reduce((s, r) => s + r.unidadesAgregadas, 0);
  const totalInvertido = filtrados.reduce((s, r) => s + r.valorInvertido, 0);
  const totalVendido = filtrados.reduce((s, r) => s + r.dineroVendido, 0);
  const totalUnidadesVendidas = filtrados.reduce((s, r) => s + r.unidadesVendidas, 0);

  if (!fechaInicio || !fechaFin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Selecciona un rango de fechas</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Usa los filtros de fecha para ver el análisis de inventario del período.
        </p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">Cargando análisis de inventario...</span>
      </div>
    );
  }

  if (resumenPorProducto.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">Sin movimientos en este período</p>
        <p className="text-sm text-muted-foreground">{formatDate(fechaInicio)} → {formatDate(fechaFin)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Período activo */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5 w-fit">
        <BarChart3 className="h-4 w-4 shrink-0" />
        <span>
          Período: <strong className="text-foreground">{formatDate(fechaInicio)}</strong>
          {" → "}
          <strong className="text-foreground">{formatDate(fechaFin)}</strong>
        </span>
      </div>

      {/* Tarjetas resumen — 2 cols móvil / 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="pt-4 pb-3 px-3 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Stock agregado</span>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">{totalUnidades.toLocaleString("es-CO")}</p>
            <p className="text-xs text-muted-foreground mt-1">unidades ingresadas</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="pt-4 pb-3 px-3 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Boxes className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Invertido</span>
            </div>
            <p className="text-base font-bold text-foreground leading-none break-all">{formatCurrency(totalInvertido)}</p>
            <p className="text-xs text-muted-foreground mt-1">costo del stock</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="pt-4 pb-3 px-3 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Vendido</span>
            </div>
            <p className="text-2xl font-bold text-foreground leading-none">{totalUnidadesVendidas.toLocaleString("es-CO")}</p>
            <p className="text-xs text-muted-foreground mt-1">unidades vendidas</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="pt-4 pb-3 px-3 md:px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">Ingresos</span>
            </div>
            <p className="text-base font-bold text-foreground leading-none break-all">{formatCurrency(totalVendido)}</p>
            <p className="text-xs text-muted-foreground mt-1">dinero vendido</p>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto o SKU..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-10 h-10"
        />
      </div>

      {/* Lista */}
      <Card className="border border-border bg-card shadow-sm overflow-hidden">

        {/* Cabecera — solo desktop */}
        <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_120px_120px_32px] gap-x-3 items-center px-5 py-3 bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Producto</span>
          <span className="text-right">Uds. agregadas</span>
          <span className="text-right">Invertido</span>
          <span className="text-right">Uds. vendidas</span>
          <span className="text-right">Dinero vendido</span>
          <span />
        </div>

        <div className="divide-y divide-border">
          {filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron productos con esos criterios
            </div>
          ) : (
            filtrados.map((r) => {
              const isOpen = expandido === r.productoId;
              const tieneDetalle = r.movimientosPorDia.length > 0;

              return (
                <div key={r.productoId}>
                  <button
                    type="button"
                    onClick={() => tieneDetalle && setExpandido(isOpen ? null : r.productoId)}
                    className={`w-full text-left transition-colors ${tieneDetalle ? "hover:bg-muted/30" : "cursor-default"}`}
                  >
                    {/* DESKTOP */}
                    <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_120px_120px_32px] gap-x-3 items-center px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{r.nombre}</p>
                          {r.sku && <p className="text-[11px] text-muted-foreground">SKU: {r.sku}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{r.unidadesAgregadas}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {r.precioCosto > 0 ? `@ ${formatCurrency(r.precioCosto)} c/u` : "sin costo reg."}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {r.valorInvertido > 0 ? formatCurrency(r.valorInvertido) : "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {r.unidadesVendidas > 0 ? r.unidadesVendidas : "—"}
                        </span>
                        {r.unidadesVendidas > 0 && r.precioVenta > 0 && (
                          <p className="text-[11px] text-muted-foreground">@ {formatCurrency(r.precioVenta)} c/u</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                          {r.dineroVendido > 0 ? formatCurrency(r.dineroVendido) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-end">
                        {tieneDetalle && (isOpen
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* MÓVIL — tarjeta con grid 2x2 */}
                    <div className="md:hidden px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{r.nombre}</p>
                            {r.sku && <p className="text-[10px] text-muted-foreground">SKU: {r.sku}</p>}
                          </div>
                        </div>
                        {tieneDetalle && (isOpen
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">Stock agregado</p>
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{r.unidadesAgregadas}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.precioCosto > 0 ? `@ ${formatCurrency(r.precioCosto)}` : "sin costo"}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">Invertido</p>
                          <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                            {r.valorInvertido > 0 ? formatCurrency(r.valorInvertido) : "—"}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">Uds. vendidas</p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {r.unidadesVendidas > 0 ? r.unidadesVendidas : "—"}
                          </p>
                          {r.unidadesVendidas > 0 && r.precioVenta > 0 && (
                            <p className="text-[10px] text-muted-foreground">@ {formatCurrency(r.precioVenta)}</p>
                          )}
                        </div>
                        <div className="bg-muted/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">Dinero vendido</p>
                          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                            {r.dineroVendido > 0 ? formatCurrency(r.dineroVendido) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Detalle por día expandible */}
                  {isOpen && tieneDetalle && (
                    <div className="bg-muted/30 border-t border-border/50 px-4 md:px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Entradas por día
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {r.movimientosPorDia
                          .sort((a, b) => a.fecha.localeCompare(b.fecha))
                          .map((d) => (
                            <div key={d.fecha} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                              <span className="text-xs text-muted-foreground">{formatDate(new Date(d.fecha + "T12:00:00"))}</span>
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{d.cantidad} uds</span>
                              {r.precioCosto > 0 && (
                                <span className="text-xs text-muted-foreground">= {formatCurrency(d.cantidad * r.precioCosto)}</span>
                              )}
                            </div>
                          ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {r.valorInvertido > 0 && (
                          <span>Invertido: <strong className="text-amber-600 dark:text-amber-400">{formatCurrency(r.valorInvertido)}</strong></span>
                        )}
                        {r.dineroVendido > 0 && (
                          <span>Vendido: <strong className="text-violet-600 dark:text-violet-400">{formatCurrency(r.dineroVendido)}</strong></span>
                        )}
                        {r.valorInvertido > 0 && r.dineroVendido > 0 && (
                          <span>
                            Ganancia est.:{" "}
                            <strong className={r.dineroVendido >= r.valorInvertido ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                              {formatCurrency(r.dineroVendido - r.valorInvertido)}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Totales desktop */}
        {filtrados.length > 0 && (
          <div className="hidden md:grid md:grid-cols-[1fr_120px_120px_120px_120px_32px] gap-x-3 items-center px-5 py-3 bg-muted/60 border-t border-border text-sm font-semibold">
            <span className="text-muted-foreground">{filtrados.length} productos</span>
            <span className="text-right text-emerald-600 dark:text-emerald-400">+{totalUnidades}</span>
            <span className="text-right text-amber-600 dark:text-amber-400">{formatCurrency(totalInvertido)}</span>
            <span className="text-right text-blue-600 dark:text-blue-400">{totalUnidadesVendidas || "—"}</span>
            <span className="text-right text-violet-600 dark:text-violet-400">{totalVendido > 0 ? formatCurrency(totalVendido) : "—"}</span>
            <span />
          </div>
        )}

        {/* Totales móvil */}
        {filtrados.length > 0 && (
          <div className="md:hidden grid grid-cols-2 gap-2 p-4 bg-muted/60 border-t border-border">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Total invertido</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalInvertido)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">Total vendido</p>
              <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{totalVendido > 0 ? formatCurrency(totalVendido) : "—"}</p>
            </div>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        * Invertido = unidades agregadas × precio de costo. Si aparece — el producto no tiene precio de costo registrado.
      </p>
    </div>
  );
}