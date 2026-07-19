// Editado: Importado desde la versión de producción en la VPS
"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Plus, Receipt } from "lucide-react";

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

interface PagoDetalle {
  metodoPago: string;
  monto: number;
  referencia?: string;
}

interface SaleCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ventaCompletada: any;
  total: number;
  metodoPagoSeleccionado: string;
  formatearMoneda: (valor: number) => string;
  onViewTicket: () => void;
  onPrintTicket: () => void;
  onNewSale: () => void;
  ticketData: any;
  // Nueva prop para pagos múltiples
  pagosMultiples?: PagoDetalle[];
}

export function SaleCompletionDialog({
  open,
  onOpenChange,
  ventaCompletada,
  total,
  metodoPagoSeleccionado,
  formatearMoneda,
  onViewTicket,
  onPrintTicket,
  onNewSale,
  ticketData,
  pagosMultiples
}: SaleCompletionDialogProps) {
  const esPagoMultiple = pagosMultiples && pagosMultiples.length > 1;



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-2">
            <div className="p-3 rounded-full inline-block bg-accent/10">
              <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-accent-foreground" />
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-2xl text-accent-foreground">¡Venta Exitosa!</DialogTitle>
          <DialogDescription className="text-base sm:text-lg">
            La transacción se ha procesado correctamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
          {/* Información de la venta */}
          <div className="rounded-xl p-4 sm:p-6 border text-center bg-accent/5 border-accent/20">
            <h3 className="font-bold text-base sm:text-lg mb-2 text-accent-foreground">
              Venta #{ventaCompletada?.id?.substring(0, 8) || "---"}
            </h3>
            <p className="mb-2 sm:mb-3 text-sm sm:text-base text-accent-foreground/80">
              {ventaCompletada?.fechaCreacion
                ? new Date(ventaCompletada.fechaCreacion).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })
                : "Procesada ahora"
              }
            </p>
            <div className="text-2xl sm:text-3xl font-bold text-accent-foreground mb-3">
              {formatearMoneda(Number(ventaCompletada?.total) || Number(total) || 0)}
            </div>

            {/* Mostrar pagos múltiples o pago único */}
            {esPagoMultiple ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs sm:text-sm font-semibold text-accent-foreground/90 mb-2">
                  💳 Pago Mixto
                </p>
                <div className="space-y-2 bg-background/50 rounded-lg p-3">
                  {pagosMultiples.map((pago, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {METODOS_PAGO.find(m => m.id === pago.metodoPago)?.icon}
                        </span>
                        <span className="text-xs sm:text-sm">
                          {METODOS_PAGO.find(m => m.id === pago.metodoPago)?.nombre}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs sm:text-sm">
                          {formatearMoneda(pago.monto)}
                        </p>
                        {pago.referencia && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Ref: {pago.referencia}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center font-bold text-sm">
                    <span>Total:</span>
                    <span>{formatearMoneda(Number(ventaCompletada?.total) || Number(total) || 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm mt-1 text-accent-foreground/70">
                Pagado con {METODOS_PAGO.find(m => m.id === metodoPagoSeleccionado)?.nombre}
              </p>
            )}
          </div>

          {/* Opciones de ticket */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 px-1">
            <Button
              variant="outline"
              onClick={onViewTicket}
              disabled={!ticketData}
              className="flex flex-col items-center gap-1 sm:gap-2 h-14 sm:h-16 hover:bg-primary/5"
            >
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <span className="text-xs sm:text-sm">Ver Ticket</span>
            </Button>
            <Button
              variant="outline"
              onClick={onPrintTicket}
              disabled={!ticketData}
              className="flex flex-col items-center gap-1 sm:gap-2 h-14 sm:h-16 hover:bg-muted/50"
            >
              <div className="text-base sm:text-lg">🖨️</div>
              <span className="text-xs sm:text-sm">Imprimir</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto py-2.5 sm:py-3 order-last sm:order-first"
            size="lg"
          >
            Cerrar
          </Button>
          <Button
            onClick={onNewSale}
            className="w-full sm:flex-1 py-2.5 sm:py-3"
            size="lg"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
