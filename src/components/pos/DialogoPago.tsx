import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, Receipt, Calculator, UserIcon, Users } from "lucide-react";

// Métodos de pago disponibles
const METODOS_PAGO = [
  { id: "EFECTIVO", nombre: "Efectivo", icon: "💵" },
  { id: "TARJETA_CREDITO", nombre: "Tarjeta de Crédito", icon: "💳" },
  { id: "TARJETA_DEBITO", nombre: "Tarjeta de Débito", icon: "💳" },
  { id: "TRANSFERENCIA", nombre: "Transferencia", icon: "🏦" },
  { id: "FIADO", nombre: "Crédito", icon: "📝" },
  { id: "OTRO", nombre: "Otro", icon: "💰" }
];

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metodoPagoSeleccionado: string;
  setMetodoPagoSeleccionado: (metodo: string) => void;
  clienteSeleccionado: any | null;
  setClienteDialogOpen: (open: boolean) => void;
  notas: string;
  setNotas: (notas: string) => void;
  procesandoVenta: boolean;
  onProcesarVenta: () => void;
  subtotal: number;
  total: number;
  totalItems: number;
  formatearMoneda: (valor: number) => string;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  metodoPagoSeleccionado,
  setMetodoPagoSeleccionado,
  clienteSeleccionado,
  setClienteDialogOpen,
  notas,
  setNotas,
  procesandoVenta,
  onProcesarVenta,
  subtotal,
  total,
  totalItems,
  formatearMoneda
}: CheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-accent/10">
              <Receipt className="h-5 w-5 text-accent-foreground" />
            </div>
            Finalizar Venta
          </DialogTitle>
          <DialogDescription>
            Completa la información para procesar la venta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Método de pago */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((metodo) => (
                <Button
                  key={metodo.id}
                  variant={metodoPagoSeleccionado === metodo.id ? "default" : "outline"}
                  onClick={() => setMetodoPagoSeleccionado(metodo.id)}
                  className="justify-start gap-2 h-12"
                >
                  <span className="text-lg">{metodo.icon}</span>
                  <span className="text-sm">{metodo.nombre}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Información del cliente */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Cliente
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 border-2 border-border rounded-lg bg-muted/50">
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{clienteSeleccionado.nombre}</p>
                      {clienteSeleccionado.email && (
                        <p className="text-xs text-muted-foreground">{clienteSeleccionado.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Venta sin cliente asociado</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setClienteDialogOpen(true)}
                className="px-4"
              >
                {clienteSeleccionado ? "Cambiar" : "Seleccionar"}
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">
              Notas (Opcional)
            </label>
            <textarea
              placeholder="Agregar notas adicionales para la venta..."
              className="w-full min-h-[80px] px-3 py-2 border-2 border-border rounded-lg resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-background"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {/* Resumen de venta */}
          <div className="rounded-xl p-4 border bg-accent/5 border-accent/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-accent-foreground">
              <Calculator className="h-4 w-4" />
              Resumen de Venta
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-accent-foreground/80">
                <span>Artículos ({totalItems}):</span>
                <span>{formatearMoneda(subtotal)}</span>
              </div>
              <Separator className="bg-accent/20" />
              <div className="flex justify-between font-bold text-lg text-accent-foreground">
                <span>Total a Pagar:</span>
                <span>{formatearMoneda(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesandoVenta}
          >
            Cancelar
          </Button>
          <Button
            onClick={onProcesarVenta}
            disabled={procesandoVenta}
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
