"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CalendarPlus, Scissors, Clock, DollarSign } from "lucide-react";

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
  descripcion?: string;
  color?: string;
}

interface ServiceActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servicio: Servicio | null;
  onAgregarAlCarrito: (servicio: Servicio) => void;
  onCrearCita: (servicio: Servicio) => void;
}

export function ServiceActionDialog({
  open,
  onOpenChange,
  servicio,
  onAgregarAlCarrito,
  onCrearCita,
}: ServiceActionDialogProps) {
  if (!servicio) return null;

  const formatPrecio = (precio: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(precio);

  const accentColor = servicio.color || "#8b5cf6";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        {/* Header con color del servicio */}
        <div
          className="px-6 pt-6 pb-4"
          style={{
            background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
            borderBottom: `2px solid ${accentColor}25`,
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Scissors className="h-5 w-5" style={{ color: accentColor }} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-tight">
                {servicio.nombre}
              </DialogTitle>
            </div>
          </div>

          {/* Info del servicio */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {formatPrecio(servicio.precio)}
            </span>
            {servicio.duracion > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {servicio.duracion} min
              </span>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground mb-5 text-center">
            ¿Cómo deseas registrar este servicio?
          </p>

          <div className="flex flex-col gap-3">
            {/* Opción 1: Agregar al carrito (walk-in) */}
            <button
              onClick={() => {
                onAgregarAlCarrito(servicio);
                onOpenChange(false);
              }}
              className="group relative w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Agregar al carrito</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  Cliente sin cita previa — cobrar ahora
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>

            {/* Opción 2: Crear/Ver cita */}
            <button
              onClick={() => {
                onCrearCita(servicio);
                onOpenChange(false);
              }}
              className="group relative w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-background hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                <CalendarPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Crear / Ver Cita</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  Cliente con cita programada — agendar
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
