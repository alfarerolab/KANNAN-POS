"use client";

import { useState, useEffect } from "react";

import {
  ArrowRightLeft,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Search,
  UtensilsCrossed,
  Users,
  Armchair,
  Pencil,
  Link2Off,
  X,
  Bell,
} from "lucide-react";
import {
  EstadoMesaRestaurante,
  EstacionPreparacionRestaurante,
} from "@/lib/prisma-types";

import { useBarContext } from "@/components/bar/context/BarContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ESTACIONES_PREPARACION, getEstacionPreparacionLabel, getEstadoPreparacionLabel, getEstadoPreparacionTone } from "@/lib/restaurante-shared";
import {
  calcularStockCombo,
  etiquetaPrecio,
  getDiaActual,
  DIAS_SEMANA,
} from "@/lib/precio-dinamico";

// ─── Helpers locales ──────────────────────────────────────────────────────────

import type { RestauranteMesa } from "@/types/restaurante";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const getMesaTone = (mesa: RestauranteMesa) => {
  if (!mesa.activa) return "border-border bg-muted/50 text-muted-foreground";
  // Si tiene cuenta pero sin ítems, mostrar como libre (no como ocupada)
  const tieneConsumo = mesa.pedidoAbierto && (mesa.pedidoAbierto as any).items?.length > 0;
  const estadoEfectivo = tieneConsumo ? mesa.estado : (mesa.estado === "OCUPADA" ? "LIBRE" : mesa.estado);
  if (estadoEfectivo === "OCUPADA")
    return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400";
  if (estadoEfectivo === "RESERVADA")
    return "border-sky-500/30 bg-sky-500/10 text-sky-700";
  if (estadoEfectivo === "LIMPIEZA")
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (estadoEfectivo === "INACTIVA")
    return "border-border bg-muted/50 text-muted-foreground";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
};

const getMesaLabelEfectivo = (mesa: RestauranteMesa) => {
  const tieneConsumo = mesa.pedidoAbierto && (mesa.pedidoAbierto as any).items?.length > 0;
  const estado = tieneConsumo ? mesa.estado : (mesa.estado === "OCUPADA" ? "LIBRE" : mesa.estado);
  return getMesaLabel(estado);
};

const getMesaLabel = (estado: EstadoMesaRestaurante) => {
  if (estado === "RESERVADA") return "Reservada";
  if (estado === "LIMPIEZA") return "Limpieza";
  if (estado === "OCUPADA") return "Ocupada";
  if (estado === "INACTIVA") return "Inactiva";
  return "Libre";
};

// ─── Componente visual interactivo para Mesas ───────────────────────────────────

