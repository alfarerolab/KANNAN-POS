// src/components/ventas/DialogoPagarDeudaTotal.tsx
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Users,
  TrendingDown,
  Calendar,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
}

interface VentaFiada {
  id: string;
  fechaCreacion: Date | string;
  total: number;
  saldoPendiente: number;
  montoPagado: number;
  estadoPago: string;
  fechaVencimiento?: Date | string;
  cantidadPagos: number;
}

interface ResumenDeuda {
  deudaTotal: number;
  totalOriginal: number;
  totalPagado: number;
  cantidadVentas: number;
  ventasVencidas: number;
}

interface DialogoPagarDeudaTotalProps {
  abierto: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onPagoRegistrado?: () => void;
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { value: "TARJETA", label: "Tarjeta", icon: "💳" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { value: "OTRO", label: "Otro", icon: "💰" },
];

export function DialogoPagarDeudaTotal({
  abierto,
  onClose,
  cliente,
  onPagoRegistrado,
}: DialogoPagarDeudaTotalProps) {
  const [cargando, setCargando] = useState(false);
  const [cargandoDeuda, setCargandoDeuda] = useState(false);
  const [deudaInfo, setDeudaInfo] = useState<{
    resumen: ResumenDeuda;
    ventas: VentaFiada[];
  } | null>(null);

  const [formData, setFormData] = useState({
    monto: "",
    metodoPago: "EFECTIVO",
    referencia: "",
    notas: "",
  });

  useEffect(() => {
    if (abierto && cliente) {
      cargarDeudaCliente();
    } else {
      setDeudaInfo(null);
      setFormData({
        monto: "",
        metodoPago: "EFECTIVO",
        referencia: "",
        notas: "",
      });
    }
  }, [abierto, cliente]);

  const cargarDeudaCliente = async () => {
    if (!cliente) return;

    try {
      setCargandoDeuda(true);
      const response = await fetch(`/api/clientes/${cliente.id}/deuda-total`);

      if (!response.ok) {
        throw new Error("Error al cargar información de deuda");
      }

      const data = await response.json();
      setDeudaInfo({
        resumen: data.resumen,
        ventas: data.ventas,
      });
    } catch (error) {
      console.error("Error al cargar deuda:", error);
      toast.error("Error al cargar la información de deuda");
    } finally {
      setCargandoDeuda(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cliente || !deudaInfo) return;

    const montoNumerico = Number(formData.monto);

    if (!montoNumerico || montoNumerico <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (montoNumerico > deudaInfo.resumen.deudaTotal) {
      toast.error("El monto no puede ser mayor a la deuda total");
      return;
    }

    try {
      setCargando(true);

      const response = await fetch(`/api/clientes/${cliente.id}/pagar-deuda`, {
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
        throw new Error(error.mensaje || "Error al procesar el pago");
      }

      const resultado = await response.json();

      toast.success(
        `¡Pago registrado exitosamente!
        ${resultado.resumen.ventasAfectadas} ventas actualizadas,
        ${resultado.resumen.ventasSaldadas} completamente saldadas.`,
        {
          icon: "🎉",
          duration: 5000,
        }
      );

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
      console.error("Error al procesar pago:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al procesar el pago"
      );
    } finally {
      setCargando(false);
    }
  };

  const formatearInputMoneda = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, "");
    if (!soloNumeros) return "";
    return Number(soloNumeros).toLocaleString("es-CO");
  };

  const handleMontoChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "");
    setFormData({ ...formData, monto: soloNumeros });
  };

