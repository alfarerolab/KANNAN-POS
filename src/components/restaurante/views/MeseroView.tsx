"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowRightLeft,
  CreditCard,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  Unlink,
  UtensilsCrossed,
  Users,
  Armchair,
  BellRing,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  EstadoMesaRestaurante,
  EstacionPreparacionRestaurante,
} from "@/lib/prisma-types";

import { useRestaurante } from "@/components/restaurante/context/RestauranteContext";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  getEstacionPreparacionLabel,
  getEstadoPreparacionLabel,
  getEstadoPreparacionTone,
} from "@/lib/restaurante-shared";
import type { RestauranteMesa } from "@/types/restaurante";

// ─── Helpers locales ──────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const getMesaTone = (mesa: RestauranteMesa) => {
  if (!mesa.activa) return "border-border bg-muted/50 text-muted-foreground";
  if (mesa.estado === "OCUPADA")
    return "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400";
  if (mesa.estado === "RESERVADA")
    return "border-sky-500/50 bg-sky-500/10 text-sky-700";
  if (mesa.estado === "LIMPIEZA")
    return "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  if (mesa.estado === "INACTIVA")
    return "border-border bg-muted/50 text-muted-foreground";
  return "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
};

const getMesaLabel = (estado: EstadoMesaRestaurante) => {
  if (estado === "RESERVADA") return "Reservada";
  if (estado === "LIMPIEZA") return "Limpieza";
  if (estado === "OCUPADA") return "Ocupada";
  if (estado === "INACTIVA") return "Inactiva";
  return "Libre";
};

function getMinutos(fecha: string): number {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 60_000);
}

