"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, Info } from "lucide-react";
import { obtenerConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../lib/prisma-types";

interface TipoNegocioIndicatorProps {
  tipoNegocio: TipoNegocio;
  configuracionActual?: {
    habilitarServicios: boolean;
    habilitarCitas: boolean;
    habilitarVariantes: boolean;
    habilitarVencimientos: boolean;
  };
  variant?: "compact" | "full";
}

export function TipoNegocioIndicator({
  tipoNegocio,
  configuracionActual,
  variant = "compact"
}: TipoNegocioIndicatorProps) {
  const configNegocio = obtenerConfiguracionNegocio(tipoNegocio);

  if (!configNegocio) return null;

  const configuracionOptima =
    !configuracionActual ||
    (configuracionActual.habilitarServicios === configNegocio.funcionalidades.servicios &&
      configuracionActual.habilitarCitas === configNegocio.funcionalidades.citas &&
      configuracionActual.habilitarVariantes === configNegocio.funcionalidades.variantes &&
      configuracionActual.habilitarVencimientos === configNegocio.funcionalidades.vencimientos);

  if (variant === "compact") {
    return (
      <Badge
        variant="outline"
        className={`bg-${configNegocio.color}-50 text-${configNegocio.color}-700 border-${configNegocio.color}-200`}
      >
        <span className="mr-1">{configNegocio.icono}</span>
        {configNegocio.nombre}
        {configuracionActual &&
          (configuracionOptima ? (
            <CheckCircle className="ml-1 h-3 w-3 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="ml-1 h-3 w-3 text-yellow-600 dark:text-yellow-400" />
          ))}
      </Badge>
    );
  }

  return (
    <Card className={`border-${configNegocio.color}-200`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{configNegocio.icono}</span>
            <div>
              <h3 className="font-semibold">{configNegocio.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                Configuración del tipo de negocio
              </p>
            </div>
          </div>
          {configuracionActual && (
            <div className="flex items-center gap-1">
              {configuracionOptima ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400">Optimizada</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">Personalizada</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Funcionalidades recomendadas:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>Servicios: {configNegocio.funcionalidades.servicios ? "Sí" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>Citas: {configNegocio.funcionalidades.citas ? "Sí" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>Venta por peso: {configNegocio.camposPOS.ventaPorPeso ? "Sí" : "No"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>Descuentos: {configNegocio.camposPOS.permitirDescuentos ? "Sí" : "No"}</span>
            </div>
          </div>
        </div>

        {tipoNegocio === "TIENDA_BARRIO" && (
          <div className="mt-3 p-2 bg-lime-500/10 border border-lime-200 rounded-md">
            <p className="text-xs text-lime-700">
              <strong>Tienda de barrio optimizada:</strong> Ideal para D1, Ara, Justo & Bueno.
              Incluye venta por peso, control de stock y reportes básicos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}