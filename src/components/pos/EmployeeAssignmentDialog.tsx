"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Scissors, User, Package, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import type { ItemCarrito } from "@/types";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Empleado {
  id: string;
  nombre: string;
  imagen: string | null;
  porcentajeComision: number | null;
}

interface ProductoInventario {
  id: string;
  nombre: string;
  enStock: number;
  unidadBase?: string;
}

export interface ConsumoInterno {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
}

export interface AsignacionItem {
  itemId: string;
  empleadoId: string | null;
  consumos: ConsumoInterno[];
}

interface EmployeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemCarrito[];
  onConfirmar: (asignaciones: AsignacionItem[]) => void;
}

// ─── Componente de fila de consumo interno ────────────────────────────────────
function FilaConsumo({
  consumo,
  onEliminar,
}: {
  consumo: ConsumoInterno;
  onEliminar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
      <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-xs flex-1 truncate font-medium text-amber-800 dark:text-amber-300">
        {consumo.nombreProducto}
      </span>
      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex-shrink-0">
        × {consumo.cantidad}
      </span>
      <button
        type="button"
        onClick={onEliminar}
        className="text-amber-500 hover:text-red-500 transition-colors ml-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Componente de fila por ítem de servicio ──────────────────────────────────
function FilaServicio({
  item,
  asignacion,
  empleados,
  onEmpleadoChange,
  onAgregarConsumo,
  onEliminarConsumo,
}: {
  item: ItemCarrito;
  asignacion: AsignacionItem;
  empleados: Empleado[];
  onEmpleadoChange: (empleadoId: string) => void;
  onAgregarConsumo: (productoId: string, nombreProducto: string, cantidad: number) => void;
  onEliminarConsumo: (index: number) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [buscandoProducto, setBuscandoProducto] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoInventario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [cantidadConsumo, setCantidadConsumo] = useState(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoInventario | null>(null);

  const buscarProductos = async (termino: string) => {
    if (termino.length < 2) { setProductosEncontrados([]); return; }
    setBuscando(true);
    try {
      const res = await fetch(`/api/pos/productos/buscar?q=${encodeURIComponent(termino)}&soloInventario=true`);
      if (res.ok) {
        const data = await res.json();
        setProductosEncontrados(Array.isArray(data) ? data.slice(0, 6) : data.productos?.slice(0, 6) || []);
      }
    } catch { /* silencioso */ } finally { setBuscando(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => buscarProductos(buscandoProducto), 300);
    return () => clearTimeout(timer);
  }, [buscandoProducto]);

  const agregarConsumo = () => {
    if (!productoSeleccionado || cantidadConsumo <= 0) return;
    onAgregarConsumo(productoSeleccionado.id, productoSeleccionado.nombre, cantidadConsumo);
    setProductoSeleccionado(null);
    setBuscandoProducto("");
    setProductosEncontrados([]);
    setCantidadConsumo(1);
  };

  const empleadoActual = empleados.find((e) => e.id === asignacion.empleadoId);
  const tieneEmpleado = !!asignacion.empleadoId;

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${
      tieneEmpleado ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
    }`}>
      {/* Cabecera */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            tieneEmpleado ? "bg-primary/15" : "bg-muted"
          }`}>
            <Scissors className={`h-4 w-4 ${tieneEmpleado ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.producto.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.subtotal)}
            </p>
          </div>
          {tieneEmpleado && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
        </div>

        {/* Selector de empleado */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" />
            Empleado responsable
          </Label>
          <Select value={asignacion.empleadoId || ""} onValueChange={onEmpleadoChange}>
            <SelectTrigger className={`h-9 text-sm ${!tieneEmpleado ? "border-amber-400/50" : ""}`}>
              <SelectValue placeholder="Seleccionar empleado..." />
            </SelectTrigger>
            <SelectContent>
              {empleados.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                      {emp.nombre[0].toUpperCase()}
                    </div>
                    <span>{emp.nombre}</span>
                    {emp.porcentajeComision && (
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {emp.porcentajeComision}%
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sección de consumos internos */}
      <div className="border-t border-border/50">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5" />
            Consumos de inventario
            {asignacion.consumos.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {asignacion.consumos.length}
              </Badge>
            )}
          </span>
          {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expandido && (
          <div className="px-4 pb-4 space-y-3">
            {/* Lista de consumos existentes */}
            {asignacion.consumos.length > 0 && (
              <div className="space-y-2">
                {asignacion.consumos.map((c, i) => (
                  <FilaConsumo
                    key={i}
                    consumo={c}
                    onEliminar={() => onEliminarConsumo(i)}
                  />
                ))}
              </div>
            )}

            {/* Agregar consumo */}
            <div className="space-y-2 pt-1">
              <p className="text-xs text-muted-foreground">Buscar producto del inventario:</p>
              <div className="relative">
                <Input
                  placeholder="Nombre del producto..."
                  value={productoSeleccionado ? productoSeleccionado.nombre : buscandoProducto}
                  onChange={(e) => {
                    setProductoSeleccionado(null);
                    setBuscandoProducto(e.target.value);
                  }}
                  className="h-8 text-xs pr-8"
                />
                {buscando && (
                  <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {productosEncontrados.length > 0 && !productoSeleccionado && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {productosEncontrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                        onClick={() => {
                          setProductoSeleccionado(p);
                          setBuscandoProducto(p.nombre);
                          setProductosEncontrados([]);
                        }}
                      >
                        <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate">{p.nombre}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          Stock: {p.enStock}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={cantidadConsumo}
                    onChange={(e) => setCantidadConsumo(parseFloat(e.target.value) || 1)}
                    placeholder="Cantidad"
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  disabled={!productoSeleccionado}
                  onClick={agregarConsumo}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dialog principal ─────────────────────────────────────────────────────────
export function EmployeeAssignmentDialog({
  open,
  onOpenChange,
  items,
  onConfirmar,
}: EmployeeAssignmentDialogProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [asignaciones, setAsignaciones] = useState<AsignacionItem[]>([]);

  // Solo ítems de servicio
  const itemsServicio = items.filter((i) => i.producto.esServicio);

  // Inicializar asignaciones cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setAsignaciones(
        itemsServicio.map((item) => ({
          itemId: item.id,
          empleadoId: item.empleadoId || null,
          consumos: [],
        }))
      );
    }
  }, [open, items]);

  // Cargar empleados
  useEffect(() => {
    if (open && empleados.length === 0) {
      setCargandoEmpleados(true);
      fetch("/api/pos/empleados")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setEmpleados(data); })
        .catch(console.error)
        .finally(() => setCargandoEmpleados(false));
    }
  }, [open]);

  const actualizarEmpleado = (itemId: string, empleadoId: string) => {
    setAsignaciones((prev) =>
      prev.map((a) => (a.itemId === itemId ? { ...a, empleadoId } : a))
    );
  };

  const agregarConsumo = (
    itemId: string,
    productoId: string,
    nombreProducto: string,
    cantidad: number
  ) => {
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.itemId === itemId
          ? { ...a, consumos: [...a.consumos, { productoId, nombreProducto, cantidad }] }
          : a
      )
    );
  };

  const eliminarConsumo = (itemId: string, index: number) => {
    setAsignaciones((prev) =>
      prev.map((a) =>
        a.itemId === itemId
          ? { ...a, consumos: a.consumos.filter((_, i) => i !== index) }
          : a
      )
    );
  };

  const sinEmpleado = asignaciones.some((a) => !a.empleadoId);
  const todosAsignados = !sinEmpleado;

  const handleConfirmar = () => {
    onConfirmar(asignaciones);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 flex-shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            Asignación de Servicios
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Asigna un empleado a cada servicio y opcionalmente registra consumos de inventario.
          </p>
        </DialogHeader>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {cargandoEmpleados ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : itemsServicio.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay servicios en el carrito</p>
            </div>
          ) : (
            <>
              {sinEmpleado && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300/50 text-amber-700 dark:text-amber-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Asigna un empleado a cada servicio para calcular comisiones
                </div>
              )}

              {itemsServicio.map((item) => {
                const asignacion = asignaciones.find((a) => a.itemId === item.id)!;
                if (!asignacion) return null;
                return (
                  <FilaServicio
                    key={item.id}
                    item={item}
                    asignacion={asignacion}
                    empleados={empleados}
                    onEmpleadoChange={(empId) => actualizarEmpleado(item.id, empId)}
                    onAgregarConsumo={(prodId, nombre, cantidad) =>
                      agregarConsumo(item.id, prodId, nombre, cantidad)
                    }
                    onEliminarConsumo={(index) => eliminarConsumo(item.id, index)}
                  />
                );
              })}
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-border/60 gap-2 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!todosAsignados || cargandoEmpleados}
            className="flex-1"
          >
            {todosAsignados ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirmar y Cobrar
              </span>
            ) : (
              "Faltan empleados por asignar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