function tiempoStr(minutos: number): string {
  if (minutos < 60) return `${minutos}m`;
  return `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
}

// ─── Componente visual interactivo para Mesas ───────────────────────────────────

function TableGraphic({ capacidad, estado, activa }: { capacidad: number; estado: EstadoMesaRestaurante; activa: boolean }) {
  const chairsCount = Math.min(Math.max(capacidad, 1), 12);
  const chairs = Array.from({ length: chairsCount });

  let tableColor = 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
  let chairColor = 'bg-emerald-400 dark:bg-emerald-500';

  if (estado === "OCUPADA") {
    tableColor = 'border-orange-500 bg-orange-500/20 text-orange-700 dark:text-orange-400';
    chairColor = 'bg-orange-400 dark:bg-orange-500';
  } else if (estado === "RESERVADA") {
    tableColor = 'border-sky-400 bg-sky-500/15 text-sky-700 dark:text-sky-400';
    chairColor = 'bg-sky-400';
  } else if (estado === "LIMPIEZA") {
    tableColor = 'border-amber-400 bg-amber-500/15 text-amber-700 dark:text-amber-400';
    chairColor = 'bg-amber-400';
  } else if (estado === "INACTIVA" || !activa) {
    tableColor = 'border-border bg-muted/80 text-muted-foreground';
    chairColor = 'bg-border';
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
      {/* Mesa Central */}
      <div className={`w-10 h-10 ${capacidad > 4 ? 'rounded-[12px]' : 'rounded-full'} border-[3px] z-10 ${tableColor} flex items-center justify-center shadow-inner transition-colors duration-300 relative`}>
        <span className="text-xs font-black">{capacidad}</span>
        {estado === "OCUPADA" && (
          <div className="absolute -inset-1 rounded-[inherit] border-2 border-orange-400/40 animate-ping opacity-20 pointer-events-none" />
        )}
      </div>

      {/* Sillas */}
      {chairs.map((_, i) => {
        const angle = (i * 360) / chairs.length;
        const radius = 26;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = Math.sin((angle * Math.PI) / 180) * radius;
        return (
          <div
            key={i}
            className={`absolute w-3.5 h-3.5 rounded-full ${chairColor} transition-colors duration-300 shadow-sm`}
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Mapa de Mesas Agrupado por Zonas ───────────────────────────────────────────

function MapaMesasAgrupado() {
  const {
    mesas,
    mesaSeleccionada,
    setSelectedMesaId,
    setCrearMesaOpen,
  } = useRestaurante();

  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid gap-2 sm:gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
      {mesas.map((mesa) => {
        const seleccionada = mesa.id === mesaSeleccionada?.id;
        const min = mesa.pedidoAbierto ? getMinutos(mesa.pedidoAbierto.createdAt) : 0;
        const alerta = min >= 60;

        return (
          <button
            key={mesa.id}
            type="button"
            onClick={() => setSelectedMesaId(mesa.id)}
            className={`relative flex flex-col justify-between rounded-[12px] border-[2px] p-2 text-left transition-all duration-200 ${getMesaTone(mesa)} ${seleccionada
              ? "ring-2 ring-orange-500/20 shadow-md border-orange-500 scale-[1.02] z-10"
              : "hover:border-border hover:shadow-sm"
              } ${alerta ? "border-red-500/50 bg-red-500/10" : ""}`}
            style={{ minHeight: "90px" }}
          >
            <div className="flex w-full items-start justify-between gap-1">
              <div className="flex flex-col min-w-0 pr-1">
                <p className="text-sm sm:text-base font-black text-foreground leading-tight line-clamp-1 truncate">{mesa.nombre}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-current opacity-70 flex-shrink-0"></span>
                  <p className="text-[9px] uppercase tracking-wide opacity-80 font-bold truncate">
                    {getMesaLabel(mesa.estado)}
                  </p>
                </div>
              </div>
              <div className="scale-50 sm:scale-75 origin-top-right flex-shrink-0 -mt-1 -mr-1">
                <TableGraphic capacidad={mesa.capacidad} estado={mesa.estado} activa={mesa.activa} />
              </div>
            </div>

            <div
              className={`mt-2 w-full rounded-lg border p-1.5 ${alerta ? "bg-red-500/10 border-red-500/30" : "bg-background/60 border-border/50"
                }`}
            >
              {mesa.pedidoAbierto ? (
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="font-semibold text-foreground text-[10px] truncate max-w-[60%]">
                      {mesa.pedidoAbierto.nombreCuenta || "Cuenta"}
                    </p>
                    <div
                      className={`flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full ${alerta
                        ? "bg-red-500/20 text-red-700 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                        }`}
                    >
                      <Clock className="h-2 w-2" />
                      {tiempoStr(min)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-border/50 pt-0.5 flex-nowrap">
                    <p className="text-[9px] text-muted-foreground font-medium">
                      {mesa.pedidoAbierto.items.length} p.
                    </p>
                    <p className="text-xs sm:text-sm font-black text-foreground tracking-tight">
                      {formatCurrency(mesa.pedidoAbierto.total)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center opacity-60 text-[9px] sm:text-[10px] font-medium py-1">
                  Libre
                </div>
              )}
            </div>
          </button>
        );
      })}

      {/* Botón Nueva mesa al final del grid como en el bar */}
      <button
        type="button"
        onClick={() => setCrearMesaOpen(true)}
        className="flex flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border bg-muted/30 p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all duration-200"
        style={{ minHeight: "90px" }}
      >
        <Plus className="h-5 w-5 mb-1 opacity-50" />
        <span className="text-[10px] sm:text-xs font-semibold">Nueva mesa</span>
      </button>
    </div>
  );
}

// ─── Resumen Flotante Superior ────────────────────────────────────────────────

