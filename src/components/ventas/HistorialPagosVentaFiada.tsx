// src/components/ventas/HistorialPagosVentaFiada.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

interface Pago {
  id: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  notas?: string;
  fechaPago: string;
}

interface VentaFiada {
  id: string;
  total: number;
  montoPagado: number;
  saldoPendiente: number;
  estadoPago: string;
  fechaVencimiento?: string;
  cliente?: {
    nombre: string;
  };
}

const METODOS_PAGO = [
  { value: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { value: "NEQUI", label: "Nequi", icon: "📱" },
  { value: "DAVIPLATA", label: "Daviplata", icon: "📱" },
  { value: "BANCOLOMBIA", label: "Bancolombia", icon: "🏦" },
  { value: "TARJETA_CREDITO", label: "Tarjeta de Crédito", icon: "💳" },
  { value: "TARJETA_DEBITO", label: "Tarjeta de Débito", icon: "💳" },
  { value: "OTRO", label: "Otro", icon: "💰" },
];

interface HistorialPagosVentaFiadaProps {
  ventaId: string;
  onPagoRegistrado?: () => void;
}

export function HistorialPagosVentaFiada({
  ventaId,
  onPagoRegistrado,
}: HistorialPagosVentaFiadaProps) {
  const { data: session } = useSession();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [venta, setVenta] = useState<VentaFiada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [enviandoPago, setEnviandoPago] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [pagoAEliminar, setPagoAEliminar] = useState<string | null>(null);

  const [formPago, setFormPago] = useState({
    monto: "",
    metodoPago: "EFECTIVO",
    referencia: "",
    notas: "",
  });

  const cargarPagos = async () => {
    try {
      setCargando(true);
      const response = await fetch(`/api/ventas/${ventaId}/pagos`);

      if (!response.ok) {
        throw new Error("Error al cargar pagos");
      }

      const data = await response.json();
      setPagos(data.pagos || []);

      if (data.resumen) {
        setVenta({
          id: ventaId,
          total: data.resumen.totalVenta,
          montoPagado: data.resumen.montoPagado,
          saldoPendiente: data.resumen.saldoPendiente,
          estadoPago:
            data.resumen.saldoPendiente <= 0 ? "PAGADO" : "PAGO_PARCIAL",
        });
      }
    } catch (err) {
      console.error("Error al cargar pagos:", err);
      setError("No se pudieron cargar los pagos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (ventaId) {
      cargarPagos();
    }
  }, [ventaId]);

  // Formatea visualmente el input con puntos de miles (es-CO)
  const formatearInputMoneda = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, "");
    if (!soloNumeros) return "";
    return Number(soloNumeros).toLocaleString("es-CO");
  };

  // Guarda solo los dígitos limpios en el estado
  const handleMontoChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "");
    setFormPago({ ...formPago, monto: soloNumeros });
  };

  const setPagoCompleto = () => {
    if (venta?.saldoPendiente) {
      setFormPago({
        ...formPago,
        monto: Math.round(venta.saldoPendiente).toString(),
      });
    }
  };

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPago.monto || Number(formPago.monto) <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    if (!venta) return;

    if (Number(formPago.monto) > venta.saldoPendiente) {
      setError(
        `El monto no puede exceder el saldo pendiente (${formatCurrency(venta.saldoPendiente)})`
      );
      return;
    }

    try {
      setEnviandoPago(true);
      setError(null);

      const response = await fetch(`/api/ventas/${ventaId}/pagos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monto: Number(formPago.monto),
          metodoPago: formPago.metodoPago,
          referencia: formPago.referencia || undefined,
          notas: formPago.notas || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al registrar pago");
      }

      await cargarPagos();

      setFormPago({
        monto: "",
        metodoPago: "EFECTIVO",
        referencia: "",
        notas: "",
      });

      setDialogAbierto(false);
      onPagoRegistrado?.();
    } catch (err: any) {
      console.error("Error al registrar pago:", err);
      setError(err.message || "Error al registrar pago");
    } finally {
      setEnviandoPago(false);
    }
  };

  const confirmarEliminarPago = (pagoId: string) => {
    setPagoAEliminar(pagoId);
  };

  const ejecutarEliminarPago = async () => {
    if (!pagoAEliminar) return;

    try {
      const response = await fetch(
        `/api/ventas/${ventaId}/pagos?pagoId=${pagoAEliminar}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar pago");
      }

      await cargarPagos();
      onPagoRegistrado?.();
      toast({ title: "Pago eliminado exitosamente" });
    } catch (err) {
      console.error("Error al eliminar pago:", err);
      toast({ title: "Error", description: "No se pudo eliminar el pago", variant: "destructive" });
    } finally {
      setPagoAEliminar(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const porcentajePagado = venta ? (venta.montoPagado / venta.total) * 100 : 0;
  const estaPagada = venta?.estadoPago === "PAGADO";

  return (
    <div className="space-y-4">
      {/* Resumen de la venta */}
      {venta && (
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Estado de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6">
            {/* Montos: apilados siempre, con divisor entre ellos */}
            <div className="divide-y rounded-lg border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5">
                <p className="text-xs text-muted-foreground">Total Venta</p>
                <p className="text-sm font-bold">{formatCurrency(venta.total)}</p>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(venta.montoPagado)}
                </p>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 bg-orange-500/10 dark:bg-orange-950/20">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Saldo Pendiente</p>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(venta.saldoPendiente)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Progreso de pago</span>
                <span className="font-medium">{porcentajePagado.toFixed(1)}%</span>
              </div>
              <Progress value={porcentajePagado} className="h-2.5 sm:h-3" />
            </div>

            {/* Badge y fecha: apilados en móvil, en fila en sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Badge
                variant={estaPagada ? "default" : "secondary"}
                className={cn(
                  "text-xs sm:text-sm w-fit",
                  estaPagada && "bg-emerald-500/15 text-green-800 dark:text-green-300 dark:bg-green-900/30"
                )}
              >
                {estaPagada ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Pagado Completamente
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    Pago Pendiente
                  </>
                )}
              </Badge>

              {venta.fechaVencimiento && (
                <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  Vence:{" "}
                  {format(new Date(venta.fechaVencimiento), "d 'de' MMMM, yyyy", {
                    locale: es,
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de pagos */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pb-3">
          {/* Header: apilado en móvil, en fila en sm+ */}
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Historial de Pagos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {pagos.length} pago{pagos.length !== 1 ? "s" : ""} registrado
                {pagos.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>

            {!estaPagada && (
              <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full xs:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </DialogTrigger>

                {/* Dialog responsive */}
                <DialogContent className="w-full max-w-full sm:max-w-[500px] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={registrarPago}>
                    <DialogHeader className="space-y-1">
                      <DialogTitle className="text-base sm:text-lg">
                        Registrar Nuevo Pago
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm">
                        Saldo pendiente:{" "}
                        {venta && formatCurrency(venta.saldoPendiente)}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <AlertDescription className="text-xs sm:text-sm">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Monto */}
                      <div className="space-y-2">
                        <Label htmlFor="monto" className="text-xs sm:text-sm">
                          Monto del Pago <span className="text-red-500">*</span>
                        </Label>
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
                              value={formatearInputMoneda(formPago.monto)}
                              onChange={(e) => handleMontoChange(e.target.value)}
                              className="pl-6"
                              required
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={setPagoCompleto}
                            disabled={!venta?.saldoPendiente}
                            className="w-full xs:w-auto"
                          >
                            Pago Completo
                          </Button>
                        </div>
                      </div>

                      {/* Método de Pago */}
                      <div className="space-y-2">
                        <Label htmlFor="metodoPago" className="text-xs sm:text-sm">
                          Método de Pago <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formPago.metodoPago}
                          onValueChange={(value) =>
                            setFormPago({ ...formPago, metodoPago: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {METODOS_PAGO.map((metodo) => (
                              <SelectItem key={metodo.value} value={metodo.value}>
                                {metodo.icon} {metodo.label}
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
                          placeholder="Número de transacción, comprobante, etc."
                          value={formPago.referencia}
                          onChange={(e) =>
                            setFormPago({ ...formPago, referencia: e.target.value })
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
                          placeholder="Notas adicionales sobre el pago..."
                          value={formPago.notas}
                          onChange={(e) =>
                            setFormPago({ ...formPago, notas: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogAbierto(false)}
                        disabled={enviandoPago}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={enviandoPago}
                        className="w-full sm:w-auto"
                      >
                        {enviandoPago ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          <>Registrar Pago</>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          {pagos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm sm:text-base">No hay pagos registrados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-start justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-2"
                >
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    {/* Ícono: oculto en móvil muy pequeño, visible en xs+ */}
                    <div className="hidden xs:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 dark:bg-green-900/30 items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 dark:text-green-400" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Monto + método */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold text-base sm:text-lg">
                          {formatCurrency(pago.monto)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {pago.metodoPago}
                        </Badge>
                      </div>
                      {/* Fecha */}
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(
                          new Date(pago.fechaPago),
                          "d 'de' MMMM 'de' yyyy, HH:mm",
                          { locale: es }
                        )}
                      </p>
                      {pago.referencia && (
                        <p className="text-xs text-muted-foreground truncate">
                          Ref: {pago.referencia}
                        </p>
                      )}
                      {pago.notas && (
                        <p className="text-xs sm:text-sm text-muted-foreground italic">
                          {pago.notas}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botón eliminar (solo admins) */}
                  {session?.user?.role === "ADMINISTRADOR" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmarEliminarPago(pago.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-destructive/10 shrink-0 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!pagoAEliminar} onOpenChange={(open) => !open && setPagoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer y actualizará el saldo pendiente de la cuenta fiada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarEliminarPago} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar Pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}