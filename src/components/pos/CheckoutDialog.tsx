// Editado: Importado desde la versión de producción en la VPS
"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, CheckCircle, Loader2, Receipt, UserIcon, Users, DollarSign, Plus, Trash2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

// Métodos de pago disponibles
const METODOS_PAGO = [
  { id: "EFECTIVO", nombre: "Efectivo", icon: "💵" },
  { id: "TARJETA_CREDITO", nombre: "Tarjeta de Crédito", icon: "💳" },
  { id: "TARJETA_DEBITO", nombre: "Tarjeta de Débito", icon: "💳" },
  { id: "TRANSFERENCIA", nombre: "Transferencia", icon: "🏦" },
  { id: "NEQUI", nombre: "Nequi", icon: "📱" },
  { id: "DAVIPLATA", nombre: "Daviplata", icon: "📱" },
  { id: "BANCOLOMBIA", nombre: "Bancolombia", icon: "🏦" },
  { id: "FIADO", nombre: "Crédito", icon: "📝" },
  { id: "OTRO", nombre: "Otro", icon: "💰" }
];

export interface PagoDetalle {
  id: string;
  metodoPago: string;
  monto: number;
  referencia?: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metodoPagoSeleccionado: string;
  onMetodoPagoChange: (metodo: string) => void;
  clienteSeleccionado: any;
  onOpenClientDialog: () => void;
  notas: string;
  onNotasChange: (notas: string) => void;
  subtotal: number;
  total: number;
  totalItems: number;
  formatearMoneda: (valor: number) => string;
  procesandoVenta: boolean;
  onProcesarVenta: (referencia?: string, cajaId?: string) => void;
  // Nuevas props para pagos múltiples
  onProcesarVentaMultiple?: (pagos: PagoDetalle[], cajaId?: string) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  metodoPagoSeleccionado,
  onMetodoPagoChange,
  clienteSeleccionado,
  onOpenClientDialog,
  notas,
  onNotasChange,
  subtotal,
  total,
  totalItems,
  formatearMoneda,
  procesandoVenta,
  onProcesarVenta,
  onProcesarVentaMultiple
}: CheckoutDialogProps) {
  // Estados para pagos múltiples
  const [modoMultiple, setModoMultiple] = useState(false);
  const [pagos, setPagos] = useState<PagoDetalle[]>([]);

  // Estados para cajas registradoras
  const [cajas, setCajas] = useState<any[]>([]);
  const [cajaIdSeleccionada, setCajaIdSeleccionada] = useState<string>("");

  // Estados para agregar nuevo pago
  const [nuevoMetodo, setNuevoMetodo] = useState("EFECTIVO");
  const [nuevoMonto, setNuevoMonto] = useState(""); // valor crudo sin formato
  const [nuevaReferencia, setNuevaReferencia] = useState("");

  // Estados para pago único en efectivo
  const [valorRecibido, setValorRecibido] = useState<string>("");
  const [cambio, setCambio] = useState<number>(0);
  const [mostrarCambio, setMostrarCambio] = useState<boolean>(false);

  // Estado para referencia en pago único con transferencia o tarjeta
  const [referenciaUnica, setReferenciaUnica] = useState<string>("");

  // Estados para ventas a crédito (FIADO)
  const [diasCredito, setDiasCredito] = useState<string>("30");

  // Calcular totales de pagos múltiples
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const diferencia = total - totalPagado;
  const pagosValidos = Math.abs(diferencia) < 0.01;

  // RESET COMPLETO cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      // Resetear todo a los valores iniciales
      setModoMultiple(false);
      setPagos([]);
      setNuevoMetodo("EFECTIVO");
      setNuevoMonto("");
      setNuevaReferencia("");
      setValorRecibido("");
      setReferenciaUnica("");
      setCambio(0);
      setMostrarCambio(false);
      setDiasCredito("30"); // Resetear días de crédito
      onMetodoPagoChange("EFECTIVO"); // Resetear también el método de pago

      // Cargar cajas registradoras activas
      fetch("/api/cajas")
        .then((res) => res.json())
        .then((data) => {
          const activas = data.filter((c: any) => c.activa);
          setCajas(activas || []);
          if (activas && activas.length > 0) {
            setCajaIdSeleccionada(activas[0].id);
          }
        })
        .catch((err) => console.error("Error cargando cajas:", err));
    }
  }, [open]);

  // Calcular cambio para pago único en efectivo
  useEffect(() => {
    if (!modoMultiple && metodoPagoSeleccionado === "EFECTIVO" && valorRecibido && /^\d+$/.test(valorRecibido)) {
      const recibido = parseInt(valorRecibido, 10);
      const cambioCalculado = recibido - total;
      setCambio(cambioCalculado);
      setMostrarCambio(true);
    } else {
      setMostrarCambio(false);
      setCambio(0);
    }
  }, [valorRecibido, total, metodoPagoSeleccionado, modoMultiple]);

  const handleValorRecibidoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Quitar puntos de formato y guardar solo dígitos
    const rawSinPuntos = e.target.value.replace(/\./g, '');
    if (rawSinPuntos === '' || /^\d+$/.test(rawSinPuntos)) {
      setValorRecibido(rawSinPuntos);
    }
  };

  const activarModoMultiple = () => {
    setModoMultiple(true);
    setPagos([]);
    setNuevoMonto("");
    setNuevaReferencia("");
  };

  const desactivarModoMultiple = () => {
    setModoMultiple(false);
    setPagos([]);
    setNuevoMonto("");
    setNuevaReferencia("");
    onMetodoPagoChange("EFECTIVO");
  };

  const agregarPago = () => {
    const montoNumerico = parseInt(nuevoMonto, 10);

    if (!nuevoMonto || isNaN(montoNumerico) || montoNumerico <= 0) {
      return;
    }

    const nuevoPago: PagoDetalle = {
      id: crypto.randomUUID(),
      metodoPago: nuevoMetodo,
      monto: montoNumerico,
      referencia: nuevaReferencia || undefined
    };

    setPagos([...pagos, nuevoPago]);
    setNuevoMonto("");
    setNuevaReferencia("");
  };

  // Formateador de miles para el input (1000000 → "1.000.000")
  const formatearInputMiles = (valor: string): string => {
    // Quitar todo lo que no sea dígito
    const soloNumeros = valor.replace(/\D/g, '');
    if (!soloNumeros) return '';
    // Agregar puntos cada 3 dígitos desde la derecha
    return soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleNuevoMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // El valor que muestra el input puede tener puntos (formato)
    // Guardamos solo los números puros para cálculos
    const rawSinPuntos = e.target.value.replace(/\./g, '');
    if (rawSinPuntos === '' || /^\d+$/.test(rawSinPuntos)) {
      setNuevoMonto(rawSinPuntos); // guardamos solo números
    }
  };

  const eliminarPago = (id: string) => {
    // Permitir eliminar cualquier pago, incluso si solo queda 1
    // (el usuario puede necesitar corregir un monto erróneo)
    setPagos(pagos.filter(p => p.id !== id));
  };

  const distribuirRestante = () => {
    if (diferencia > 0.01) {
      // Establecer como número entero sin decimales
      setNuevoMonto(Math.round(diferencia).toString());
    }
  };

  const handleProcesar = () => {
    if (modoMultiple && onProcesarVentaMultiple) {
      onProcesarVentaMultiple(pagos, cajaIdSeleccionada || undefined);
    } else {
      const necesitaReferencia = ["TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA", "TARJETA_CREDITO", "TARJETA_DEBITO"].includes(metodoPagoSeleccionado);
      onProcesarVenta(
        necesitaReferencia ? referenciaUnica || undefined : undefined,
        cajaIdSeleccionada || undefined
      );
    }
  };

  const puedeCompletarVenta = modoMultiple ? pagosValidos : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[95vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-accent/10">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
            </div>
            <span className="text-base sm:text-lg">Finalizar Venta</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Completa la información para procesar la venta
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 py-2 sm:py-4">
          {/* Columna Izquierda */}
          <div className="space-y-4 sm:space-y-5">
            {/* Toggle para pago mixto */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Pago Mixto</span>
                <Badge variant={modoMultiple ? "default" : "secondary"} className="text-xs">
                  {modoMultiple ? "Activado" : "Desactivado"}
                </Badge>
              </div>
              <Button
                type="button"
                variant={modoMultiple ? "destructive" : "default"}
                size="sm"
                onClick={() => modoMultiple ? desactivarModoMultiple() : activarModoMultiple()}
              >
                {modoMultiple ? "Desactivar" : "Activar"}
              </Button>
            </div>

            {!modoMultiple ? (
              // MODO PAGO ÚNICO
              <>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.filter(m => !["NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(m.id)).map((metodo) => {
                      const isTransferencia = metodo.id === "TRANSFERENCIA";
                      const isTransferenciaSelected = ["TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(metodoPagoSeleccionado);
                      const isSelected = isTransferencia ? isTransferenciaSelected : metodoPagoSeleccionado === metodo.id;
                      
                      return (
                      <Button
                        key={metodo.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onMetodoPagoChange(metodo.id)}
                        className="justify-start gap-2 h-11 sm:h-12 text-xs sm:text-sm"
                      >
                        <span className="text-base sm:text-lg">{metodo.icon}</span>
                        <span>{metodo.nombre}</span>
                      </Button>
                    )})}
                  </div>

                  {/* Sub-selector para Transferencias */}
                  {["TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(metodoPagoSeleccionado) && (
                    <div className="space-y-2 mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <label className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                        Selecciona la plataforma o banco:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          type="button"
                          variant={metodoPagoSeleccionado === "NEQUI" ? "default" : "outline"}
                          onClick={() => onMetodoPagoChange("NEQUI")}
                          className={`h-9 text-xs ${metodoPagoSeleccionado === "NEQUI" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                        >
                          📱 Nequi
                        </Button>
                        <Button
                          type="button"
                          variant={metodoPagoSeleccionado === "DAVIPLATA" ? "default" : "outline"}
                          onClick={() => onMetodoPagoChange("DAVIPLATA")}
                          className={`h-9 text-xs ${metodoPagoSeleccionado === "DAVIPLATA" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                        >
                          📱 Daviplata
                        </Button>
                        <Button
                          type="button"
                          variant={metodoPagoSeleccionado === "BANCOLOMBIA" ? "default" : "outline"}
                          onClick={() => onMetodoPagoChange("BANCOLOMBIA")}
                          className={`h-9 text-xs ${metodoPagoSeleccionado === "BANCOLOMBIA" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        >
                          🏦 Bancolombia
                        </Button>
                        <Button
                          type="button"
                          variant={metodoPagoSeleccionado === "TRANSFERENCIA" ? "default" : "outline"}
                          onClick={() => onMetodoPagoChange("TRANSFERENCIA")}
                          className="h-9 text-xs"
                        >
                          🏦 Otro Banco
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campo de valor recibido (solo efectivo) */}
                {metodoPagoSeleccionado === "EFECTIVO" && (
                  <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="space-y-2">
                      <Label htmlFor="valorRecibido" className="text-sm font-semibold text-foreground">
                        Valor Recibido del Cliente (Opcional)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="valorRecibido"
                          type="text"
                          inputMode="numeric"
                          placeholder="Ingresa el valor recibido..."
                          value={valorRecibido ? valorRecibido.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                          onChange={handleValorRecibidoChange}
                          className="pl-10 text-base sm:text-lg h-11 sm:h-12 font-semibold tracking-wide"
                        />
                      </div>
                    </div>

                    {mostrarCambio && (
                      <div className={`rounded-lg p-3 sm:p-4 border-2 ${
                        cambio >= 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-green-950 dark:border-green-800'
                          : 'bg-destructive/10 border-destructive/30 dark:bg-red-950 dark:border-red-800'
                      }`}>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm font-medium mb-1">
                            {cambio >= 0 ? '💵 Cambio a Devolver' : '⚠️ Falta por Pagar'}
                          </p>
                          <p className={`text-xl sm:text-2xl font-bold ${
                            cambio >= 0 ? 'text-green-700 dark:text-green-400 dark:text-green-400' : 'text-red-700 dark:text-red-400 dark:text-red-400'
                          }`}>
                            {formatearMoneda(Math.abs(cambio))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Campo de referencia para transferencia y tarjeta */}
                {(metodoPagoSeleccionado === "TRANSFERENCIA" ||
                  metodoPagoSeleccionado === "NEQUI" ||
                  metodoPagoSeleccionado === "DAVIPLATA" ||
                  metodoPagoSeleccionado === "TARJETA_CREDITO" ||
                  metodoPagoSeleccionado === "TARJETA_DEBITO") && (
                  <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/10 dark:bg-blue-950/20 dark:border-blue-800">
                    <Label htmlFor="referenciaUnica" className="text-sm font-semibold text-blue-800 dark:text-blue-300 dark:text-blue-300 flex items-center gap-2">
                      {["NEQUI", "DAVIPLATA"].includes(metodoPagoSeleccionado) ? "📱" : metodoPagoSeleccionado === "TRANSFERENCIA" ? "🏦" : "💳"}
                      {["TRANSFERENCIA", "NEQUI", "DAVIPLATA"].includes(metodoPagoSeleccionado)
                        ? "N° de Referencia / Comprobante"
                        : "N° de Autorización del Datafono"}
                      <span className="text-xs font-normal text-blue-600 dark:text-blue-400 dark:text-blue-400">(opcional)</span>
                    </Label>
                    <Input
                      id="referenciaUnica"
                      type="text"
                      placeholder={
                        ["TRANSFERENCIA", "NEQUI", "DAVIPLATA"].includes(metodoPagoSeleccionado)
                          ? "Ej: 123456789"
                          : "Ej: 789456"
                      }
                      value={referenciaUnica}
                      onChange={(e) => setReferenciaUnica(e.target.value)}
                      className="h-11 text-base border-blue-500/40 focus:border-blue-500"
                    />
                    <p className="text-xs text-blue-600 dark:text-blue-400 dark:text-blue-400">
                      {["TRANSFERENCIA", "NEQUI", "DAVIPLATA"].includes(metodoPagoSeleccionado)
                        ? "Se guarda en la venta y aparece en el ticket para facilitar el cuadre de caja."
                        : "Número de aprobación que muestra el datafono al finalizar la transacción."}
                    </p>
                  </div>
                )}
              </>
            ) : (
              // MODO PAGOS MÚLTIPLES
              <div className="space-y-4">
                {/* Lista de pagos agregados */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Pagos Agregados</Label>
                  {pagos.length === 0 ? (
                    <div className="text-center p-4 text-sm text-muted-foreground border rounded-lg">
                      No hay pagos agregados aún
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pagos.map((pago) => (
                        <div key={pago.id} className="flex items-center gap-2 p-3 rounded-lg border bg-card">
                          <span className="text-lg">
                            {METODOS_PAGO.find(m => m.id === pago.metodoPago)?.icon}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {METODOS_PAGO.find(m => m.id === pago.metodoPago)?.nombre}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatearMoneda(pago.monto)}
                              {pago.referencia && ` - Ref: ${pago.referencia}`}
                            </p>
                          </div>
                          {/* Siempre mostrar botón eliminar para poder corregir pagos con exceso */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarPago(pago.id)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resumen de pagos */}
                <div className={`p-3 rounded-lg border-2 ${
                  pagosValidos
                    ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-green-950 dark:border-green-800'
                    : diferencia > 0
                    ? 'bg-destructive/10 border-destructive/30 dark:bg-red-950 dark:border-red-800'
                    : 'bg-amber-500/10 border-amber-500/30 dark:bg-yellow-950 dark:border-yellow-800'
                }`}>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total a pagar:</span>
                      <span className="font-bold">{formatearMoneda(total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total pagado:</span>
                      <span className="font-bold">{formatearMoneda(totalPagado)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {diferencia > 0 ? 'Falta:' : diferencia < 0 ? 'Exceso:' : 'Completado:'}
                      </span>
                      <span className={`font-bold ${
                        pagosValidos ? 'text-green-700 dark:text-green-400 dark:text-green-400' :
                        diferencia > 0 ? 'text-red-700 dark:text-red-400 dark:text-red-400' :
                        'text-yellow-700 dark:text-yellow-400 dark:text-yellow-400'
                      }`}>
                        {pagosValidos ? '✓ Completo' : formatearMoneda(Math.abs(diferencia))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agregar nuevo pago */}
                <div className="space-y-3 p-3 rounded-lg border-2 border-dashed">
                  <Label className="text-sm font-semibold">Agregar Pago</Label>

                  <div className="grid grid-cols-2 gap-2">
                    {METODOS_PAGO.filter(m => !["NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(m.id)).map((metodo) => {
                      const isTransferencia = metodo.id === "TRANSFERENCIA";
                      const isTransferenciaSelected = ["TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(nuevoMetodo);
                      const isSelected = isTransferencia ? isTransferenciaSelected : nuevoMetodo === metodo.id;
                      
                      return (
                      <Button
                        key={metodo.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => setNuevoMetodo(metodo.id)}
                        size="sm"
                        className="justify-start gap-2 h-9"
                      >
                        <span className="text-sm">{metodo.icon}</span>
                        <span className="text-xs">{metodo.nombre}</span>
                      </Button>
                    )})}
                  </div>

                  {/* Sub-selector para Transferencias en pago mixto */}
                  {["TRANSFERENCIA", "NEQUI", "DAVIPLATA", "BANCOLOMBIA"].includes(nuevoMetodo) && (
                    <div className="space-y-2 mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <label className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300 tracking-wider">
                        Plataforma o Banco:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          type="button"
                          variant={nuevoMetodo === "NEQUI" ? "default" : "outline"}
                          onClick={() => setNuevoMetodo("NEQUI")}
                          className={`h-8 text-[11px] ${nuevoMetodo === "NEQUI" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                        >
                          📱 Nequi
                        </Button>
                        <Button
                          type="button"
                          variant={nuevoMetodo === "DAVIPLATA" ? "default" : "outline"}
                          onClick={() => setNuevoMetodo("DAVIPLATA")}
                          className={`h-8 text-[11px] ${nuevoMetodo === "DAVIPLATA" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                        >
                          📱 Daviplata
                        </Button>
                        <Button
                          type="button"
                          variant={nuevoMetodo === "BANCOLOMBIA" ? "default" : "outline"}
                          onClick={() => setNuevoMetodo("BANCOLOMBIA")}
                          className={`h-8 text-[11px] ${nuevoMetodo === "BANCOLOMBIA" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        >
                          🏦 Bancolombia
                        </Button>
                        <Button
                          type="button"
                          variant={nuevoMetodo === "TRANSFERENCIA" ? "default" : "outline"}
                          onClick={() => setNuevoMetodo("TRANSFERENCIA")}
                          className="h-8 text-[11px]"
                        >
                          🏦 Otro
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="nuevoMonto" className="text-xs">Monto</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          id="nuevoMonto"
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formatearInputMiles(nuevoMonto)}
                          onChange={handleNuevoMontoChange}
                          className="pl-7 h-9 text-sm font-semibold tracking-wide"
                        />
                      </div>
                      {diferencia > 0.01 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={distribuirRestante}
                          className="text-xs whitespace-nowrap"
                        >
                          Restante
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nuevaReferencia" className="text-xs">
                      Referencia (opcional)
                    </Label>
                    <Input
                      id="nuevaReferencia"
                      type="text"
                      placeholder="Ej: Núm. transacción, comprobante..."
                      value={nuevaReferencia}
                      onChange={(e) => setNuevaReferencia(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={agregarPago}
                    disabled={!nuevoMonto || parseInt(nuevoMonto, 10) <= 0}
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Pago
                  </Button>
                </div>
              </div>
            )}

            {/* Información del cliente */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                Cliente
                {(metodoPagoSeleccionado === 'FIADO' || pagos.some(p => p.metodoPago === 'FIADO')) && (
                  <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-400 text-xs">
                    Obligatorio para Crédito
                  </Badge>
                )}
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className={`flex-1 p-3 border-2 rounded-lg bg-muted/50 ${
                  (metodoPagoSeleccionado === 'FIADO' || pagos.some(p => p.metodoPago === 'FIADO')) && !clienteSeleccionado
                    ? 'border-yellow-400 bg-amber-500/10/50 dark:bg-yellow-950/20'
                    : 'border-border'
                }`}>
                  {clienteSeleccionado ? (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">
                          {clienteSeleccionado.nombre}
                        </p>
                        {clienteSeleccionado.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {clienteSeleccionado.email}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        {(metodoPagoSeleccionado === 'FIADO' || pagos.some(p => p.metodoPago === 'FIADO'))
                          ? '⚠️ Debe seleccionar un cliente para venta fiada'
                          : 'Venta sin cliente asociado'
                        }
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenClientDialog}
                  className="px-4 h-10 sm:h-auto text-xs sm:text-sm"
                >
                  {clienteSeleccionado ? "Cambiar" : "Seleccionar"}
                </Button>
              </div>
            </div>

            {/* Caja Destino */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                💵 Caja Destino (Registradora)
              </label>
              <select
                value={cajaIdSeleccionada}
                onChange={(e) => setCajaIdSeleccionada(e.target.value)}
                className="w-full h-11 border-2 border-border rounded-lg bg-background px-3 py-2 text-sm sm:text-base focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              >
                {cajas.length === 0 ? (
                  <option value="">Cargando cajas...</option>
                ) : (
                  cajas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-4 sm:space-y-5">
            {/* Notas */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Notas (Opcional)
              </label>
              <textarea
                placeholder="Agregar notas adicionales para la venta..."
                className="w-full min-h-[120px] sm:min-h-[140px] px-3 py-2 text-sm sm:text-base border-2 border-border rounded-lg resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-background"
                value={notas}
                onChange={(e) => onNotasChange(e.target.value)}
              />
            </div>

            {/* Resumen de venta */}
            <div className="rounded-xl p-4 sm:p-5 border bg-accent/5 border-accent/20">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-accent-foreground text-sm sm:text-base">
                <Calculator className="h-4 w-4" />
                Resumen de Venta
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm sm:text-base text-accent-foreground/80">
                  <span>Artículos ({totalItems}):</span>
                  <span>{formatearMoneda(subtotal)}</span>
                </div>
                <Separator className="bg-accent/20" />
                <div className="flex justify-between font-bold text-lg sm:text-xl text-accent-foreground">
                  <span>Total a Pagar:</span>
                  <span>{formatearMoneda(total)}</span>
                </div>
              </div>
            </div>

            {/* Advertencia si los pagos no cuadran */}
            {modoMultiple && !pagosValidos && pagos.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 dark:bg-yellow-950 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 dark:text-yellow-400 mt-0.5" />
                <p className="text-xs text-yellow-700 dark:text-yellow-400 dark:text-yellow-400">
                  Los pagos agregados no coinciden con el total de la venta.
                  {diferencia > 0 ? ` Faltan ${formatearMoneda(diferencia)}` : ` Hay un exceso de ${formatearMoneda(Math.abs(diferencia))}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesandoVenta}
            className="w-full sm:w-auto text-sm"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleProcesar}
            disabled={procesandoVenta || !puedeCompletarVenta}
            className="w-full sm:w-auto text-sm"
          >
            {procesandoVenta ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Completar Venta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}