function TableGraphic({ capacidad, estado, activa }: { capacidad: number; estado: EstadoMesaRestaurante; activa: boolean }) {
  // Limitar visualmente a 12 sillas máximo para que no se superpongan
  const chairsCount = Math.min(Math.max(capacidad, 1), 12);
  const chairs = Array.from({ length: chairsCount });
  
  let tableColor = 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'; // Libre
  let chairColor = 'bg-emerald-300';
  
  if (estado === "OCUPADA") {
    tableColor = 'border-orange-500 bg-orange-500/15 text-orange-700 dark:text-orange-400';
    chairColor = 'bg-orange-400';
  } else if (estado === "RESERVADA") {
    tableColor = 'border-sky-400 bg-sky-500/10 text-sky-700';
    chairColor = 'bg-sky-300';
  } else if (estado === "LIMPIEZA") {
    tableColor = 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-400';
    chairColor = 'bg-amber-300';
  } else if (estado === "INACTIVA" || !activa) {
    tableColor = 'border-border bg-muted text-muted-foreground';
    chairColor = 'bg-border';
  }

  return (
    <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
      {/* Mesa Central */}
      <div className={`w-8 h-8 sm:w-10 sm:h-10 ${capacidad > 4 ? 'rounded-[12px]' : 'rounded-full'} border-2 z-10 ${tableColor} flex items-center justify-center shadow-sm transition-colors duration-300`}>
         <span className="text-[10px] sm:text-[11px] font-bold">{capacidad}</span>
      </div>
      
      {/* Sillas */}
      {chairs.map((_, i) => {
        const angle = (i * 360) / chairs.length;
        const radius = window?.innerWidth < 640 ? 18 : 24; 
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <div
            key={i}
            className={`absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${chairColor} transition-colors duration-300 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Mapa de Mesas ────────────────────────────────────────────────────────────

function MapaMesas() {
  const {
    mesas,
    mesaSeleccionada,
    setSelectedMesaId,
    setCrearMesaOpen,
  } = useBarContext();

  if (mesas.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center">
        <p className="text-lg font-medium text-foreground">Aún no hay mesas creadas</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea la primera mesa para empezar a llevar pedidos.
        </p>
        <Button className="mt-4" onClick={() => setCrearMesaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear mesa
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-4">
      {mesas.map((mesa) => {
        const seleccionada = mesa.id === mesaSeleccionada?.id;
        return (
          <button
            key={mesa.id}
            type="button"
            onClick={() => setSelectedMesaId(mesa.id)}
            className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border p-2.5 sm:p-4 text-left transition-all duration-200 ${getMesaTone(mesa)} ${
              seleccionada ? "ring-2 ring-slate-900 shadow-md scale-[1.02]" : "hover:border-border hover:shadow-sm"
            }`}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className="flex flex-col">
                <p className="text-sm sm:text-lg font-bold">{mesa.nombre}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-current opacity-70"></span>
                  <p className="text-xs uppercase tracking-[0.15em] opacity-80 font-semibold">
                    {getMesaLabelEfectivo(mesa)}
                  </p>
                </div>
              </div>
              <TableGraphic capacidad={mesa.capacidad} estado={mesa.estado} activa={mesa.activa} />
            </div>
            
            <div className="mt-2 sm:mt-5 space-y-1 sm:space-y-1.5 text-xs sm:text-sm w-full bg-card dark:bg-background/40 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-border">
              <div className="flex justify-between items-center opacity-80 text-xs font-medium">
                <span>{mesa.ubicacion || "Sin zona asignada"}</span>
              </div>
              {mesa.pedidoAbierto && mesa.pedidoAbierto.items?.length > 0 ? (
                <div className="flex justify-between items-end border-t border-white/40 pt-1.5 mt-1">
                  <p className="font-semibold text-foreground truncate pr-2 max-w-[120px]">
                    {mesa.pedidoAbierto.nombreCuenta || "Cuenta abierta"}
                  </p>
                  <p className="font-bold whitespace-nowrap">
                    {formatCurrency(mesa.pedidoAbierto.total)}
                  </p>
                </div>
              ) : (
                <div className="flex items-center opacity-70 text-xs mt-1 pt-1.5 border-t border-transparent">
                  Disponible para operar
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Panel de Pedido Activo ───────────────────────────────────────────────────

function PanelPedido() {
  const {
    mesaSeleccionada,
    pedidoActivo,
    clientes,
    cuentaForm,
    setCuentaForm,
    guardandoCuenta,
    guardarCuenta,
    setEditarMesaOpen,
    setMoverMesaOpen,
    setDividirCuentaOpen,
    setImprimirOpen,
    setUnirMesasOpen,
    desunirMesaHandler,
    uniendoMesas,
  } = useBarContext();

  // Mesas unidas: las que están en el pedido pero no son la mesa seleccionada actualmente
  const mesasUnidas = pedidoActivo
    ? pedidoActivo.mesas.filter((mp) => mp.mesa.id !== mesaSeleccionada?.id)
    : [];

  return (
    <Card className="overflow-hidden border-border">
      <CardHeader className="border-b border-border bg-card dark:bg-background">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mesa activa</p>
            <CardTitle className="mt-1 text-2xl">
              {mesaSeleccionada?.nombre || "Selecciona una mesa"}
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:overflow-x-auto sm:pb-1 sm:-mx-1 sm:px-1 scrollbar-hide">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditarMesaOpen(true)}
              disabled={!mesaSeleccionada}
              className="shrink-0 text-xs sm:text-sm"
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMoverMesaOpen(true)}
              disabled={
                !pedidoActivo ||
                !mesaSeleccionada ||
                !pedidoActivo.mesas.some((mp) => mp.mesa.id === mesaSeleccionada.id)
              }
              className="shrink-0 text-xs sm:text-sm"
            >
              <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
              Mover
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDividirCuentaOpen(true)}
              disabled={!pedidoActivo || pedidoActivo.items.length === 0}
              className="shrink-0 text-xs sm:text-sm"
            >
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Dividir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImprimirOpen(true)}
              disabled={!pedidoActivo}
              className="shrink-0 text-xs sm:text-sm"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Precuenta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnirMesasOpen(true)}
              disabled={!mesaSeleccionada}
              className="shrink-0 text-xs sm:text-sm"
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Unir
            </Button>

            {/* ── Desunir — botón independiente, visible solo cuando hay mesas unidas ── */}
            {mesasUnidas.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={uniendoMesas}
                onClick={() => {
                  if (mesasUnidas.length === 1) {
                    desunirMesaHandler([mesasUnidas[0].mesa.id]);
                  } else {
                    setUnirMesasOpen(true);
                  }
                }}
                className="shrink-0 text-xs sm:text-sm border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400"
              >
                {uniendoMesas
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                }
                Desunir{mesasUnidas.length > 1 ? ` (${mesasUnidas.length})` : ` ${mesasUnidas[0].mesa.nombre}`}
              </Button>
            )}

          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 p-3 sm:gap-5 sm:p-5 md:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Formulario de cuenta */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre de la cuenta</Label>
              <Input
                value={cuentaForm.nombreCuenta}
                onChange={(e) => setCuentaForm((prev) => ({ ...prev, nombreCuenta: e.target.value }))}
                placeholder={mesaSeleccionada?.nombre || "Cuenta mesa"}
                disabled={!pedidoActivo}
              />
            </div>
            <div className="space-y-2">
              <Label>Comensales</Label>
              <Input
                type="number"
                min={1}
                value={cuentaForm.comensales}
                onChange={(e) =>
                  setCuentaForm((prev) => ({ ...prev, comensales: Number(e.target.value || 1) }))
                }
                disabled={!pedidoActivo}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente asociado</Label>
            <Select
              value={cuentaForm.clienteId}
              onValueChange={(value) => setCuentaForm((prev) => ({ ...prev, clienteId: value }))}
              disabled={!pedidoActivo}
            >
              <SelectTrigger>
                <SelectValue placeholder="Consumidor final" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sin-cliente">Consumidor final</SelectItem>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas de la cuenta</Label>
            <Textarea
              value={cuentaForm.notas}
              onChange={(e) => setCuentaForm((prev) => ({ ...prev, notas: e.target.value }))}
              disabled={!pedidoActivo}
            />
          </div>

          <Button
            variant="outline"
            onClick={guardarCuenta}
            disabled={!pedidoActivo || guardandoCuenta}
          >
            {guardandoCuenta ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Receipt className="mr-2 h-4 w-4" />
            )}
            Guardar datos de la cuenta
          </Button>
        </div>

        {/* Consumo cargado — solo lectura */}
        <div className="rounded-[28px] border border-border bg-muted/50/70 p-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Consumo cargado
            </h3>
            {pedidoActivo ? (
              <Badge variant="secondary" className="bg-card dark:bg-background">
                {pedidoActivo.mesas.length} mesa(s)
              </Badge>
            ) : null}
          </div>

          {!pedidoActivo ? (
            <div className="flex min-h-60 flex-col items-center justify-center text-center">
              <UtensilsCrossed className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-lg font-medium text-foreground">Sin cuenta abierta</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega un producto para abrir la cuenta.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div className="rounded-2xl bg-card dark:bg-background p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  Mesas: {pedidoActivo.mesas.map((mp) => mp.mesa.nombre).join(" + ")}
                </p>
                <p className="mt-1">
                  Cliente: {pedidoActivo.cliente?.nombre || "Consumidor final"}
                </p>
              </div>

              {/* Lista de ítems — sin controles de edición */}
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {pedidoActivo.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card dark:bg-background p-6 text-center text-sm text-muted-foreground">
                    La cuenta está abierta, pero aún no tiene productos.
                  </div>
                ) : (
                  pedidoActivo.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border bg-card dark:bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {item.cantidad}
                            </span>
                            <p className="font-medium text-foreground text-sm leading-tight">{item.nombreProducto}</p>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="bg-muted text-[10px] py-0">
                              {getEstacionPreparacionLabel(item.estacion)}
                            </Badge>
                            <Badge className={`${getEstadoPreparacionTone(item.estadoPreparacion)} text-[10px] py-0`}>
                              {getEstadoPreparacionLabel(item.estadoPreparacion)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground/70">
                            {formatCurrency(item.precioUnitario)} c/u
                          </p>
                          {item.notas ? (
                            <p className="mt-0.5 text-[11px] italic text-muted-foreground/70">{item.notas}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 font-semibold text-foreground text-sm">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total */}
              <div className="rounded-3xl bg-foreground p-4 text-background mt-auto">
                <div className="flex items-center justify-between text-sm text-background/70">
                  <span>Subtotal</span>
                  <span>{formatCurrency(pedidoActivo.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-background/70">
                  <span>Impuestos</span>
                  <span>{formatCurrency(pedidoActivo.impuesto)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-background/20 pt-4 text-xl font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(pedidoActivo.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Catálogo de Productos ────────────────────────────────────────────────────

function CatalogoProductos() {
  const {
    searchTerm,
    setSearchTerm,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    categorias,
    productosFiltrados,
    abrirProducto,
  } = useBarContext();
  
  const nombreDiaActual = DIAS_SEMANA.find(d => d.id === getDiaActual())?.label || "";

  return (
    <Card className="overflow-hidden border-border">
      <CardHeader className="border-b border-border bg-muted/50/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-lg">Catálogo para cargar a la mesa</CardTitle>
          <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar platos, bebidas o extras..."
                className="pl-9"
              />
            </div>
            <Select value={categoriaSeleccionada} onValueChange={setCategoriaSeleccionada}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {productosFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No encontramos productos con ese filtro.
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {productosFiltrados.map((producto) => {
              const precioData = etiquetaPrecio(producto);
              const precioMostrar = precioData.precio;
              
              const stockMostrar = producto.esCombo && producto.componentes
                ? calcularStockCombo(producto.componentes)
                : producto.enStock;
              const sinStock = stockMostrar <= 0;
                
              return (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => {
                    if (!sinStock) {
                      abrirProducto(producto);
                    }
                  }}
                  disabled={sinStock}
                  className={`rounded-2xl sm:rounded-3xl border bg-card p-2.5 sm:p-4 text-left transition flex flex-col justify-between relative overflow-hidden ${
                    sinStock
                      ? "cursor-not-allowed border-border opacity-60"
                      : "border-border hover:-translate-y-0.5 hover:border-orange-500/30 hover:shadow-md"
                  }`}
                >
                  {producto.esCombo && (
                    <div className="absolute top-0 right-0 rounded-bl-xl bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-400">
                      COMBO
                    </div>
                  )}
                  <div className="w-full">
                    <div className="flex items-start justify-between gap-3 pr-4">
                      <div>
                        <p className="font-semibold text-foreground text-sm sm:text-base leading-tight">{producto.nombre}</p>
                        <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                          {producto.categoria?.nombre || "Sin categoría"}
                        </p>
                      </div>
                      <Plus className={`h-4 w-4 shrink-0 ${sinStock ? "text-muted-foreground/50" : "text-orange-500"}`} />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 w-full">
                    <div className="flex flex-col">
                      {precioData.esEspecial && (
                         <span className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 bg-emerald-500/10 w-fit px-1.5 py-0.5 rounded-sm line-clamp-1">
                           {"Precio de " + nombreDiaActual}
                         </span>
                      )}
                      <p className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
                        {precioMostrar != null ? formatCurrency(precioMostrar) : "Sin precio"}
                      </p>
                    </div>
                    <p className={`mt-0.5 text-[10px] sm:text-xs ${sinStock ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                      {sinStock ? "Sin stock" : `Disp: ${stockMostrar}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ─── Notificaciones flotantes: pedido LISTO en barra ─────────────────────────

function NotificacionesListos() {
  const { notificacionesListo, descartarNotificacionListo, setSelectedMesaId } = useBarContext();

  if (notificacionesListo.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {notificacionesListo.map((notif) => (
        <div
          key={notif.pedidoId}
          className="rounded-2xl border-2 border-emerald-500/40 bg-card shadow-xl p-4 flex flex-col gap-3 animate-in slide-in-from-right-4 duration-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">¡Pedido listo!</p>
                <p className="text-xs text-muted-foreground">{notif.mesaNombre}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => descartarNotificacionListo(notif.pedidoId)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Todos los ítems de{" "}
            <span className="font-semibold text-foreground">{notif.mesaNombre}</span>{" "}
            están listos para entregar.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedMesaId(notif.mesaId);
              descartarNotificacionListo(notif.pedidoId);
            }}
            className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Ver mesa
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Vista principal Mesero ───────────────────────────────────────────────────

export function MeseroView() {
  const { mesaSeleccionada, recargarOperativo } = useBarContext();
  const [activeTab, setActiveTab] = useState("mesas");

  useEffect(() => {
    if (mesaSeleccionada) {
      setActiveTab("pedido");
    } else {
      setActiveTab("mesas");
    }
  }, [mesaSeleccionada]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void recargarOperativo(mesaSeleccionada?.id);
    }, 10_000);

    return () => window.clearInterval(interval);
  }, [mesaSeleccionada?.id, recargarOperativo]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <NotificacionesListos />
      {/* MODO ESCRITORIO (xl y arriba) */}
      <div className="hidden xl:grid gap-6 xl:grid-cols-[1.05fr_1.4fr] items-start">
        {/* Panel izquierdo: mapa de mesas */}
        <Card className="overflow-hidden border-border">
          <CardHeader className="border-b border-border bg-muted/50/70">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Armchair className="h-5 w-5 text-orange-500" />
              Sala y mesas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <MapaMesas />
          </CardContent>
        </Card>

        {/* Panel derecho: pedido activo + catálogo */}
        <div className="space-y-6">
          <PanelPedido />
          <CatalogoProductos />
        </div>
      </div>

      {/* MODO MÓVIL Y TABLET (hasta lg) */}
      <div className="xl:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 h-auto p-1 bg-border/60 rounded-xl">
            <TabsTrigger 
              value="mesas" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card dark:bg-background data-[state=active]:text-orange-600 dark:text-orange-400 data-[state=active]:shadow-sm"
            >
               <Armchair className="h-5 w-5" />
               <span className="font-semibold text-sm">Mesas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pedido" 
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card dark:bg-background data-[state=active]:text-orange-600 dark:text-orange-400 data-[state=active]:shadow-sm" 
              disabled={!mesaSeleccionada}
            >
               <Receipt className="h-5 w-5" />
               <span className="font-semibold text-sm">Pedido Activo</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="mesas" className="mt-0">
             <Card className="overflow-hidden border-border shadow-sm">
               <CardContent className="p-3 sm:p-4">
                 <MapaMesas />
               </CardContent>
             </Card>
          </TabsContent>
          
          <TabsContent value="pedido" className="mt-0 space-y-4">
             {mesaSeleccionada ? (
                <>
                  <PanelPedido />
                  <CatalogoProductos />
                </>
             ) : (
                <div className="text-center p-8 text-muted-foreground rounded-xl border border-dashed border-border bg-card dark:bg-background">
                   Selecciona una mesa primero
                </div>
             )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}