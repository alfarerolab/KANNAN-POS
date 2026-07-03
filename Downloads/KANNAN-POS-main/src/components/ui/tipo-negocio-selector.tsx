"use client";

import { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { obtenerTiposNegocio, obtenerConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../lib/prisma-types";

interface TipoNegocioSelectorProps {
  tipoActual: TipoNegocio;
  tipoSeleccionado: TipoNegocio | null;
  onSeleccionar: (tipo: TipoNegocio) => void;
  className?: string;
}

interface ConfiguracionPreviewProps {
  tipoActual: TipoNegocio;
  tipoNuevo: TipoNegocio;
}

const ConfiguracionPreview = ({ tipoActual, tipoNuevo }: ConfiguracionPreviewProps) => {
  const configActual = obtenerConfiguracionNegocio(tipoActual);
  const configNueva = obtenerConfiguracionNegocio(tipoNuevo);

  if (!configActual || !configNueva) return null;

  const funcionalidadesComparacion = Object.entries(configNueva.funcionalidades).map(([funcionalidad, habilitada]) => {
    const estabaHabilitada = configActual.funcionalidades[funcionalidad as keyof typeof configActual.funcionalidades];
    return {
      funcionalidad,
      habilitada,
      estabaHabilitada,
      cambio: habilitada !== estabaHabilitada ? (habilitada ? "nueva" : "removida") : "igual"
    };
  });

  const funcionesNuevas = funcionalidadesComparacion.filter(f => f.cambio === "nueva");
  const funcionesRemovidas = funcionalidadesComparacion.filter(f => f.cambio === "removida");
  const funcionesActuales = funcionalidadesComparacion.filter(f => f.cambio === "igual" && f.habilitada);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="font-medium text-sm">Vista previa de cambios</span>
      </div>

      {funcionesNuevas.length > 0 && (
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-800 dark:text-green-300 text-sm">Funcionalidades que se habilitarán:</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {funcionesNuevas.map(({ funcionalidad }) => (
              <div key={funcionalidad} className="text-sm text-green-700 dark:text-green-400">
                • {funcionalidad.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
              </div>
            ))}
          </div>
        </div>
      )}

      {funcionesRemovidas.length > 0 && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
          <div className="flex items-center gap-2 mb-2">
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-800 dark:text-red-300 text-sm">Funcionalidades que se deshabilitarán:</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {funcionesRemovidas.map(({ funcionalidad }) => (
              <div key={funcionalidad} className="text-sm text-red-700 dark:text-red-400">
                • {funcionalidad.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
              </div>
            ))}
          </div>
        </div>
      )}

      {funcionesActuales.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border dark:border-border">
          <div className="flex items-center gap-2 mb-2">
            <Check className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground dark:text-muted-foreground/40 text-sm">Funcionalidades que se mantendrán:</span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {funcionesActuales.map(({ funcionalidad }) => (
              <div key={funcionalidad} className="text-sm text-foreground/80">
                • {funcionalidad.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="font-medium text-foreground dark:text-muted-foreground/40">Configuración actual:</span>
          <Badge variant="secondary" className="ml-2">
            {configActual.icono} {configActual.nombre}
          </Badge>
        </div>
        <div>
          <span className="font-medium text-foreground dark:text-muted-foreground/40">Nueva configuración:</span>
          <Badge variant="secondary" className="ml-2">
            {configNueva.icono} {configNueva.nombre}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default function TipoNegocioSelector({
  tipoActual,
  tipoSeleccionado,
  onSeleccionar,
  className
}: TipoNegocioSelectorProps) {
  const [expandido, setExpandido] = useState(false);
  const tiposNegocio = obtenerTiposNegocio();

  const handleSeleccionar = (tipo: TipoNegocio) => {
    onSeleccionar(tipo);
    if (!expandido) setExpandido(true);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
        {tiposNegocio.map((tipo) => {
          const esActual = tipo.tipo === tipoActual;
          const esSeleccionado = tipo.tipo === tipoSeleccionado;

          return (
            <Card
              key={tipo.tipo}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                esSeleccionado
                  ? `bg-${tipo.color}-50 border-${tipo.color}-300 ring-2 ring-${tipo.color}-200`
                  : esActual
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "hover:bg-muted/50 border-border"
              }`}
              onClick={() => handleSeleccionar(tipo.tipo)}
            >
              <CardHeader className="text-center pb-2 pt-4">
                <div className="text-2xl mb-1">{tipo.icono}</div>
                <CardTitle className="text-sm leading-tight">{tipo.nombre}</CardTitle>
                {esActual && (
                  <Badge variant="secondary" className="text-xs">Actual</Badge>
                )}
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {Object.entries(tipo.funcionalidades)
                    .filter(([, enabled]) => enabled)
                    .slice(0, 3)
                    .map(([funcionalidad]) => (
                      <div key={funcionalidad}>
                        • {funcionalidad.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                      </div>
                    ))}
                  {Object.values(tipo.funcionalidades).filter(Boolean).length > 3 && (
                    <div className="text-muted-foreground/70">
                      +{Object.values(tipo.funcionalidades).filter(Boolean).length - 3} más...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tipoSeleccionado && tipoSeleccionado !== tipoActual && (
        <div className="mt-6">
          <ConfiguracionPreview tipoActual={tipoActual} tipoNuevo={tipoSeleccionado} />
        </div>
      )}

      {!expandido && tipoSeleccionado && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandido(true)}
          >
            Ver detalles de configuración
          </Button>
        </div>
      )}
    </div>
  );
}