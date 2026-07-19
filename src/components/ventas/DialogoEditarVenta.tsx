// src/components/ventas/DialogoEditarVenta.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, CreditCard, User, FileText } from "lucide-react";
import { toast } from "sonner";

interface Empleado {
  id: string;
  nombre: string;
}

interface ItemVenta {
  id: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  producto?: {
    id: string;
    nombre: string;
  };
  servicio?: {
    id: string;
    nombre: string;
  };
  empleado?: {
    id: string;
    nombre: string;
  } | null;
}

interface DetalleVenta {
  id: string;
  metodoPago: string;
  notas?: string | null;
  items: ItemVenta[];
}

interface DialogoEditarVentaProps {
  abierto: boolean;
  onClose: () => void;
  venta: DetalleVenta | null;
  onVentaActualizada?: (ventaActualizada: any) => void;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de Crédito", icon: "💳" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de Débito", icon: "💳" },
  { value: "TRANSFERENCIA", label: "Transferencia Bancaria", icon: "🏦" },
  { value: "NEQUI", label: "Transferencia (Nequi)", icon: "📱" },
  { value: "DAVIPLATA", label: "Transferencia (Daviplata)", icon: "📱" },
  { value: "FIADO", label: "Fiado", icon: "📝" },
  { value: "MIXTO", label: "Pago Mixto", icon: "💳" },
  { value: "OTRO", label: "Otro", icon: "💰" },
];

export function DialogoEditarVenta({
  abierto,
  onClose,
  venta,
  onVentaActualizada,
}: DialogoEditarVentaProps) {
  const [cargando, setCargando] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [metodoPago, setMetodoPago] = useState("");
  const [notas, setNotas] = useState("");
  const [itemsEmpleados, setItemsEmpleados] = useState<{ [itemId: string]: string }>({});

  // Cargar lista de empleados al abrir el diálogo
  useEffect(() => {
    if (abierto) {
      fetch("/api/usuarios?limite=1000")
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data && data.datos) {
            setEmpleados(data.datos);
          }
        })
        .catch((err) => {
          console.error("Error al cargar empleados:", err);
          toast.error("No se pudo cargar la lista de empleados");
        });
    }
  }, [abierto]);

  // Inicializar estado del formulario cuando cambia la venta
  useEffect(() => {
    if (venta) {
      setMetodoPago(venta.metodoPago);
      setNotas(venta.notas || "");
      
      const iniciales: { [itemId: string]: string } = {};
      venta.items.forEach((item) => {
        iniciales[item.id] = item.empleado?.id || "ninguno";
      });
      setItemsEmpleados(iniciales);
    }
  }, [venta, abierto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venta) return;

    try {
      setCargando(true);

      const itemsPayload = Object.entries(itemsEmpleados).map(([itemId, empleadoId]) => ({
        id: itemId,
        empleadoId: empleadoId === "ninguno" ? null : empleadoId,
      }));

      const response = await fetch(`/api/ventas/${venta.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metodoPago,
          notas: notas || undefined,
          items: itemsPayload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.mensaje || "Error al actualizar la venta");
      }

      const ventaActualizada = await response.json();
      toast.success("Venta editada y actualizada correctamente");

      if (onVentaActualizada) {
        onVentaActualizada(ventaActualizada);
      }

      onClose();
    } catch (error) {
      console.error("Error al editar la venta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al guardar los cambios"
      );
    } finally {
      setCargando(false);
    }
  };

  const handleEmpleadoChange = (itemId: string, empleadoId: string) => {
    setItemsEmpleados((prev) => ({
      ...prev,
      [itemId]: empleadoId,
    }));
  };

  if (!venta) return null;

  return (
    <Dialog open={abierto} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-[600px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            Editar Información de Venta
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Modifica el método de pago y el empleado asignado para cada ítem de esta venta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-3">
            {/* Método de Pago */}
            <div className="space-y-2">
              <Label htmlFor="editMetodoPago" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Método de Pago
              </Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger id="editMetodoPago">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODOS_PAGO.map((metodo) => (
                    <SelectItem key={metodo.value} value={metodo.value}>
                      <div className="flex items-center gap-2">
                        <span>{metodo.icon}</span>
                        <span>{metodo.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asignación de Empleados por Item */}
            <div className="space-y-3">
              <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                Empleados por Producto / Servicio
              </Label>

              <div className="border rounded-lg overflow-hidden divide-y bg-muted/20">
                {venta.items.map((item) => {
                  const nombreItem = item.producto?.nombre || item.servicio?.nombre || "Producto/Servicio";
                  return (
                    <div key={item.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground">{nombreItem}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Cant: {item.cantidad} • Subtotal: {new Intl.NumberFormat("es-CO", {
                            style: "currency",
                            currency: "COP",
                            minimumFractionDigits: 0,
                          }).format(item.subtotal)}
                        </p>
                      </div>
                      <div className="w-full sm:w-[220px]">
                        <Select
                          value={itemsEmpleados[item.id] || "ninguno"}
                          onValueChange={(val) => handleEmpleadoChange(item.id, val)}
                        >
                          <SelectTrigger className="w-full text-xs h-9">
                            <SelectValue placeholder="Seleccionar empleado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ninguno">Sin asignar / Ninguno</SelectItem>
                            {empleados.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="editNotas" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Notas de Venta
              </Label>
              <Textarea
                id="editNotas"
                placeholder="Notas u observaciones sobre esta venta o cambios realizados..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={cargando}
              className="w-full sm:w-auto h-9 text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando} className="w-full sm:w-auto h-9 text-xs sm:text-sm">
              {cargando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando Cambios...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
