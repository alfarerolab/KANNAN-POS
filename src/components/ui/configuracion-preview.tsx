"use client";

import { Check, X, Settings, Zap, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { obtenerConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../lib/prisma-types";

interface ConfiguracionPreviewProps {
  tipoNegocio: TipoNegocio;
  mostrarDetalle?: boolean;
  className?: string;
}

const funcionalidadInfo = {
  servicios: {
    label: "Servicios",
    description: "Gestión de servicios profesionales",
    icon: "💼"
  },
  citas: {
    label: "Sistema de Citas",
    description: "Agendamiento y calendario",
    icon: "📅"
  },
  variantes: {
    label: "Variantes de Producto",
    description: "Tallas, colores, materiales",
    icon: "🎨"
  },
  recetas: {
    label: "Recetas Médicas",
    description: "Prescripciones y tratamientos",
    icon: "📋"
  },
  lotes: {
    label: "Control de Lotes",
    description: "Trazabilidad de productos",
    icon: "📦"
  },
  vencimientos: {
    label: "Control de Vencimientos",
    description: "Alertas de caducidad",
    icon: "⏰"
  },
  mascotas: {
    label: "Gestión de Mascotas",
    description: "Historiales veterinarios",
    icon: "🐾"
  },
  empleadosEspecializados: {
    label: "Empleados Especializados",
    description: "Asignación por competencias",
    icon: "👥"
  },
  inventarioAvanzado: {
    label: "Inventario Avanzado",
    description: "Control detallado de stock",
    icon: "📊"
  },
  facturacionElectronica: {
    label: "Facturación Electrónica",
    description: "Comprobantes digitales",
    icon: "🧾"
  }
};

const camposPOSInfo = {
  mostrarStock: "Mostrar stock en POS",
  permitirVentaSinStock: "Permitir venta sin stock",
  ventaPorPeso: "Venta por peso",
  ventaPorMedida: "Venta por medida",
  requiereCliente: "Requiere cliente obligatorio",
  permitirDescuentos: "Permitir descuentos"
};

export default function ConfiguracionPreview({
  tipoNegocio,
  mostrarDetalle = false,
  className
}: ConfiguracionPreviewProps) {
  const config = obtenerConfiguracionNegocio(tipoNegocio);

  if (!config) return null;

  const funcionesHabilitadas = Object.entries(config.funcionalidades).filter(
    ([, enabled]) => enabled
  );

  const funcionesDeshabilitadas = Object.entries(config.funcionalidades).filter(
    ([, enabled]) => !enabled
  );

  const camposHabilitados = Object.entries(config.camposPOS).filter(
    ([, enabled]) => enabled
  );

  if (!mostrarDetalle) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className={`bg-${config.color}-100 text-${config.color}-800 border-${config.color}-200`}
          >
            {config.icono} {config.nombre}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {funcionesHabilitadas.length} funcionalidades
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs">
          {funcionesHabilitadas.slice(0, 6).map(([funcionalidad]) => (
            <div key={funcionalidad} className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-foreground/80 truncate">
                {funcionalidadInfo[funcionalidad as keyof typeof funcionalidadInfo]?.label || funcionalidad}
              </span>
            </div>
          ))}
          {funcionesHabilitadas.length > 6 && (
            <div className="text-muted-foreground text-xs">
              +{funcionesHabilitadas.length - 6} más...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${config.color}-100`}>
              <span className="text-xl">{config.icono}</span>
            </div>
            <div>
              <div className="text-lg">{config.nombre}</div>
              <div className="text-sm text-muted-foreground font-normal">
                Configuración de tipo de negocio
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {funcionesHabilitadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-800 dark:text-green-300">Funcionalidades Habilitadas</span>
                <Badge variant="secondary">{funcionesHabilitadas.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {funcionesHabilitadas.map(([funcionalidad]) => {
                  const info = funcionalidadInfo[funcionalidad as keyof typeof funcionalidadInfo];
                  return (
                    <div key={funcionalidad} className="flex items-start gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                      <div className="text-lg">{info?.icon}</div>
                      <div>
                        <div className="font-medium text-green-800 dark:text-green-300 text-sm">{info?.label}</div>
                        <div className="text-xs text-green-600 dark:text-green-400">{info?.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {camposHabilitados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-300">Configuración POS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {camposHabilitados.map(([campo]) => (
                  <div key={campo} className="flex items-center gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/30">
                    <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">
                      {camposPOSInfo[campo as keyof typeof camposPOSInfo]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {config.navegacion.mostrarReportes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-purple-800">Reportes Disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.navegacion.mostrarReportes.map((reporte) => (
                  <Badge key={reporte} variant="outline" className="text-purple-700 border-purple-500/30">
                    {reporte.charAt(0).toUpperCase() + reporte.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {funcionesDeshabilitadas.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">No Incluye</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                {funcionesDeshabilitadas.map(([funcionalidad]) => {
                  const info = funcionalidadInfo[funcionalidad as keyof typeof funcionalidadInfo];
                  return (
                    <div key={funcionalidad} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <X className="h-3 w-3" />
                      <span>{info?.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}