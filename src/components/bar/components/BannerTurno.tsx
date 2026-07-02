"use client";

import { AlertTriangle, CheckCircle, Loader2, X } from "lucide-react";
import { useBarContext } from "@/components/bar/context/BarContext";
import { Button } from "@/components/ui/button";

export function BannerTurno() {
  const { turnoActivo, cargandoTurno, abrirTurno, cerrarTurno } = useBarContext();
 
  if (!turnoActivo) {
    return (
      <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Caja cerrada</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Abre la caja para iniciar el turno y registrar ventas correctamente
            </p>
          </div>
        </div>
        <Button
          onClick={abrirTurno}
          disabled={cargandoTurno}
          className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 h-9 text-sm"
        >
          {cargandoTurno ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
          )}
          Abrir caja
        </Button>
      </div>
    );
  }
 
  // Calcular duración del turno
  const duracionMs = Date.now() - new Date(turnoActivo.abiertaEn).getTime();
  const duracionH = Math.floor(duracionMs / 3_600_000);
  const duracionM = Math.floor((duracionMs % 3_600_000) / 60_000);
  const duracionStr = duracionH > 0 ? `${duracionH}h ${duracionM}m` : `${duracionM}m`;
 
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Turno activo · abierto por {turnoActivo.usuario.nombre}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Desde{" "}
            {new Date(turnoActivo.abiertaEn).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" "}· {duracionStr} activo
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={cerrarTurno}
        disabled={cargandoTurno}
        className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shrink-0"
      >
        {cargandoTurno ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <X className="mr-1 h-3 w-3" />
        )}
        Cerrar caja
      </Button>
    </div>
  );
}
