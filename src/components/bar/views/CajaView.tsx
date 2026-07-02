"use client";

import {
  CreditCard,
  Loader2,
  Printer,
  Receipt,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

import { useBarContext, METODOS_PAGO } from "@/components/bar/context/BarContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EstadoMesaRestaurante } from "@/lib/prisma-types";
import type { MetodoPagoRestaurante } from "@/types/restaurante";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

// ─── Lista de cuentas abiertas ────────────────────────────────────────────────

function ListaCuentasAbiertas() {
  const { mesas, mesaSeleccionada, setSelectedMesaId } = useBarContext();

  const mesasConCuenta = mesas.filter(
    (m) => m.pedidoAbierto && m.estado === "OCUPADA"
  );

  if (mesasConCuenta.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        No hay cuentas abiertas en este momento.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mesasConCuenta.map((mesa) => {
        const pedido = mesa.pedidoAbierto!;
        const seleccionada = mesa.id === mesaSeleccionada?.id;

        return (
          <button
            key={mesa.id}
            type="button"
            onClick={() => setSelectedMesaId(mesa.id)}
            className={`w-full rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-left transition ${
              seleccionada
                ? "border-orange-400 bg-orange-50"
                : "border-slate-200 bg-white hover:border-orange-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{mesa.nombre}</p>
                <p className="text-sm text-slate-500">
                  {pedido.nombreCuenta || "Sin nombre"} · {pedido.comensales} comensal
                  {pedido.comensales !== 1 ? "es" : ""}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {pedido.items.length} producto{pedido.items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(pedido.total)}
                </p>
                {seleccionada && (
                  <Badge className="mt-1 bg-orange-600 text-white text-xs">Seleccionada</Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
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
  } = useBarContext();

  if (!pedidoActivo) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-center">
        <CreditCard className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm">Selecciona una cuenta para cobrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Resumen de la cuenta */}
      <div className="rounded-2xl bg-slate-900 p-5 text-white space-y-2">
        <p className="text-sm text-white/60 uppercase tracking-wider">
          {mesaSeleccionada?.nombre} · {pedidoActivo.nombreCuenta || "Cuenta"}
        </p>
        <div className="flex justify-between text-sm text-white/70">
          <span>Subtotal</span>
          <span>{formatCurrency(pedidoActivo.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-white/70">
          <span>Impuestos</span>
          <span>{formatCurrency(pedidoActivo.impuesto)}</span>
        </div>
        <div className="flex justify-between text-2xl font-bold border-t border-white/10 pt-3 mt-3">
          <span>Total</span>
          <span>{formatCurrency(pedidoActivo.total)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <Label>Método de pago</Label>
        <Select
          value={facturaForm.metodoPago}
          onValueChange={(v) =>
            setFacturaForm((prev) => ({ ...prev, metodoPago: v as MetodoPagoRestaurante }))
          }
        >
          <SelectTrigger>
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
        <Label>Cliente para la venta</Label>
        <Select
          value={facturaForm.clienteId}
          onValueChange={(v) => setFacturaForm((prev) => ({ ...prev, clienteId: v }))}
        >
          <SelectTrigger>
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
        <Label>Notas</Label>
        <Textarea
          value={facturaForm.notas}
          onChange={(e) => setFacturaForm((prev) => ({ ...prev, notas: e.target.value }))}
          placeholder="Notas opcionales para la venta..."
          rows={2}
        />
      </div>

      {/* Acciones secundarias */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setImprimirOpen(true)}
        >
          <Printer className="mr-2 h-4 w-4" />
          Precuenta
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setDividirCuentaOpen(true)}
          disabled={pedidoActivo.items.length === 0}
        >
          <Receipt className="mr-2 h-4 w-4" />
          Dividir
        </Button>
      </div>

      {/* Cobrar */}
      <Button
        className="w-full bg-orange-600 text-white hover:bg-orange-700 h-11 sm:h-12 text-sm sm:text-base"
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

// ─── Resumen del día ──────────────────────────────────────────────────────────

function ResumenDia() {
  const { reporte } = useBarContext();

  return (
    <Card className="overflow-hidden border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-white">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          Resumen del día
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Ventas hoy", value: formatCurrency(reporte?.ventasHoy.total || 0) },
            { label: "Ticket promedio", value: formatCurrency(reporte?.ventasHoy.ticketPromedio || 0) },
            { label: "Pedidos abiertos", value: String(reporte?.pedidosAbiertos || 0) },
            { label: "Listos por entregar", value: String(reporte?.preparacion.listos || 0) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-2 text-sm">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Estado de sala</p>
          {[
            ["Reservadas", reporte?.mesas.reservadas || 0],
            ["En limpieza", reporte?.mesas.limpieza || 0],
            ["Barra pendiente", reporte?.preparacion.barra || 0],
            ["Cocina pendiente", reporte?.preparacion.cocina || 0],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex justify-between text-slate-600">
              <span>{label}</span>
              <span className="font-semibold text-slate-900">{val}</span>
            </div>
          ))}
        </div>

        {/* Top productos */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">
            Top productos del día
          </p>
          {reporte?.topProductos.length ? (
            <div className="space-y-3">
              {reporte.topProductos.map((p) => (
                <div key={p.productoId} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{p.nombreProducto}</p>
                    <p className="text-slate-500">{p.cantidad} unidades</p>
                  </div>
                  <p className="font-semibold text-slate-900">{formatCurrency(p.total)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Aún no hay ventas facturadas hoy en el módulo restaurante.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Vista Caja ───────────────────────────────────────────────────────────────

export function CajaView() {
  const { modo } = useBarContext();

 

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px_320px]">
      {/* Cuentas abiertas */}
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            Cuentas abiertas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ListaCuentasAbiertas />
        </CardContent>
      </Card>

      {/* Panel de cobro */}
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-orange-500" />
            Cobrar cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <PanelCobro />
        </CardContent>
      </Card>

      {/* Resumen del día */}
      <ResumenDia />
    </div>
  );
}
