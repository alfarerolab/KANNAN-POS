"use client";

import { useEffect, useState } from "react";

import {
  EstacionPreparacionRestaurante,
  EstadoMesaRestaurante,
  EstadoPreparacionRestaurante,
} from "@/lib/prisma-types";
import type { ModoModulo } from "@/components/restaurante/context/RestauranteContext";
import {
  ArrowRightLeft,
  ChefHat,
  ClipboardList,
  CreditCard,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

import {
  RestauranteProvider,
  useRestaurante,
  ESTADOS_MESA_OPCIONES,
  METODOS_PAGO,
  type RolVista,
} from "@/components/restaurante/context/RestauranteContext";
import { MeseroView } from "@/components/restaurante/views/MeseroView";
import { CocinaView } from "@/components/restaurante/views/CocinaView";
import { CajaView } from "@/components/restaurante/views/CajaView";
import { ComandaPreparacion } from "@/components/restaurante/ComandaPreparacion";
import { CuentaConsumo } from "@/components/restaurante/CuentaConsumo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TicketPrinter } from "@/components/ui/ticket-printer";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import {
  ESTACIONES_PREPARACION,
  getEstacionPreparacionLabel,
} from "@/lib/restaurante-shared";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const ROLES: Array<{ id: RolVista; label: string; icon: typeof ChefHat }> = [
  { id: "mesero", label: "Mesero", icon: UtensilsCrossed },
  { id: "cocina", label: "Cocina / Barra", icon: ChefHat },
  { id: "caja", label: "Caja", icon: CreditCard },
];

