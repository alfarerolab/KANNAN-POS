"use client";

import { ShoppingCart, ClipboardList, Wine } from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { useToast } from "@/hooks/use-toast";

export function CajaAccionesPrincipales() {
  const { setVentasModalOpen, setVentasModalModo, mesaSeleccionada, turnoActivo } = useBarContext();
  const { toast } = useToast();

  const cajaAbierta = !!turnoActivo;

  const handleVentaBloqueada = () => {
    toast({
      title: "Caja cerrada",
      description: "Abre la caja antes de registrar ventas",
      variant: "destructive",
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Venta Rápida */}
      <button
        type="button"
        onClick={() => {
          if (!cajaAbierta) { handleVentaBloqueada(); return; }
          setVentasModalModo("DIRECTA");
          setVentasModalOpen(true);
        }}
        disabled={!cajaAbierta}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
          cajaAbierta
            ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 hover:border-emerald-500/40"
            : "border-border bg-muted/50 opacity-50 cursor-not-allowed"
        }`}
        title={cajaAbierta ? "Cobrar en mostrador sin afectar las mesas" : "Abre la caja para vender"}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          cajaAbierta ? "bg-emerald-500/15 border-emerald-500/30" : "bg-muted border-border"
        }`}>
          <ShoppingCart className={`h-4 w-4 ${cajaAbierta ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground/70"}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${cajaAbierta ? "text-emerald-800 dark:text-emerald-300" : "text-muted-foreground/70"}`}>
            Venta Rápida
          </p>
          <p className={`text-[11px] mt-0.5 ${cajaAbierta ? "text-emerald-600" : "text-muted-foreground/60"}`}>
            {cajaAbierta ? "Cobro inmediato en mostrador" : "Caja cerrada"}
          </p>
        </div>
      </button>

      {/* Cuenta Abierta — temporal sin mesa fija */}
      <button
        type="button"
        onClick={() => {
          if (!cajaAbierta) { handleVentaBloqueada(); return; }
          setVentasModalModo("CUENTA_ABIERTA" as any);
          setVentasModalOpen(true);
        }}
        disabled={!cajaAbierta}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
          cajaAbierta
            ? "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/15 hover:border-indigo-400/40"
            : "border-border bg-muted/50 opacity-50 cursor-not-allowed"
        }`}
        title={cajaAbierta ? "Crear un pedido abierto temporal sin mesa asignada" : "Abre la caja para vender"}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          cajaAbierta ? "bg-indigo-500/15 border-indigo-500/30" : "bg-muted border-border"
        }`}>
          <ClipboardList className={`h-4 w-4 ${cajaAbierta ? "text-indigo-700 dark:text-indigo-400" : "text-muted-foreground/70"}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${cajaAbierta ? "text-indigo-800 dark:text-indigo-300" : "text-muted-foreground/70"}`}>
            Cuenta Abierta
          </p>
          <p className={`text-[11px] mt-0.5 ${cajaAbierta ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground/60"}`}>
            {cajaAbierta ? "Sin mesa, pago diferido" : "Caja cerrada"}
          </p>
        </div>
      </button>

      {/* Añadir a mesa seleccionada */}
      <button
        type="button"
        onClick={() => {
          if (!cajaAbierta) { handleVentaBloqueada(); return; }
          if (!mesaSeleccionada) return;
          setVentasModalModo("MESA");
          setVentasModalOpen(true);
        }}
        disabled={!cajaAbierta || !mesaSeleccionada}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
          cajaAbierta && mesaSeleccionada
            ? "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/15 hover:border-blue-500/40"
            : "border-border bg-muted/50 opacity-50 cursor-not-allowed"
        }`}
        title={!cajaAbierta ? "Abre la caja para vender" : "Agrega productos a la mesa seleccionada"}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          cajaAbierta && mesaSeleccionada ? "bg-blue-500/15 border-blue-500/30" : "bg-muted border-border"
        }`}>
          <Wine className={`h-4 w-4 ${cajaAbierta && mesaSeleccionada ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground/70"}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${cajaAbierta && mesaSeleccionada ? "text-blue-800 dark:text-blue-300" : "text-muted-foreground/70"}`}>
            {mesaSeleccionada ? `Añadir a ${mesaSeleccionada.nombre}` : "Añadir a Mesa"}
          </p>
          <p className={`text-[11px] mt-0.5 ${cajaAbierta && mesaSeleccionada ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground/60"}`}>
            {!cajaAbierta ? "Caja cerrada" : mesaSeleccionada ? "Mesa seleccionada activa" : "Selecciona una mesa primero"}
          </p>
        </div>
      </button>
    </div>
  );
}
