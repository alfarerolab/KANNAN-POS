// src/components/ventas/DialogoRegistrarPago.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface VentaFiadaInfo {
  id: string;
  total: number;
  saldoPendiente: number;
  montoPagado: number;
  cliente?: {
    nombre: string;
  };
  fechaVencimiento?: Date | string;
}

interface DialogoRegistrarPagoProps {
  abierto: boolean;
  onClose: () => void;
  venta: VentaFiadaInfo | null;
  onPagoRegistrado?: () => void;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { value: "TARJETA", label: "Tarjeta", icon: "💳" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { value: "OTRO", label: "Otro", icon: "💰" },
];

export function DialogoRegistrarPago({
  abierto,
  onClose,
  venta,
  onPagoRegistrado,
}: DialogoRegistrarPagoProps) {
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    monto: "",
    metodoPago: "EFECTIVO",
    referencia: "",
    notas: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!venta) return;

    const montoNumerico = Number(formData.monto);

    if (!montoNumerico || montoNumerico <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (montoNumerico > (venta.saldoPendiente || 0)) {
      toast.error("El monto no puede ser mayor al saldo pendiente");
      return;
    }

    try {
      setCargando(true);

      const response = await fetch(`/api/ventas/${venta.id}/pagos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monto: montoNumerico,
          metodoPago: formData.metodoPago,
          referencia: formData.referencia || undefined,
          notas: formData.notas || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.mensaje || "Error al registrar el pago");
      }

      const resultado = await response.json();

      const saldoRestante = (venta.saldoPendiente || 0) - montoNumerico;

      if (saldoRestante <= 0) {
        toast.success("¡Pago completo registrado! La venta ha sido saldada.", {
          icon: "🎉",
        });
      } else {
        toast.success(
          `Pago parcial registrado. Saldo restante: ${formatearMoneda(saldoRestante)}`
        );
      }

      setFormData({
        monto: "",
        metodoPago: "EFECTIVO",
        referencia: "",
        notas: "",
      });

      onClose();

      if (onPagoRegistrado) {
        onPagoRegistrado();
      }
    } catch (error) {
      console.error("Error al registrar pago:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al registrar el pago"
      );
    } finally {
      setCargando(false);
    }
  };

  // Formatea visualmente el input con puntos de miles (es-CO)
  const formatearInputMoneda = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, "");
    if (!soloNumeros) return "";
    return Number(soloNumeros).toLocaleString("es-CO");
  };

  // Guarda solo los dígitos limpios en el estado
  const handleMontoChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "");
    setFormData({ ...formData, monto: soloNumeros });
  };

  const setPagoCompleto = () => {
    if (venta?.saldoPendiente) {
      setFormData({
        ...formData,
        monto: Math.round(venta.saldoPendiente).toString(),
      });
    }
  };

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cantidad);
  };

  const calcularNuevoSaldo = () => {
    const montoNumerico = Number(formData.monto) || 0;
    return (venta?.saldoPendiente || 0) - montoNumerico;
  };

  const esPagoCompleto = () => {
    const montoNumerico = Number(formData.monto) || 0;
    return montoNumerico >= (venta?.saldoPendiente || 0);
  };

  if (!venta) return null;

  return (
    <Dialog open={abierto} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-full sm:max-w-[500px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Registra un pago para la venta fiada de{" "}
            {venta.cliente?.nombre || "Cliente General"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {/* Información de la venta */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Total Venta:</span>
                <span className="font-semibold text-sm sm:text-base">{formatearMoneda(venta.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-muted-foreground">Ya Pagado:</span>
                <span className="text-green-600 dark:text-green-400 font-medium text-sm sm:text-base">
                  {formatearMoneda(venta.montoPagado || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs sm:text-sm font-medium">Saldo Pendiente:</span>
                <span className="text-red-600 dark:text-red-400 font-bold text-base sm:text-lg">
                  {formatearMoneda(venta.saldoPendiente || 0)}
                </span>
              </div>
            </div>

            {/* Alerta si está vencida */}
            {venta.fechaVencimiento &&
              new Date(venta.fechaVencimiento) < new Date() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <AlertDescription className="text-xs sm:text-sm">
                    Esta venta está vencida desde el{" "}
                    {new Date(venta.fechaVencimiento).toLocaleDateString("es-CO")}
                  </AlertDescription>
                </Alert>
              )}

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="monto" className="text-xs sm:text-sm">
                Monto del Pago <span className="text-red-500">*</span>
              </Label>
              {/* En móvil el botón va debajo */}
              <div className="flex flex-col xs:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    id="monto"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={formatearInputMoneda(formData.monto)}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    className="pl-6"
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={setPagoCompleto}
                  disabled={!venta.saldoPendiente}
                  className="w-full xs:w-auto"
                >
                  Pago Completo
                </Button>
              </div>
              {formData.monto && Number(formData.monto) > 0 && (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  {esPagoCompleto() ? (
                    <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pago Completo - Venta Saldada
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      Nuevo saldo: {formatearMoneda(calcularNuevoSaldo())}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <Label htmlFor="metodoPago" className="text-xs sm:text-sm">
                Método de Pago <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.metodoPago}
                onValueChange={(value) =>
                  setFormData({ ...formData, metodoPago: value })
                }
              >
                <SelectTrigger>
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

            {/* Referencia */}
            <div className="space-y-2">
              <Label htmlFor="referencia" className="text-xs sm:text-sm">
                Referencia{" "}
                <span className="text-muted-foreground text-xs">(Opcional)</span>
              </Label>
              <Input
                id="referencia"
                type="text"
                placeholder="Ej: Cheque #123, Transf. 456..."
                value={formData.referencia}
                onChange={(e) =>
                  setFormData({ ...formData, referencia: e.target.value })
                }
              />
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas" className="text-xs sm:text-sm">
                Notas{" "}
                <span className="text-muted-foreground text-xs">(Opcional)</span>
              </Label>
              <Textarea
                id="notas"
                placeholder="Observaciones adicionales..."
                value={formData.notas}
                onChange={(e) =>
                  setFormData({ ...formData, notas: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          {/* Footer: apilado en móvil, en fila en sm+ */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={cargando}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={cargando} className="w-full sm:w-auto">
              {cargando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Registrar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}