  const setPagoCompleto = () => {
    if (deudaInfo?.resumen.deudaTotal) {
      setFormData({
        ...formData,
        monto: Math.round(deudaInfo.resumen.deudaTotal).toString(),
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

  const formatearFecha = (fecha: Date | string) => {
    return new Date(fecha).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calcularNuevaDeuda = () => {
    const montoNumerico = Number(formData.monto) || 0;
    return (deudaInfo?.resumen.deudaTotal || 0) - montoNumerico;
  };

  const esPagoCompleto = () => {
    const montoNumerico = Number(formData.monto) || 0;
    return montoNumerico >= (deudaInfo?.resumen.deudaTotal || 0);
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      PENDIENTE: { className: "bg-amber-500/15 text-yellow-800", label: "Pendiente" },
      PAGO_PARCIAL: { className: "bg-blue-500/15 text-blue-800 dark:text-blue-300", label: "Pago Parcial" },
      VENCIDO: { className: "bg-destructive/15 text-red-800 dark:text-red-300", label: "Vencido" },
      PAGADO: { className: "bg-emerald-500/15 text-green-800 dark:text-green-300", label: "Pagado" },
    };
    const estadoConfig = config[estado as keyof typeof config] || config.PENDIENTE;
    return (
      <Badge className={estadoConfig.className}>{estadoConfig.label}</Badge>
    );
  };

  if (!cliente) return null;

  return (
    <Dialog open={abierto} onOpenChange={onClose}>
      {/* 
        - w-full con mx-auto para centrarlo en móvil
        - max-w progresivo: full en móvil, [700px] en sm+
        - max-h con overflow para no salirse de pantalla en móvil
        - p-4 en móvil, p-6 en sm+
      */}
      <DialogContent className="w-full max-w-full sm:max-w-[700px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg leading-tight">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Pagar Deuda Total – {cliente.nombre}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            El pago se distribuirá automáticamente empezando por la venta más
            antigua
          </DialogDescription>
        </DialogHeader>

        {cargandoDeuda ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !deudaInfo ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar la información de deuda
            </AlertDescription>
          </Alert>
        ) : deudaInfo.resumen.cantidadVentas === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              ¡Este cliente no tiene deudas pendientes!
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-3 sm:py-4">
              {/* Resumen de Deuda */}
              <Card>
                <CardHeader className="pb-2 pt-3 px-3 sm:px-4 sm:pt-4">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    Resumen de Deuda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4">
                  {/* Grid: 1 columna en móvil, 2 en sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Deuda Total
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatearMoneda(deudaInfo.resumen.deudaTotal)}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Total Pagado
                      </p>
                      <p className="text-lg sm:text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatearMoneda(deudaInfo.resumen.totalPagado)}
                      </p>
                    </div>
                  </div>

                  {/* Badges en fila, con wrap para pantallas pequeñas */}
                  <div className="flex flex-wrap gap-2 sm:gap-4 pt-2 border-t">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm">
                        {deudaInfo.resumen.cantidadVentas} ventas pendientes
                      </span>
                    </div>
                    {deudaInfo.resumen.ventasVencidas > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {deudaInfo.resumen.ventasVencidas} vencidas
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Ventas Pendientes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Ventas Pendientes (ordenadas por antigüedad)
                </Label>
                {/* Altura adaptativa: más corta en móvil */}
                <ScrollArea className="h-[140px] sm:h-[180px] rounded-md border p-2 sm:p-3">
                  <div className="space-y-2">
                    {deudaInfo.ventas.map((venta, index) => (
                      <div
                        key={venta.id}
                        className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-1.5 p-2 bg-muted/50 rounded-lg text-xs sm:text-sm"
                      >
                        {/* Lado izquierdo: número, fecha, estado */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-xs px-1.5 py-0">
                            #{index + 1}
                          </Badge>
                          <span className="text-muted-foreground">
                            {formatearFecha(venta.fechaCreacion)}
                          </span>
                          {getEstadoBadge(venta.estadoPago)}
                        </div>
                        {/* Lado derecho: monto + badge "Primera" */}
                        <div className="flex items-center gap-1.5 self-end xs:self-auto">
                          <span className="font-semibold">
                            {formatearMoneda(venta.saldoPendiente)}
                          </span>
                          {index === 0 && (
                            <Badge className="bg-primary/10 text-primary text-xs px-1.5 py-0">
                              Primera
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  El pago se aplicará primero a la venta #1, luego a la #2, y así
                  sucesivamente
                </p>
              </div>

              {/* Formulario de Pago */}
              <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t">
                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="monto" className="text-xs sm:text-sm">
                    Monto del Pago <span className="text-red-500">*</span>
                  </Label>
                  {/* En móvil el botón va debajo del input */}
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
                      className="w-full xs:w-auto"
                    >
                      Pago Completo
                    </Button>
                  </div>
                  {formData.monto && parseFloat(formData.monto) > 0 && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      {esPagoCompleto() ? (
                        <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pagará toda la deuda
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          Deuda restante: {formatearMoneda(calcularNuevaDeuda())}
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
                    <span className="text-muted-foreground text-xs">
                      (Opcional)
                    </span>
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
                    <span className="text-muted-foreground text-xs">
                      (Opcional)
                    </span>
                  </Label>
                  <Textarea
                    id="notas"
                    placeholder="Observaciones adicionales..."
                    value={formData.notas}
                    onChange={(e) =>
                      setFormData({ ...formData, notas: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Footer: botones apilados en móvil, en fila en sm+ */}
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
              <Button
                type="submit"
                disabled={cargando}
                className="w-full sm:w-auto"
              >
                {cargando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Registrar Pago
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}