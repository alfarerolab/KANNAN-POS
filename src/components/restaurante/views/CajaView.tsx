"use client";

import { useState } from "react";
import {
  CreditCard,
  Loader2,
  Printer,
  Receipt,
  ClipboardList,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  PackageCheck,
  RefreshCw,
} from "lucide-react";

import {
  useRestaurante,
  METODOS_PAGO,
} from "@/components/restaurante/context/RestauranteContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getEstacionPreparacionLabel,
  getEstadoPreparacionLabel,
  getEstadoPreparacionTone,
} from "@/lib/restaurante-shared";
import type { MetodoPagoRestaurante } from "@/types/restaurante";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

function minutosAbierta(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000);
}

function labelTiempoAbierta(min: number): string {
  if (min < 60) return `${min} min abierta`;
  return `${Math.floor(min / 60)}h ${min % 60}m abierta`;
}

// ─── KPI Cards superiores ─────────────────────────────────────────────────────

function MetricasResumen() {
  const { reporte, mesas, recargarOperativo, recargandoVista } =
    useRestaurante();

  const cuentasAbiertas = mesas.filter(
    (m) => m.pedidoAbierto && m.estado === "OCUPADA"
  ).length;

  const metricas = [
    {
      label: "Ventas hoy",
      value: formatCurrency(reporte?.ventasHoy.total || 0),
      icon: DollarSign,
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Ticket promedio",
      value: formatCurrency(reporte?.ventasHoy.ticketPromedio || 0),
      icon: TrendingUp,
      color:
        "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Cuentas abiertas",
      value: String(cuentasAbiertas),
      icon: ClipboardList,
      color:
        "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Listos por entregar",
      value: String(reporte?.preparacion.listos || 0),
      icon: PackageCheck,
      color:
        "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="flex items-center gap-3">
      <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map(({ label, value, icon: Icon, color, iconColor }) => (
          <div
            key={label}
            className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${color}`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center bg-white/50 dark:bg-black/20 shrink-0`}
            >
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium opacity-70 truncate">{label}</p>
              <p className="text-xl font-black leading-tight tabular-nums">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => recargarOperativo()}
        disabled={recargandoVista}
        className="shrink-0 hidden sm:flex"
      >
        {recargandoVista ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ─── Lista de cuentas abiertas ─────────────────────────────────────────────────

function ListaCuentas() {
  const { mesas, mesaSeleccionada, setSelectedMesaId } = useRestaurante();

  const cuentas = mesas
    .filter((m) => m.pedidoAbierto && m.estado === "OCUPADA")
    .sort((a, b) => {
      const ta = new Date(a.pedidoAbierto!.createdAt).getTime();
      const tb = new Date(b.pedidoAbierto!.createdAt).getTime();
      return ta - tb; // más antiguas primero
    });

  if (cuentas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground/60">Sin cuentas abiertas</p>
        <p className="text-sm text-muted-foreground mt-1">
          Las cuentas activas aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-22rem)] pr-0.5">
      {cuentas.map((mesa) => {
        const pedido = mesa.pedidoAbierto!;
        const seleccionada = mesa.id === mesaSeleccionada?.id;
        const min = minutosAbierta(pedido.createdAt);
        const esVieja = min >= 60;

        return (
          <button
            key={mesa.id}
            type="button"
            onClick={() => setSelectedMesaId(mesa.id)}
            className={`w-full rounded-2xl border-2 p-3.5 text-left transition-all duration-200 ${
              seleccionada
                ? "border-orange-400 bg-orange-500/10 shadow-sm"
                : esVieja
                ? "border-red-500/30 bg-red-500/5 hover:border-red-400/60"
                : "border-border bg-card hover:border-orange-500/30 hover:bg-orange-500/5"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground truncate">
                    {mesa.nombre}
                  </p>
                  {seleccionada && (
                    <Badge className="bg-orange-600 text-white text-[10px] px-1.5 py-0">
                      Activa
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {pedido.nombreCuenta || "Sin nombre"} ·{" "}
                  {pedido.comensales} comensal
                  {pedido.comensales !== 1 ? "es" : ""}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Clock
                    className={`h-3 w-3 shrink-0 ${
                      esVieja
                        ? "text-red-500"
                        : "text-muted-foreground/60"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      esVieja
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {labelTiempoAbierta(min)}
                  </span>
                  {esVieja && (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-foreground tabular-nums">
                  {formatCurrency(pedido.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pedido.items.length} producto
                  {pedido.items.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Detalle de la cuenta seleccionada ────────────────────────────────────────

function DetalleCuenta() {
  const { mesaSeleccionada, pedidoActivo } = useRestaurante();

  if (!pedidoActivo) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center h-full">
        <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground/60">
          Selecciona una cuenta
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Verás el detalle de los productos aquí.
        </p>
      </div>
    );
  }

  const todasEntregadas = pedidoActivo.items.every(
    (i) => i.estadoPreparacion === "ENTREGADO"
  );
  const algunaLista = pedidoActivo.items.some(
    (i) => i.estadoPreparacion === "LISTO"
  );

  return (
    <div className="space-y-3">
      {/* Info de la mesa */}
      <div className="rounded-2xl bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              {mesaSeleccionada?.nombre}
            </p>
            <p className="font-bold text-foreground mt-0.5">
              {pedidoActivo.nombreCuenta || "Cuenta abierta"}
            </p>
          </div>
          <div className="text-right">
            {algunaLista && !todasEntregadas && (
              <Badge className="bg-emerald-600 text-white text-xs">
                Listo para entregar
              </Badge>
            )}
            {todasEntregadas && pedidoActivo.items.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Todo entregado
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Lista de productos */}
      <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-30rem)] pr-0.5">
        {pedidoActivo.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Cuenta abierta sin productos
          </div>
        ) : (
          pedidoActivo.items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition-all ${
                item.estadoPreparacion === "LISTO"
                  ? "border-emerald-400/60 bg-emerald-500/5"
                  : item.estadoPreparacion === "EN_PREPARACION"
                  ? "border-amber-400/60 bg-amber-500/5"
                  : item.estadoPreparacion === "ENTREGADO"
                  ? "border-border bg-muted/30 opacity-70"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground">
                      {item.cantidad}× {item.nombreProducto}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEstadoPreparacionTone(item.estadoPreparacion)}`}
                    >
                      {getEstadoPreparacionLabel(item.estadoPreparacion)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getEstacionPreparacionLabel(item.estacion)}
                    {item.notas ? ` · ⚠️ ${item.notas}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground tabular-nums shrink-0">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales */}
      {pedidoActivo.items.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatCurrency(pedidoActivo.subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Impuestos</span>
            <span className="tabular-nums">
              {formatCurrency(pedidoActivo.impuesto)}
            </span>
          </div>
          <div className="flex justify-between text-xl font-black border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span className="tabular-nums">
              {formatCurrency(pedidoActivo.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel de cobro ───────────────────────────────────────────────────────────

function PanelCobro() {
  const {
    pedidoActivo,
    mesaSeleccionada,
    clientes,
    facturaForm,
    setFacturaForm,
    facturarCuenta,
    facturandoCuenta,
    setImprimirOpen,
    setDividirCuentaOpen,
  } = useRestaurante();

  if (!pedidoActivo) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center h-full">
        <CreditCard className="h-9 w-9 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-foreground/60">
          Selecciona una cuenta para cobrar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total destacado */}
      <div className="rounded-2xl bg-foreground text-background p-5 text-center">
        <p className="text-xs uppercase tracking-widest opacity-50 font-semibold">
          {mesaSeleccionada?.nombre} · Total a cobrar
        </p>
        <p className="text-4xl font-black mt-1 tabular-nums">
          {formatCurrency(pedidoActivo.total)}
        </p>
        <p className="text-xs opacity-40 mt-1">
          {pedidoActivo.items.length} producto
          {pedidoActivo.items.length !== 1 ? "s" : ""} ·{" "}
          {pedidoActivo.comensales} comensal
          {pedidoActivo.comensales !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Método de pago
        </Label>
        <Select
          value={facturaForm.metodoPago}
          onValueChange={(v) =>
            setFacturaForm((p) => ({
              ...p,
              metodoPago: v as MetodoPagoRestaurante,
            }))
          }
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METODOS_PAGO.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cliente */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Cliente
        </Label>
        <Select
          value={facturaForm.clienteId}
          onValueChange={(v) =>
            setFacturaForm((p) => ({ ...p, clienteId: v }))
          }
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sin-cliente">Consumidor final</SelectItem>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Notas
        </Label>
        <Textarea
          value={facturaForm.notas}
          onChange={(e) =>
            setFacturaForm((p) => ({ ...p, notas: e.target.value }))
          }
          placeholder="Observaciones opcionales..."
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setImprimirOpen(true)}
        >
          <Printer className="mr-2 h-4 w-4" />
          Precuenta
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setDividirCuentaOpen(true)}
          disabled={pedidoActivo.items.length === 0}
        >
          <Receipt className="mr-2 h-4 w-4" />
          Dividir
        </Button>
      </div>

      {/* Botón principal de cobro */}
      <Button
        className="w-full h-14 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/25"
        onClick={facturarCuenta}
        disabled={facturandoCuenta || pedidoActivo.items.length === 0}
      >
        {facturandoCuenta ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-5 w-5" />
        )}
        Confirmar cobro y emitir ticket
      </Button>
    </div>
  );
}

// ─── Resumen rápido del día (mini) ─────────────────────────────────────────────

function ResumenDiaMini() {
  const { reporte } = useRestaurante();

  if (!reporte) return null;

  const filas = [
    ["Reservadas", reporte.mesas.reservadas],
    ["En limpieza", reporte.mesas.limpieza],
    ["Cocina pendiente", reporte.preparacion.cocina],
    ["Barra pendiente", reporte.preparacion.barra],
  ] as const;

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border bg-muted/30 pb-3 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          Estado del día
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {filas.map(([label, val]) => (
          <div
            key={label}
            className="flex justify-between items-center text-sm"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold text-foreground tabular-nums">
              {val}
            </span>
          </div>
        ))}

        {reporte.topProductos.length > 0 && (
          <div className="pt-3 border-t border-border mt-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Top productos hoy
            </p>
            {reporte.topProductos.slice(0, 4).map((p) => (
              <div
                key={p.productoId}
                className="flex items-center justify-between text-xs py-1"
              >
                <span className="text-foreground/80 truncate max-w-[140px]">
                  {p.nombreProducto}
                </span>
                <span className="font-semibold text-foreground tabular-nums ml-2">
                  ×{p.cantidad}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Vista Caja ───────────────────────────────────────────────────────────────

export function CajaView() {
  return (
    <div className="space-y-5">
      {/* Métricas superiores */}
      <MetricasResumen />

      {/* Grid principal */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr_360px]">
        {/* Columna 1: Lista de cuentas */}
        <Card className="overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-orange-500" />
                Cuentas abiertas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ListaCuentas />
          </CardContent>
        </Card>

        {/* Columna 2: Detalle de la cuenta */}
        <Card className="overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              Detalle del consumo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <DetalleCuenta />
          </CardContent>
        </Card>

        {/* Columna 3: Cobro + resumen */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-border">
            <CardHeader className="border-b border-border bg-muted/30 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-orange-500" />
                Cobrar cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <PanelCobro />
            </CardContent>
          </Card>

          <ResumenDiaMini />
        </div>
      </div>
    </div>
  );
}