function RestauranteHeader() {
  const { recargandoVista, recargarOperativo, mesaSeleccionada, modo } = useRestaurante();
  const esBar = modo === "bar";
  const badgeLabel = esBar ? "Bar" : "Restaurante";
  const badgeColors = esBar
    ? "bg-violet-500/15 text-violet-700 dark:text-violet-400 hover:bg-violet-500/15"
    : "bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-500/15";
  const gradientBg = esBar
    ? "from-violet-50 via-white to-purple-50"
    : "from-orange-50 via-white to-amber-50";
  const borderColor = esBar ? "border-violet-100" : "border-orange-100";
  const BadgeIcon = esBar ? Wine : Sparkles;
  return (
    <div className={`rounded-[28px] border ${borderColor} bg-gradient-to-br ${gradientBg} p-5 shadow-sm`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge className={badgeColors}>
            <BadgeIcon className="mr-1 h-3 w-3" />
            {badgeLabel}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {esBar ? "Operación de barra y comandas" : "Operación de mesas y comandas"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => recargarOperativo(mesaSeleccionada?.id)}
            disabled={recargandoVista}
          >
            {recargandoVista ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}

function DialogsGlobales() {
  const {
    configuracion, pedidoActivo, mesaSeleccionada, clientes, preparacionItems,
    crearMesaOpen, setCrearMesaOpen, editarMesaOpen, setEditarMesaOpen,
    productoOpen, setProductoOpen, selectedProduct,
    itemOpen, setItemOpen, selectedItem,
    unirMesasOpen, setUnirMesasOpen, moverMesaOpen, setMoverMesaOpen,
    facturarOpen, setFacturarOpen, imprimirOpen, setImprimirOpen,
    dividirCuentaOpen, setDividirCuentaOpen, comandaOpen, setComandaOpen,
    ticketPrinterOpen, setTicketPrinterOpen, ticketData,
    nuevaMesa, setNuevaMesa, mesaForm, setMesaForm,
    facturaForm, setFacturaForm, productoForm, setProductoForm,
    itemForm, setItemForm, mesasParaUnir, setMesasParaUnir,
    desunirMesaId, setDesunirMesaId,
    mesaDestinoId, setMesaDestinoId, divisionPersonas, setDivisionPersonas,
    divisionItems, setDivisionItems, divisionIgual, divisionSeleccionada,
    mesasDisponiblesParaUnir, mesasDisponiblesParaMover,
    filtroEstacion, setFiltroEstacion,
    creandoMesa, guardandoMesa, agregandoProducto, actualizandoItem,
    uniendoMesas, moviendoMesa, facturandoCuenta, dividiendoCuenta,
    printCuentaRef, printComandaRef, handlePrintCuenta, handlePrintComanda,
    crearMesaHandler, guardarMesaHandler, desactivarMesaHandler,
    agregarProductoHandler, guardarItemHandler, unirMesasHandler, desunirMesaHandler,
    moverMesaHandler, facturarCuenta, dividirPorItemsHandler, facturarFraccionadoHandler,
  } = useRestaurante();

  const [pagosFraccionados, setPagosFraccionados] = useState<Array<{ metodoPago: string; monto: number }>>([]);

  useEffect(() => {
    if (dividirCuentaOpen && pedidoActivo) {
       // Reset pagos fraccionados when modal opens
       const initialPagos = Array(divisionPersonas).fill(null).map(() => ({
         metodoPago: "EFECTIVO",
         monto: divisionIgual.valorPorPersona
       }));
       setPagosFraccionados(initialPagos);
    }
  }, [dividirCuentaOpen, pedidoActivo, divisionPersonas, divisionIgual.valorPorPersona]);

  const handleMontoPagoChange = (index: number, montoStr: string) => {
    const newPagos = [...pagosFraccionados];
    newPagos[index].monto = Number(montoStr);
    setPagosFraccionados(newPagos);
  };

  const handleMetodoPagoChange = (index: number, metodo: string) => {
    const newPagos = [...pagosFraccionados];
    newPagos[index].metodoPago = metodo;
    setPagosFraccionados(newPagos);
  };


  return (
    <>
      <Dialog open={crearMesaOpen} onOpenChange={setCrearMesaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear nueva mesa</DialogTitle><DialogDescription>Registra una mesa para empezar a manejar cuentas de consumo.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={nuevaMesa.nombre} onChange={(e) => setNuevaMesa({ ...nuevaMesa, nombre: e.target.value })} /></div>
            <div className="space-y-2"><Label>Capacidad</Label><Input type="number" min={1} value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: Number(e.target.value || 1) })} /></div>
            <div className="space-y-2"><Label>Ubicación</Label><Input value={nuevaMesa.ubicacion} onChange={(e) => setNuevaMesa({ ...nuevaMesa, ubicacion: e.target.value })} /></div>
            <Button className="w-full" onClick={crearMesaHandler} disabled={creandoMesa}>
              {creandoMesa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Crear mesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editarMesaOpen} onOpenChange={setEditarMesaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar mesa</DialogTitle><DialogDescription>Ajusta nombre, capacidad y estado operativo.</DialogDescription></DialogHeader>
          {mesaSeleccionada && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nombre</Label><Input value={mesaForm.nombre} onChange={(e) => setMesaForm({ ...mesaForm, nombre: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Capacidad</Label><Input type="number" min={1} value={mesaForm.capacidad} onChange={(e) => setMesaForm({ ...mesaForm, capacidad: Number(e.target.value || 1) })} /></div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={mesaForm.estado} onValueChange={(v) => setMesaForm({ ...mesaForm, estado: v as EstadoMesaRestaurante })} disabled={Boolean(mesaSeleccionada.pedidoAbierto)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS_MESA_OPCIONES.filter((e) => mesaSeleccionada.pedidoAbierto ? e.value === "OCUPADA" : true).map((e) => (<SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Ubicación</Label><Input value={mesaForm.ubicacion} onChange={(e) => setMesaForm({ ...mesaForm, ubicacion: e.target.value })} /></div>
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1" onClick={guardarMesaHandler} disabled={guardandoMesa}>{guardandoMesa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Guardar cambios</Button>
                <Button variant="outline" onClick={desactivarMesaHandler} disabled={guardandoMesa || Boolean(mesaSeleccionada.pedidoAbierto)}><Trash2 className="mr-2 h-4 w-4" />Desactivar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={productoOpen} onOpenChange={setProductoOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar consumo a la mesa</DialogTitle><DialogDescription>Define cantidad, nota y estación.</DialogDescription></DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="font-semibold text-foreground">{selectedProduct.nombre}</p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedProduct.categoria?.nombre || "Sin categoría"} · {selectedProduct.precio != null ? formatCurrency(selectedProduct.precio) : "Sin precio"}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Cantidad</Label><Input type="number" min={1} value={productoForm.cantidad} onChange={(e) => setProductoForm((p) => ({ ...p, cantidad: Number(e.target.value || 1) }))} /></div>
                <div className="space-y-2">
                  <Label>Estación</Label>
                  <Select value={productoForm.estacion} onValueChange={(v) => setProductoForm((p) => ({ ...p, estacion: v as EstacionPreparacionRestaurante }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTACIONES_PREPARACION.map((e) => (<SelectItem key={e} value={e}>{getEstacionPreparacionLabel(e)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Nota del producto</Label><Textarea value={productoForm.notas} onChange={(e) => setProductoForm((p) => ({ ...p, notas: e.target.value }))} /></div>
              <Button className="w-full" onClick={agregarProductoHandler} disabled={agregandoProducto}>{agregandoProducto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Agregar a la cuenta</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar item del pedido</DialogTitle><DialogDescription>Ajusta cantidad, notas y avance de preparación.</DialogDescription></DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Cantidad</Label><Input type="number" min={1} value={itemForm.cantidad} onChange={(e) => setItemForm((p) => ({ ...p, cantidad: Number(e.target.value || 1) }))} /></div>
                <div className="space-y-2">
                  <Label>Estación</Label>
                  <Select value={itemForm.estacion} onValueChange={(v) => setItemForm((p) => ({ ...p, estacion: v as EstacionPreparacionRestaurante }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTACIONES_PREPARACION.map((e) => (<SelectItem key={e} value={e}>{getEstacionPreparacionLabel(e)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado de preparación</Label>
                <Select value={itemForm.estadoPreparacion} onValueChange={(v) => setItemForm((p) => ({ ...p, estadoPreparacion: v as EstadoPreparacionRestaurante }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={"PENDIENTE"}>Pendiente</SelectItem>
                    <SelectItem value={"EN_PREPARACION"}>En preparación</SelectItem>
                    <SelectItem value={"LISTO"}>Listo</SelectItem>
                    <SelectItem value={"ENTREGADO"}>Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Notas</Label><Textarea value={itemForm.notas} onChange={(e) => setItemForm((p) => ({ ...p, notas: e.target.value }))} /></div>
              <Button className="w-full" onClick={guardarItemHandler} disabled={actualizandoItem}>{actualizandoItem ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}Guardar item</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={unirMesasOpen} onOpenChange={(val) => {
        setUnirMesasOpen(val);
        if (!val) setDesunirMesaId("sin-mesa");
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unir / Desunir mesas</DialogTitle><DialogDescription>Gestiona las mesas que comparten la cuenta actual.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Unir mesas</p>
            {mesasDisponiblesParaUnir.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No hay otras mesas disponibles para unir.</div>
            ) : mesasDisponiblesParaUnir.map((mesa) => {
              const checked = mesasParaUnir.includes(mesa.id);
              return (
                <button key={mesa.id} type="button" className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${checked ? "border-orange-500/40 bg-orange-500/10" : "border-border hover:border-border"}`} onClick={() => setMesasParaUnir((prev) => prev.includes(mesa.id) ? prev.filter((id) => id !== mesa.id) : [...prev, mesa.id])}>
                  <div><p className="font-medium text-foreground">{mesa.nombre}</p><p className="text-sm text-muted-foreground">{mesa.pedidoAbierto ? `Consumo: ${formatCurrency(mesa.pedidoAbierto.total)}` : "Mesa libre sin consumo"}</p></div>
                  <Badge variant={checked ? "default" : "secondary"}>{checked ? "Seleccionada" : "Libre"}</Badge>
                </button>
              );
            })}
            <Button className="w-full" disabled={mesasParaUnir.length === 0 || uniendoMesas} onClick={unirMesasHandler}>{uniendoMesas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}Consolidar mesas seleccionadas</Button>
            
            {pedidoActivo && pedidoActivo.mesas.length > 1 && (
              <div className="pt-4 border-t border-border mt-4">
                <p className="text-sm font-semibold text-destructive">Desunir una mesa</p>
                <div className="mt-3 space-y-2">
                  {pedidoActivo.mesas
                    .filter((mp) => mp.mesa.id !== mesaSeleccionada?.id)
                    .map((mp) => {
                      const isSelected = desunirMesaId === mp.mesa.id;
                      return (
                        <button
                          key={mp.mesa.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                            isSelected
                              ? "border-destructive/40 bg-destructive/10"
                              : "border-border hover:border-border"
                          }`}
                          onClick={() => setDesunirMesaId(isSelected ? "sin-mesa" : mp.mesa.id)}
                        >
                          <p className="font-medium text-foreground">{mp.mesa.nombre}</p>
                          <Badge variant={isSelected ? "destructive" : "secondary"}>
                            {isSelected ? "A desunir" : "Unida"}
                          </Badge>
                        </button>
                      );
                    })}
                </div>
                <Button
                  variant="destructive"
                  className="w-full mt-3"
                  disabled={desunirMesaId === "sin-mesa" || uniendoMesas}
                  onClick={() => desunirMesaHandler(desunirMesaId)}
                >
                  {uniendoMesas ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Minus className="mr-2 h-4 w-4" />
                  )}
                  Separar mesa de la cuenta
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={moverMesaOpen} onOpenChange={setMoverMesaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mover cuenta a otra mesa</DialogTitle><DialogDescription>Traslada la cuenta activa a una mesa libre sin perder el consumo.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mesa destino</Label>
              <Select value={mesaDestinoId} onValueChange={setMesaDestinoId}>
                <SelectTrigger><SelectValue placeholder="Selecciona una mesa libre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-destino">Selecciona una mesa</SelectItem>
                  {mesasDisponiblesParaMover.map((mesa) => (<SelectItem key={mesa.id} value={mesa.id}>{mesa.nombre} · {mesa.ubicacion || "Sin zona"}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={moverMesaHandler} disabled={moviendoMesa || mesaDestinoId === "sin-destino"}>{moviendoMesa ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}Confirmar movimiento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={facturarOpen} onOpenChange={setFacturarOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cobrar cuenta</DialogTitle><DialogDescription>Cierra el consumo de la mesa, genera la venta e imprime el ticket final.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Total a cobrar</p><p className="mt-1 text-3xl font-semibold text-foreground">{formatCurrency(pedidoActivo?.total || 0)}</p></div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={facturaForm.metodoPago} onValueChange={(v) => setFacturaForm((p) => ({ ...p, metodoPago: v as typeof facturaForm.metodoPago }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METODOS_PAGO.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente para la venta</Label>
              <Select value={facturaForm.clienteId} onValueChange={(v) => setFacturaForm((p) => ({ ...p, clienteId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sin-cliente">Consumidor final</SelectItem>{clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={facturaForm.notas} onChange={(e) => setFacturaForm((p) => ({ ...p, notas: e.target.value }))} /></div>
            <Button className="w-full" onClick={facturarCuenta} disabled={facturandoCuenta}>{facturandoCuenta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Confirmar cobro y emitir ticket</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={imprimirOpen} onOpenChange={setImprimirOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Precuenta de consumo</DialogTitle><DialogDescription>Revisa el consumo actual e imprímelo para la mesa.</DialogDescription></DialogHeader>
          {!pedidoActivo ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay una cuenta activa para imprimir.</div>
          ) : (
            <><div className="max-h-[60vh] overflow-y-auto rounded-3xl bg-muted p-4"><div ref={printCuentaRef}><CuentaConsumo pedido={pedidoActivo} nombreEmpresa={configuracion?.empresa?.nombre} /></div></div><Button className="w-full" onClick={() => handlePrintCuenta?.()}><Printer className="mr-2 h-4 w-4" />Imprimir precuenta</Button></>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dividirCuentaOpen} onOpenChange={setDividirCuentaOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Dividir cuenta</DialogTitle><DialogDescription>Calcula divisiones por personas o por productos.</DialogDescription></DialogHeader>
          {!pedidoActivo ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay una cuenta activa para dividir.</div>
          ) : (
            <Tabs defaultValue="personas">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="personas">Por personas</TabsTrigger><TabsTrigger value="productos">Por productos</TabsTrigger></TabsList>
              <TabsContent value="personas" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="space-y-2"><Label>Número de personas</Label><Input type="number" min={1} value={divisionPersonas} onChange={(e) => setDivisionPersonas(Number(e.target.value || 1))} /></div>
                  <div className="rounded-3xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Valor referencial por persona</p><p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(divisionIgual.valorPorPersona)}</p></div>
                </div>
                <div className="space-y-3 mt-4">
                  <Label>Registro de pagos fraccionados</Label>
                  {pagosFraccionados.map((pago, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border border-border p-3">
                      <div className="w-12 text-center font-bold text-muted-foreground">#{idx + 1}</div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Monto a pagar</Label>
                        <Input type="number" min={0} step="0.01" value={pago.monto} onChange={(e) => handleMontoPagoChange(idx, e.target.value)} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Método</Label>
                        <Select value={pago.metodoPago} onValueChange={(v) => handleMetodoPagoChange(idx, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{METODOS_PAGO.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-2 text-sm text-muted-foreground">
                     <span>Total recolectado: {formatCurrency(pagosFraccionados.reduce((acc, p) => acc + p.monto, 0))}</span>
                     <span className={pagosFraccionados.reduce((acc, p) => acc + p.monto, 0) < Number(pedidoActivo.total) ? "text-red-500" : "text-emerald-500"}>
                       Falta: {formatCurrency(Math.max(0, Number(pedidoActivo.total) - pagosFraccionados.reduce((acc, p) => acc + p.monto, 0)))}
                     </span>
                  </div>
                </div>
                <Button className="w-full" disabled={dividiendoCuenta || pagosFraccionados.reduce((acc, p) => acc + p.monto, 0) < Number(pedidoActivo.total)} onClick={() => facturarFraccionadoHandler(pagosFraccionados as any)}>
                   {dividiendoCuenta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Cobrar {divisionPersonas} fracciones simultáneas
                </Button>
              </TabsContent>
              <TabsContent value="productos" className="mt-4 space-y-4">
                <div className="space-y-3">
                  {pedidoActivo.items.map((item) => {
                    const cantSel = divisionItems[item.id] || 0;
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4">
                        <div><p className="font-medium text-foreground">{item.nombreProducto}</p><p className="text-sm text-muted-foreground">Disponible: {item.cantidad} · {formatCurrency(item.precioUnitario)} c/u</p></div>
                        <div className="inline-flex items-center rounded-full border border-border">
                          <button type="button" className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted" onClick={() => setDivisionItems((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}><Minus className="h-4 w-4" /></button>
                          <span className="min-w-10 text-center text-sm font-semibold">{cantSel}</span>
                          <button type="button" className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-muted" onClick={() => setDivisionItems((prev) => ({ ...prev, [item.id]: Math.min(item.cantidad, (prev[item.id] || 0) + 1) }))}><Plus className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[["Parcial seleccionado", divisionSeleccionada?.totalSeleccionado || 0], ["Saldo restante", divisionSeleccionada?.totalRestante || 0]].map(([label, val]) => (
                    <div key={String(label)} className="rounded-3xl border border-border bg-muted/50 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(Number(val))}</p></div>
                  ))}
                </div>
                
                <div className="space-y-4 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 mt-4">
                  <div className="space-y-2">
                    <Label>Método de pago (Sub-cuenta seleccionada)</Label>
                    <Select value={facturaForm.metodoPago} onValueChange={(v) => setFacturaForm((p) => ({ ...p, metodoPago: v as typeof facturaForm.metodoPago }))}>
                      <SelectTrigger className="bg-card dark:bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>{METODOS_PAGO.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente para esta extracción</Label>
                    <Select value={facturaForm.clienteId} onValueChange={(v) => setFacturaForm((p) => ({ ...p, clienteId: v }))}>
                      <SelectTrigger className="bg-card dark:bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="sin-cliente">Consumidor final</SelectItem>{clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" variant="default" disabled={dividiendoCuenta || (divisionSeleccionada?.totalSeleccionado || 0) === 0} onClick={dividirPorItemsHandler}>
                    {dividiendoCuenta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Cobrar productos y facturarlos
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={comandaOpen} onOpenChange={setComandaOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Comanda imprimible</DialogTitle><DialogDescription>Genera la comanda de cocina, barra o general según la estación.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estación</Label>
              <Select value={filtroEstacion} onValueChange={(v) => setFiltroEstacion(v as EstacionPreparacionRestaurante)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTACIONES_PREPARACION.map((e) => (<SelectItem key={e} value={e}>{getEstacionPreparacionLabel(e)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {preparacionItems.filter((item) => item.estacion === filtroEstacion && item.estadoPreparacion !== "ENTREGADO").length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No hay items activos para esta estación.</div>
            ) : (
              <><div className="max-h-[60vh] overflow-y-auto rounded-3xl bg-muted p-4"><div ref={printComandaRef}><ComandaPreparacion estacion={filtroEstacion} items={preparacionItems.filter((item) => item.estacion === filtroEstacion && item.estadoPreparacion !== "ENTREGADO")} nombreEmpresa={configuracion?.empresa?.nombre} /></div></div><Button className="w-full" onClick={() => handlePrintComanda?.()}><Printer className="mr-2 h-4 w-4" />Imprimir comanda</Button></>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ticketData && (<TicketPrinter ticketData={ticketData} open={ticketPrinterOpen} onOpenChange={setTicketPrinterOpen} onPrintComplete={() => setTicketPrinterOpen(false)} />)}
    </>
  );
}

function RestauranteContenido() {
  const { cargandoVista, rolVista, setCrearMesaOpen } = useRestaurante();
  if (cargandoVista) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando sala, pedidos, comandas y reportes...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <RestauranteHeader />
      {rolVista === "mesero" && (<><div className="flex justify-end"><Button className="bg-background text-primary-foreground hover:bg-card" onClick={() => setCrearMesaOpen(true)}><Plus className="mr-2 h-4 w-4" />Nueva mesa</Button></div><MeseroView /></>)}
      {rolVista === "cocina" && <CocinaView />}
      {rolVista === "caja" && <CajaView />}
      <DialogsGlobales />
    </div>
  );
}

export function RestauranteModule({ defaultView, modo = "restaurante" }: { defaultView?: "mesero" | "cocina" | "caja"; modo?: ModoModulo }) {
  const { configuracion, configNegocio, estaCargando, configuracionCargada } = useConfiguracionEmpresa();

  // While config is still loading, show a spinner instead of the "not available" card
  if (estaCargando || !configuracionCargada) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-sm text-muted-foreground">Cargando configuración del módulo...</p>
        </div>
      </div>
    );
  }

  const tipoNegocio = configuracion?.tipoNegocio;
  const moduloDisponible = configNegocio?.navegacion?.mostrarMesas || tipoNegocio === "RESTAURANTE" || tipoNegocio === "BAR" || tipoNegocio === "CAFETERIA" || tipoNegocio === "PERSONALIZADO";
  if (!moduloDisponible) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <UtensilsCrossed className="h-10 w-10 text-orange-500" />
          <div><p className="text-lg font-semibold">Módulo orientado a restaurante/bar</p><p className="text-sm text-muted-foreground">Activa un tipo de negocio con manejo de mesas para usar esta vista.</p></div>
        </CardContent>
      </Card>
    );
  }
  return (<RestauranteProvider defaultView={defaultView} modo={modo}><RestauranteContenido /></RestauranteProvider>);
}
