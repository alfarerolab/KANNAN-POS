// src/components/ventas/HistorialAuditoriaVenta.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
  CreditCard,
  User,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface AuditoriaLogEntry {
  id: string;
  accion: string;
  tabla: string;
  registroId: string;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  notas: string | null;
  usuarioId: string | null;
  usuarioEmail: string | null;
  usuarioRol: string | null;
  createdAt: string;
}

interface HistorialAuditoriaVentaProps {
  ventaId: string;
  /** Cuando cambia este valor, se recarga el historial (p.ej. tras editar la venta) */
  refreshKey?: number;
}

function parseSafe(json: string | null): Record<string, any> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA_CREDITO: "Tarjeta de Crédito",
  TARJETA_DEBITO: "Tarjeta de Débito",
  TRANSFERENCIA: "Transferencia Bancaria",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  FIADO: "Fiado",
  MIXTO: "Pago Mixto",
  OTRO: "Otro",
};

const ESTADO_LABELS: Record<string, string> = {
  COMPLETADA: "Completada",
  PENDIENTE: "Pendiente",
  CANCELADA: "Cancelada",
  REEMBOLSADA: "Reembolsada",
};

function CambioRow({ label, antes, despues }: { label: string; antes?: string; despues?: string }) {
  if (!antes && !despues) return null;
  if (antes === despues) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground font-medium">{label}:</span>
      {antes && (
        <span className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-mono line-through">
          {antes}
        </span>
      )}
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      {despues && (
        <span className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-mono">
          {despues}
        </span>
      )}
    </div>
  );
}

function EntradaAuditoria({ log }: { log: AuditoriaLogEntry }) {
  const [expandida, setExpandida] = useState(false);
  const antes = parseSafe(log.datosAnteriores);
  const despues = parseSafe(log.datosNuevos);

  const tieneCambios = antes || despues;

  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      {/* Línea vertical de timeline */}
      <div className="absolute left-2 top-2 bottom-0 w-px bg-border last:hidden" />
      {/* Punto del timeline */}
      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <div className="bg-muted/30 border rounded-lg p-3 space-y-1.5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {log.notas || "Modificación registrada"}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">
                🕐 {formatFecha(log.createdAt)}
              </span>
              {log.usuarioEmail && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />
                  {log.usuarioEmail}
                </span>
              )}
              {log.usuarioRol && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {log.usuarioRol}
                </Badge>
              )}
            </div>
          </div>

          {tieneCambios && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => setExpandida((v) => !v)}
            >
              {expandida ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>

        {/* Detalle de cambios expandible */}
        {expandida && tieneCambios && (
          <div className="border-t pt-2 mt-2 space-y-1.5">
            <CambioRow
              label="Método de pago"
              antes={antes?.metodoPago ? METODO_LABELS[antes.metodoPago] ?? antes.metodoPago : undefined}
              despues={despues?.metodoPago ? METODO_LABELS[despues.metodoPago] ?? despues.metodoPago : undefined}
            />
            <CambioRow
              label="Estado"
              antes={antes?.estado ? ESTADO_LABELS[antes.estado] ?? antes.estado : undefined}
              despues={despues?.estado ? ESTADO_LABELS[despues.estado] ?? despues.estado : undefined}
            />
            {despues?.detalleItems && Array.isArray(despues.detalleItems) && despues.detalleItems.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {despues.detalleItems.length} ítems con empleados actualizados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function HistorialAuditoriaVenta({
  ventaId,
  refreshKey = 0,
}: HistorialAuditoriaVentaProps) {
  const [logs, setLogs] = useState<AuditoriaLogEntry[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch(`/api/ventas/${ventaId}/auditoria`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar el historial");
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch (e) {
      setError("Error al cargar el historial de cambios");
    } finally {
      setCargando(false);
    }
  }, [ventaId]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historial de Cambios
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground"
          onClick={cargar}
          disabled={cargando}
        >
          <RefreshCw className={`h-3 w-3 ${cargando ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </CardHeader>

      <CardContent className="px-4 sm:px-6">
        {cargando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Cargando historial...</span>
          </div>
        ) : error ? (
          <p className="text-xs text-destructive text-center py-4">{error}</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <History className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground">Sin modificaciones registradas</p>
            <p className="text-[10px] text-muted-foreground/60">
              Los cambios futuros en método de pago o empleados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="mt-1">
            {logs.map((log) => (
              <EntradaAuditoria key={log.id} log={log} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