function ResumenFlotante() {
  const { mesas, recargarOperativo, recargandoVista, setCrearMesaOpen } = useRestaurante();
  const activas = mesas.filter(m => m.activa);
  const libres = activas.filter(m => m.estado === "LIBRE").length;
  const ocupadas = activas.filter(m => m.estado === "OCUPADA").length;
  const otras = activas.length - libres - ocupadas;

  return (
    <div className="sticky top-0 z-40 -mx-6 -mt-6 mb-6 flex items-center justify-between gap-4 border-b border-border bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <UtensilsCrossed className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-none text-foreground">Servicio</h2>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Restaurante</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="hidden sm:flex items-center gap-3">
          <Badge variant="outline" className="h-8 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1.5 px-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {libres} Libres
          </Badge>
          <Badge variant="outline" className="h-8 rounded-lg border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 gap-1.5 px-3">
            <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            {ocupadas} Ocupadas
          </Badge>
          {otras > 0 && (
            <Badge variant="outline" className="h-8 rounded-lg bg-muted text-muted-foreground gap-1.5 px-3">
              <span className="h-2 w-2 rounded-full bg-current" />
              {otras} Otras
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setCrearMesaOpen(true)}
          className="h-9 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nueva Mesa
        </Button>
        <Button variant="outline" size="sm" onClick={() => recargarOperativo()} disabled={recargandoVista} className="h-9 rounded-xl border-border bg-card">
          {recargandoVista ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Actualizar
        </Button>
      </div>
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
    actualizandoItem,
    guardarCuenta,
    ajustarCantidadRapida,
    abrirEditorItem,
    setEditarMesaOpen,
    setMoverMesaOpen,
    setDividirCuentaOpen,
    setImprimirOpen,
    setUnirMesasOpen,
    setFacturarOpen,
    desunirMesaHandler,
  } = useRestaurante();

  const [desunirOpen, setDesunirOpen] = useState(false);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="border-b border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-orange-600 text-white hover:bg-orange-700 uppercase tracking-widest text-[10px] px-2 py-0">
                Mesa Activa
              </Badge>
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-foreground">
              {mesaSeleccionada?.nombre || "Ninguna seleccionada"}
            </CardTitle>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => setEditarMesaOpen(true)} disabled={!mesaSeleccionada}>
              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setMoverMesaOpen(true)} disabled={!pedidoActivo || !mesaSeleccionada || !pedidoActivo.mesas.some((mp) => mp.mesa.id === mesaSeleccionada.id)}>
              <ArrowRightLeft className="mr-2 h-4 w-4 text-muted-foreground" /> Mover
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setDividirCuentaOpen(true)} disabled={!pedidoActivo || pedidoActivo.items.length === 0}>
              <Receipt className="mr-2 h-4 w-4 text-muted-foreground" /> Dividir
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setImprimirOpen(true)} disabled={!pedidoActivo}>
              <Printer className="mr-2 h-4 w-4 text-muted-foreground" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setUnirMesasOpen(true)} disabled={!pedidoActivo}>
              <Users className="mr-2 h-4 w-4 text-muted-foreground" /> Unir
            </Button>

            {/* Desunir */}
            {pedidoActivo && pedidoActivo.mesas.length > 1 ? (
              <div className="relative">
                <Button variant="outline" size="sm" className="w-full h-9" onClick={() => setDesunirOpen((v) => !v)}>
                  <Unlink className="mr-2 h-4 w-4 text-muted-foreground" /> Desunir
                </Button>
                {desunirOpen && (
                  <div className="absolute top-full right-0 mt-1 w-48 rounded-xl border border-border bg-card p-2 shadow-xl z-50">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">Selecciona mesa a liberar</p>
                    <div className="flex flex-col gap-1">
                      {pedidoActivo.mesas.filter((mp) => mp.mesa.id !== mesaSeleccionada?.id).map((mp) => (
                        <Button key={mp.mesa.id} variant="ghost" size="sm" className="justify-start text-sm" onClick={() => { desunirMesaHandler(mp.mesa.id); setDesunirOpen(false); }}>
                          {mp.mesa.nombre}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div /> // placeholder for grid
            )}

            <Button className="col-span-2 sm:col-span-3 h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => setFacturarOpen(true)} disabled={!pedidoActivo || pedidoActivo.items.length === 0}>
              <CreditCard className="mr-2 h-4 w-4" /> Cobrar {pedidoActivo && `· ${formatCurrency(pedidoActivo.total)}`}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-5 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] bg-muted/20">
        {/* Formulario lateral izquierdo */}
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm h-fit">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">Datos de la cuenta</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre de la cuenta</Label>
              <Input
                value={cuentaForm.nombreCuenta}
                onChange={(e) => setCuentaForm((prev) => ({ ...prev, nombreCuenta: e.target.value }))}
                placeholder={mesaSeleccionada?.nombre || "Nombre..."}
                disabled={!pedidoActivo}
                className="h-10 bg-muted/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Comensales</Label>
              <Input
                type="number"
                min={1}
                value={cuentaForm.comensales}
                onChange={(e) => setCuentaForm((prev) => ({ ...prev, comensales: Number(e.target.value || 1) }))}
                disabled={!pedidoActivo}
                className="h-10 bg-muted/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente</Label>
              <Select value={cuentaForm.clienteId} onValueChange={(value) => setCuentaForm((prev) => ({ ...prev, clienteId: value }))} disabled={!pedidoActivo}>
                <SelectTrigger className="h-10 bg-muted/50"><SelectValue placeholder="Consumidor final" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-cliente">Consumidor final</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de servicio</Label>
              <Select
                value={cuentaForm.tipoServicio}
                onValueChange={(val) => {
                  const nuevoCostoEmpaque = val !== "MESA" && cuentaForm.costoEmpaque === 0 ? 1500 : (val === "MESA" ? 0 : cuentaForm.costoEmpaque);
                  setCuentaForm((prev) => ({
                    ...prev,
                    tipoServicio: val,
                    costoEmpaque: nuevoCostoEmpaque,
                  }));
                }}
                disabled={!pedidoActivo}
              >
                <SelectTrigger className="h-10 bg-muted/50 font-medium">
                  <SelectValue placeholder="Comer en Mesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MESA">🍽️ Comer en Mesa</SelectItem>
                  <SelectItem value="LLEVAR">📦 Para Llevar</SelectItem>
                  <SelectItem value="DOMICILIO">🛵 Domicilio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cuentaForm.tipoServicio !== "MESA" && (
              <div className="space-y-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-orange-800 dark:text-orange-300">
                    🍱 Costo Recipiente / Empaque ($)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={cuentaForm.costoEmpaque}
                    onChange={(e) => setCuentaForm((prev) => ({ ...prev, costoEmpaque: Number(e.target.value || 0) }))}
                    disabled={!pedidoActivo}
                    className="h-9 bg-background font-bold text-orange-700 dark:text-orange-400"
                  />
                </div>

                {cuentaForm.tipoServicio === "DOMICILIO" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-orange-800 dark:text-orange-300">
                        🛵 Costo Envío / Domicilio ($)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={500}
                        value={cuentaForm.costoDomicilio}
                        onChange={(e) => setCuentaForm((prev) => ({ ...prev, costoDomicilio: Number(e.target.value || 0) }))}
                        disabled={!pedidoActivo}
                        className="h-9 bg-background font-bold text-orange-700 dark:text-orange-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Dirección de Entrega</Label>
                      <Input
                        value={cuentaForm.direccionEnvio}
                        onChange={(e) => setCuentaForm((prev) => ({ ...prev, direccionEnvio: e.target.value }))}
                        placeholder="Calle / Carrera #..."
                        disabled={!pedidoActivo}
                        className="h-9 bg-background text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Teléfono Contacto</Label>
                      <Input
                        value={cuentaForm.telefonoEnvio}
                        onChange={(e) => setCuentaForm((prev) => ({ ...prev, telefonoEnvio: e.target.value }))}
                        placeholder="300 000 0000"
                        disabled={!pedidoActivo}
                        className="h-9 bg-background text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notas generales</Label>
              <Textarea value={cuentaForm.notas} onChange={(e) => setCuentaForm((prev) => ({ ...prev, notas: e.target.value }))} disabled={!pedidoActivo} className="resize-none bg-muted/50" rows={2} />
            </div>
            <Button className="w-full mt-2" variant="secondary" onClick={guardarCuenta} disabled={!pedidoActivo || guardandoCuenta}>
              {guardandoCuenta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Guardar cambios"}
            </Button>
          </div>
        </div>

        {/* Detalle del pedido derecho */}
        <div className="flex flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden min-h-[400px]">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Productos cargados</h3>
            {pedidoActivo && pedidoActivo.mesas.length > 1 && (
              <Badge variant="outline" className="bg-background">Unión de {pedidoActivo.mesas.length} mesas</Badge>
            )}
          </div>

          {!pedidoActivo ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-xl font-bold text-foreground">Sin cuenta abierta</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">Agrega un producto del catálogo para abrir la cuenta y empezar a facturar.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full max-h-[600px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {pedidoActivo.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                    La cuenta está abierta pero no tiene productos asignados.
                  </div>
                ) : (
                  pedidoActivo.items.map((item) => (
                    <div key={item.id} className="group rounded-2xl border border-border bg-card p-3.5 space-y-2.5 transition-all hover:border-orange-500/40 hover:shadow-sm">
                      {/* Entezado: Cantidad, Nombre y Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="font-black text-foreground text-sm bg-muted px-2 py-0.5 rounded-lg shrink-0">
                            {item.cantidad}×
                          </span>
                          <p className="font-bold text-foreground text-sm leading-snug break-words">
                            {item.nombreProducto}
                          </p>
                        </div>
                        <Badge className={`shrink-0 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider ${getEstadoPreparacionTone(item.estadoPreparacion)}`}>
                          {getEstadoPreparacionLabel(item.estadoPreparacion)}
                        </Badge>
                      </div>

                      {/* Notas opcionales */}
                      {item.notas && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-500/10 p-1.5 rounded-lg">
                          📝 {item.notas}
                        </p>
                      )}

                      {/* Pie: Subtotal y Botones de Acción */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Subtotal</span>
                          <span className="font-black text-base text-foreground tabular-nums">{formatCurrency(item.subtotal)}</span>
                        </div>

                        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-background shadow-sm text-muted-foreground hover:text-foreground" disabled={actualizandoItem} onClick={() => ajustarCantidadRapida(item, item.cantidad - 1)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-background shadow-sm text-orange-600 hover:text-orange-700" onClick={() => abrirEditorItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-background shadow-sm text-muted-foreground hover:text-foreground" disabled={actualizandoItem} onClick={() => ajustarCantidadRapida(item, item.cantidad + 1)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totales fijos abajo */}
              <div className="bg-foreground text-background p-5">
                <div className="flex justify-between items-center text-sm opacity-70 mb-1">
                  <span>Subtotal Platos</span>
                  <span className="tabular-nums">{formatCurrency(pedidoActivo.subtotal)}</span>
                </div>
                {Boolean(pedidoActivo.costoEmpaque) && (
                  <div className="flex justify-between items-center text-sm opacity-90 text-amber-300 mb-1">
                    <span>🍱 Empaque / Recipiente</span>
                    <span className="tabular-nums font-bold">+{formatCurrency(pedidoActivo.costoEmpaque || 0)}</span>
                  </div>
                )}
                {Boolean(pedidoActivo.costoDomicilio) && (
                  <div className="flex justify-between items-center text-sm opacity-90 text-sky-300 mb-1">
                    <span>🛵 Envío Domicilio</span>
                    <span className="tabular-nums font-bold">+{formatCurrency(pedidoActivo.costoDomicilio || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm opacity-70 mb-3 border-b border-background/20 pb-3">
                  <span>Impuestos</span>
                  <span className="tabular-nums">{formatCurrency(pedidoActivo.impuesto)}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-semibold uppercase tracking-widest opacity-90">Total</span>
                  <span className="text-3xl font-black tabular-nums tracking-tight">{formatCurrency(pedidoActivo.total)}</span>
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

function CatalogoProductos({ onProductClick }: { onProductClick?: (p: any) => void }) {
  const {
    searchTerm,
    setSearchTerm,
    categoriaSeleccionada,
    setCategoriaSeleccionada,
    categorias,
    productosFiltrados,
    abrirProducto,
  } = useRestaurante();

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="border-b border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl font-bold">Catálogo de Productos</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar platos, bebidas..."
                className="pl-9 h-10 bg-muted/30"
              />
            </div>
            <Select value={categoriaSeleccionada} onValueChange={setCategoriaSeleccionada}>
              <SelectTrigger className="w-full sm:w-48 h-10 bg-muted/30">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 bg-muted/10">
        {productosFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-lg font-medium text-foreground">No hay productos</p>
            <p className="text-sm text-muted-foreground mt-1">Prueba cambiando los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {productosFiltrados.map((producto) => (
              <button
                key={producto.id}
                type="button"
                onClick={() => onProductClick ? onProductClick(producto) : abrirProducto(producto)}
                className="group flex flex-col rounded-[20px] border border-border bg-card p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <div className="flex-1 w-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="bg-muted text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1.5 py-0 truncate max-w-[100px]">
                      {producto.categoria?.nombre || "Varios"}
                    </Badge>
                    <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                  <p className="font-bold text-foreground text-sm leading-tight line-clamp-2">{producto.nombre}</p>
                </div>
                <div className="mt-4 w-full pt-3 border-t border-border/50 flex items-end justify-between">
                  <p className="text-lg font-black text-foreground tracking-tight">
                    {producto.precio != null ? formatCurrency(producto.precio) : "---"}
                  </p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Stock: {producto.enStock}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Vista principal Mesero ───────────────────────────────────────────────────

interface NotifItem {
  id: string;
  mesa: string;
  producto: string;
  cantidad: number;
  todoListo: boolean;
  ts: number;
}

import { ShoppingCart, User, Monitor, Mic } from "lucide-react";

export function MeseroView() {
  const { mesas, mesaSeleccionada, setCrearMesaOpen } = useRestaurante();
  const prevItemStatusRef = useRef<Record<string, string>>({});
  const [notificaciones, setNotificaciones] = useState<NotifItem[]>([]);
  const [activeTab, setActiveTab] = useState("mesas");
  const [agregarModalOpen, setAgregarModalOpen] = useState(false);

  // Estado del carrito temporal para el modal
  const [modoVenta, setModoVenta] = useState<"mesa" | "rapida">("mesa");
  const [carritoTemporal, setCarritoTemporal] = useState<{ producto: any, cantidad: number }[]>([]);
  const [procesandoCarrito, setProcesandoCarrito] = useState(false);

  const { toast } = useToast();

  const abrirVentaRapida = () => {
    setModoVenta("rapida");
    setCarritoTemporal([]);
    setAgregarModalOpen(true);
  };

  const abrirVentaMesa = () => {
    setModoVenta("mesa");
    setCarritoTemporal([]);
    setAgregarModalOpen(true);
  };

  const handleProductClick = (prod: any) => {
    setCarritoTemporal(prev => {
      const existe = prev.find(i => i.producto.id === prod.id);
      if (existe) {
        return prev.map(i => i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { producto: prod, cantidad: 1 }];
    });
  };

  const procesarCarrito = async () => {
    setProcesandoCarrito(true);
    try {
      if (modoVenta === "mesa") {
        // Enviar a la mesa 1 a 1 (simulado rápido si se necesita endpoints masivos)
        // Por ahora le pedimos que use el flujo normal si fallara, pero idealmente llamaría al API de item
        toast({ title: "Esta función enviará los ítems a la mesa. Procesando...", description: "Cerrando modal." });
        setAgregarModalOpen(false);
      } else {
        // Enviar a caja o procesar venta
        toast({ title: "Venta rápida procesada (mock)", description: "Esto despachará una venta inmediata." });
        setAgregarModalOpen(false);
      }
    } catch (e) {
    } finally {
      setProcesandoCarrito(false);
    }
  };

  const totalCarrito = carritoTemporal.reduce((acc, item) => acc + ((item.producto.precio || 0) * item.cantidad), 0);

  // Volver a la pestaña de mesas solo si se deselecciona la mesa activa
  useEffect(() => {
    if (!mesaSeleccionada && activeTab !== "mesas") {
      setActiveTab("mesas");
    }
  }, [mesaSeleccionada, activeTab]);

  // Detecta cambios de estado ítem por ítem
  useEffect(() => {
    const nextStatus: Record<string, string> = {};

    mesas.forEach(m => {
      if (!m.pedidoAbierto) return;
      const items = m.pedidoAbierto.items;

      items.forEach(item => {
        nextStatus[item.id] = item.estadoPreparacion;
        const prev = prevItemStatusRef.current[item.id];

        // Nuevo ítem que acaba de quedar LISTO
        if (item.estadoPreparacion === "LISTO" && prev && prev !== "LISTO") {
          const todoListo = items.every(
            i => i.estadoPreparacion === "LISTO" || i.estadoPreparacion === "ENTREGADO"
          );
          const notifId = crypto.randomUUID();
          setNotificaciones(prev => [
            ...prev,
            {
              id: notifId,
              mesa: m.nombre,
              producto: item.nombreProducto,
              cantidad: item.cantidad,
              todoListo,
              ts: Date.now(),
            },
          ]);
          // Auto-dismiss después de 30s
          setTimeout(() => {
            setNotificaciones(p => p.filter(n => n.id !== notifId));
          }, 30_000);
        }
      });
    });

    prevItemStatusRef.current = nextStatus;
  }, [mesas]);

  const dismissNotif = (id: string) =>
    setNotificaciones(p => p.filter(n => n.id !== id));

  return (
    <div className="relative">
      <ResumenFlotante />

      {/* ── Notificaciones flotantes del mesero ─────────────────────────────── */}
      {notificaciones.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 max-h-[80vh] overflow-hidden pointer-events-none">
          {notificaciones.map((notif) => (
            <div
              key={notif.id}
              className={`w-80 rounded-2xl border shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-right-8 fade-in duration-300 ${notif.todoListo
                ? "border-emerald-500/40 bg-card"
                : "border-amber-500/30 bg-card"
                }`}
            >
              {/* Barra de color */}
              <div className={`px-4 py-2 flex items-center gap-2 ${notif.todoListo ? "bg-emerald-600" : "bg-amber-500"}`}>
                <BellRing className="h-4 w-4 text-white" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  {notif.todoListo ? "¡Mesa completa lista!" : "Ítem listo en cocina"}
                </span>
              </div>
              <div className="p-4">
                <p className="font-black text-foreground text-base leading-tight">
                  {notif.cantidad}× {notif.producto}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Mesa: <strong className="text-foreground">{notif.mesa}</strong>
                  {notif.todoListo && (
                    <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                      · Todos los ítems listos
                    </span>
                  )}
                </p>
                <Button
                  className={`w-full mt-3 h-9 text-xs font-bold rounded-xl text-white ${notif.todoListo
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  onClick={() => dismissNotif(notif.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {notif.todoListo ? "Voy a buscar la mesa" : "Entendido"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DESKTOP: layout lado a lado (xl+) ─────────────────────────────── */}
      <div className="hidden xl:grid gap-6 xl:grid-cols-[400px_1fr] 2xl:grid-cols-[480px_1fr]">
        {/* Panel izquierdo: mapa de mesas agrupado por zona */}
        <Card className="overflow-hidden border-border bg-card/50 shadow-sm self-start sticky top-[100px] max-h-[calc(100vh-120px)] flex flex-col">
          <CardHeader className="border-b border-border bg-card p-5 shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Armchair className="h-6 w-6 text-orange-500" />
              Zonas y Mesas
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setCrearMesaOpen(true)}
              className="h-8 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-1 rounded-xl shadow-sm px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              + Mesa
            </Button>
          </CardHeader>
          <CardContent className="p-4 bg-background border border-t-0 rounded-b-2xl shadow-sm">
            <MapaMesasAgrupado />
          </CardContent>
        </Card>

        {/* Botones de acción rápida */}
        <div className="grid grid-cols-2 gap-4 my-2">
          <button
            onClick={abrirVentaRapida}
            className="flex items-center justify-start gap-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-left hover:bg-emerald-500/20 transition group">
            <div className="bg-emerald-500/20 p-3 rounded-xl scale-95 group-hover:scale-100 transition"><ShoppingCart className="text-emerald-700 dark:text-emerald-400 h-5 w-5" /></div>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-400 text-lg leading-tight">Venta Rápida</p>
              <p className="text-emerald-700/70 dark:text-emerald-500 text-sm">Cobro inmediato en mostrador</p>
            </div>
          </button>
          <button
            onClick={abrirVentaMesa}
            disabled={!mesaSeleccionada}
            className="flex items-center justify-start gap-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-left hover:bg-blue-500/20 transition disabled:opacity-50 group">
            <div className="bg-blue-500/20 p-3 rounded-xl scale-95 group-hover:scale-100 transition"><Mic className="text-blue-700 dark:text-blue-400 h-5 w-5" /></div>
            <div>
              <p className="font-bold text-blue-800 dark:text-blue-400 text-lg leading-tight">Añadir a {mesaSeleccionada?.nombre || "Mesa"}</p>
              <p className="text-blue-700/70 dark:text-blue-500 text-sm">Mesa seleccionada activa</p>
            </div>
          </button>
        </div>

        {/* Panel inferior: detalles */}
        <div className="grid gap-6 items-start">
          <PanelPedido />
        </div>
      </div>

      <Dialog open={agregarModalOpen} onOpenChange={setAgregarModalOpen}>
        <DialogContent className="max-w-[7xl] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-y-auto xl:overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b bg-card shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              {modoVenta === "mesa" ? `Agregando a: ${mesaSeleccionada?.nombre}` : "Venta Rápida - Mostrador"}
            </DialogTitle>
            <DialogDescription>Selecciona los productos del catálogo</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
            {/* Izquierda: Catálogo */}
            <div className="flex-1 border-b xl:border-b-0 xl:border-r border-border overflow-visible xl:overflow-y-auto p-2 sm:p-4 bg-muted/20">
              <CatalogoProductos onProductClick={handleProductClick} />
            </div>

            {/* Derecha: Listado activo */}
            <div className="flex flex-col h-auto w-full xl:w-[380px] shrink-0 bg-card z-10">
              <div className="p-3 sm:p-4 border-b border-border font-bold text-foreground flex justify-between items-center shrink-0 bg-card sticky top-0 xl:static z-20">
                <span className="text-sm sm:text-base">Resumen de Venta</span>
                <Badge variant="secondary">{carritoTemporal.reduce((acc, i) => acc + i.cantidad, 0)} ítems</Badge>
              </div>

              <div className="flex-1 overflow-x-hidden xl:overflow-y-auto flex flex-col p-4 bg-muted/5">
                {carritoTemporal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-60 text-center">
                    <div className="bg-muted p-6 rounded-full mb-4">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-medium">Agrega productos del catálogo</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {carritoTemporal.map(item => (
                      <div key={item.producto.id} className="bg-card border border-border shadow-sm rounded-xl p-3 flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-sm leading-tight truncate">{item.producto.nombre}</p>
                          <p className="text-muted-foreground text-xs">{formatCurrency(item.producto.precio || 0)}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => {
                            setCarritoTemporal(prev => prev.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: Math.max(1, i.cantidad - 1) } : i));
                          }}><Minus className="h-3 w-3" /></Button>
                          <span className="font-bold text-sm w-4 text-center">{item.cantidad}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => {
                            setCarritoTemporal(prev => prev.map(i => i.producto.id === item.producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
                          }}><Plus className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => {
                            setCarritoTemporal(prev => prev.filter(i => i.producto.id !== item.producto.id));
                          }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border bg-muted/10 shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-foreground">Total a cobrar</span>
                  <span className="font-bold text-emerald-600 text-xl">{formatCurrency(totalCarrito)}</span>
                </div>
                <Button
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base"
                  disabled={carritoTemporal.length === 0 || procesandoCarrito}
                  onClick={procesarCarrito}
                >
                  {procesandoCarrito ? "Procesando..." : (modoVenta === "mesa" ? `Agregar a ${mesaSeleccionada?.nombre}` : "Cobrar Venta Rápida")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MOBILE / TABLET: navegación por tabs (hasta lg) ──────────────── */}
      <div className="xl:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 h-auto p-1 bg-border/60 rounded-xl">
            <TabsTrigger
              value="mesas"
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
            >
              <Armchair className="h-5 w-5" />
              <span className="font-semibold text-sm">Mesas</span>
            </TabsTrigger>
            <TabsTrigger
              value="pedido"
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
              disabled={!mesaSeleccionada}
            >
              <Receipt className="h-5 w-5" />
              <span className="font-semibold text-sm">Pedido</span>
            </TabsTrigger>
            <TabsTrigger
              value="catalogo"
              className="flex items-center gap-2 py-3 rounded-lg data-[state=active]:bg-card data-[state=active]:text-orange-600 data-[state=active]:shadow-sm"
              disabled={!mesaSeleccionada}
            >
              <UtensilsCrossed className="h-5 w-5" />
              <span className="font-semibold text-sm">Carta</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mesas" className="mt-0">
            {/* Botones de acción rápida para móvil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={abrirVentaRapida}
                className="flex items-center justify-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-left hover:bg-emerald-500/20 active:scale-95 transition">
                <div className="bg-emerald-500/20 p-2.5 rounded-xl"><ShoppingCart className="text-emerald-700 dark:text-emerald-400 h-4 w-4" /></div>
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-400 text-sm leading-tight">Venta Rápida</p>
                  <p className="text-emerald-700/70 dark:text-emerald-500 text-xs mt-0.5">Cobro en mostrador</p>
                </div>
              </button>
              <button
                onClick={abrirVentaMesa}
                disabled={!mesaSeleccionada}
                className="flex items-center justify-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-left hover:bg-blue-500/20 disabled:opacity-50 active:scale-95 transition">
                <div className="bg-blue-500/20 p-2.5 rounded-xl"><Mic className="text-blue-700 dark:text-blue-400 h-4 w-4" /></div>
                <div>
                  <p className="font-bold text-blue-800 dark:text-blue-400 text-sm leading-tight">Añadir a {mesaSeleccionada?.nombre || "Mesa"}</p>
                  <p className="text-blue-700/70 dark:text-blue-500 text-xs mt-0.5">Mesa seleccionada</p>
                </div>
              </button>
            </div>

            <Card className="overflow-hidden border-border shadow-sm">
              <CardContent className="p-3 sm:p-4 bg-muted/5">
                <MapaMesasAgrupado />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pedido" className="mt-0">
            {mesaSeleccionada ? (
              <PanelPedido />
            ) : (
              <div className="text-center p-8 text-muted-foreground rounded-xl border border-dashed border-border bg-card">
                Selecciona una mesa primero
              </div>
            )}
          </TabsContent>

          <TabsContent value="catalogo" className="mt-0">
            {mesaSeleccionada ? (
              <CatalogoProductos />
            ) : (
              <div className="text-center p-8 text-muted-foreground rounded-xl border border-dashed border-border bg-card">
                Selecciona una mesa primero
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
