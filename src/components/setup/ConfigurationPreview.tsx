"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { BUSINESS_TYPES } from "./BusinessTypeSelector";
import type { FeatureConfig } from "./FeatureConfigurator";

interface ConfigurationPreviewProps {
  businessType: string;
  configuration: FeatureConfig;
}

export function ConfigurationPreview({ businessType, configuration }: ConfigurationPreviewProps) {
  const businessInfo = BUSINESS_TYPES[businessType as keyof typeof BUSINESS_TYPES];

  const enabledFeatures = Object.entries(configuration)
    .filter(([_, enabled]) => enabled)
    .map(([key, _]) => key);

  const featureNames: Record<string, string> = {
    habilitarServicios: "Gestión de Servicios",
    habilitarCitas: "Sistema de Citas",
    habilitarVariantes: "Variantes de Productos",
    habilitarRecetas: "Control de Recetas",
    habilitarLotes: "Control de Lotes",
    habilitarVencimientos: "Control de Vencimientos",
    habilitarInventarioAvanzado: "Inventario Avanzado",
    habilitarReportes: "Reportes Avanzados",
    habilitarMultiUsuarios: "Multi-Usuarios"
  };

  const getRecommendations = () => {
    const recommendations = [];

    if (businessType === "SERVICES" && !configuration.habilitarServicios) {
      recommendations.push("Considera habilitar 'Gestión de Servicios' para tu tipo de negocio");
    }

    if (businessType === "HEALTHCARE" && !configuration.habilitarRecetas) {
      recommendations.push("El 'Control de Recetas' es muy útil para negocios de salud");
    }

    if (businessType === "RESTAURANT" && !configuration.habilitarVencimientos) {
      recommendations.push("El 'Control de Vencimientos' es importante para alimentos");
    }

    if (enabledFeatures.length === 0) {
      recommendations.push("Considera habilitar al menos una funcionalidad adicional");
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            Resumen de tu Configuración
          </CardTitle>
          <CardDescription>
            Revisa los detalles antes de finalizar la configuración de tu sistema POS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Negocio */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              {businessInfo.icon} Tipo de Negocio
            </h3>
            <div className="space-y-2">
              <div className="font-medium text-blue-800 dark:text-blue-300">{businessInfo.nombre}</div>
              <div className="text-sm text-blue-700 dark:text-blue-400">{businessInfo.descripcion}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {businessInfo.examples.map((example, index) => (
                  <Badge key={index} variant="outline" className="text-xs border-blue-500/40 text-blue-700 dark:text-blue-400">
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Funcionalidades Habilitadas */}
          <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/30">
            <h3 className="font-semibold text-green-900 mb-3">
              Funcionalidades Habilitadas ({enabledFeatures.length})
            </h3>
            {enabledFeatures.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {enabledFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{featureNames[feature] || feature}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-green-700 dark:text-green-400 text-sm">
                Solo funcionalidades básicas (Productos, Ventas, Clientes)
              </div>
            )}
          </div>

          {/* Funcionalidades Básicas */}
          <div className="bg-muted/50 p-4 rounded-lg border border-border dark:border-border">
            <h3 className="font-semibold text-foreground dark:text-foreground mb-3">
              Funcionalidades Básicas (Siempre Incluidas)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                "Gestión de Productos",
                "Procesamiento de Ventas",
                "Gestión de Clientes",
                "Control de Inventario Básico",
                "Punto de Venta (POS)",
                "Reportes Básicos"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-foreground/80">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendaciones */}
          {recommendations.length > 0 && (
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recomendaciones
              </h3>
              <ul className="space-y-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Información Adicional */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
            <h3 className="font-semibold text-blue-900 mb-2">¿Qué sucede después?</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">1.</span>
                Se creará tu configuración personalizada del sistema
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">2.</span>
                Podrás comenzar a usar tu POS inmediatamente
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">3.</span>
                Todas las funciones se pueden modificar desde Configuración
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400">4.</span>
                Puedes agregar o quitar características en cualquier momento
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
