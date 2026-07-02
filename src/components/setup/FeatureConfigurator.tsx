"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Calendar,
  Palette,
  FileText,
  Archive,
  Clock,
  Users,
  Scissors,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Settings,
  Building // ✅ Agregar Building aquí
} from "lucide-react";

interface FeatureConfig {
  habilitarServicios: boolean;
  habilitarCitas: boolean;
  habilitarVariantes: boolean;
  habilitarRecetas: boolean;
  habilitarLotes: boolean;
  habilitarVencimientos: boolean;
  habilitarInventarioAvanzado: boolean;
  habilitarReportes: boolean;
  habilitarMultiUsuarios: boolean;
}

interface FeatureConfiguratorProps {
  configuration: FeatureConfig;
  onConfigChange: (key: string, value: boolean) => void;
  businessType: string | null;
}

// Definición de tipos para las características
interface Feature {
  icon: JSX.Element;
  name: string;
  description: string;
  details: string;
  benefits: string[];
  recommendedFor: string[];
}

interface FeatureSection {
  title: string;
  description: string;
  features: Record<string, Feature>;
}

// Definición de características con explicaciones detalladas
const FEATURES: Record<string, FeatureSection> = {
  core: {
    title: "Funcionalidades Principales",
    description: "Características esenciales para tu negocio",
    features: {
      habilitarServicios: {
        icon: <Scissors className="h-4 w-4" />,
        name: "Gestión de Servicios",
        description: "Crea y vende servicios además de productos físicos",
        details: "Ideal para salones, talleres, consultorías y cualquier negocio que ofrezca servicios",
        benefits: ["Precios por tiempo", "Descripciones detalladas", "Categorización de servicios"],
        recommendedFor: ["SERVICES", "HEALTHCARE", "RESTAURANT", "MIXED"]
      },
      habilitarCitas: {
        icon: <Calendar className="h-4 w-4" />,
        name: "Sistema de Citas",
        description: "Agenda y gestiona citas con tus clientes",
        details: "Perfecto para negocios que requieren planificación previa",
        benefits: ["Calendario integrado", "Recordatorios automáticos", "Gestión de horarios"],
        recommendedFor: ["SERVICES", "HEALTHCARE", "PROFESSIONAL"]
      },
      habilitarInventarioAvanzado: {
        icon: <Package className="h-4 w-4" />,
        name: "Inventario Avanzado",
        description: "Control detallado de stock, alertas y movimientos",
        details: "Para negocios que manejan gran cantidad de productos",
        benefits: ["Alertas de stock bajo", "Historial de movimientos", "Múltiples ubicaciones"],
        recommendedFor: ["RETAIL", "MIXED", "HEALTHCARE"]
      }
    }
  },
  products: {
    title: "Gestión de Productos",
    description: "Funciones específicas para el manejo de productos",
    features: {
      habilitarVariantes: {
        icon: <Palette className="h-4 w-4" />,
        name: "Variantes de Productos",
        description: "Maneja tallas, colores, tamaños y otras variaciones",
        details: "Esencial para productos con múltiples opciones",
        benefits: ["Gestión de tallas/colores", "Precios diferenciados", "Stock por variante"],
        recommendedFor: ["RETAIL", "MIXED"]
      },
      habilitarLotes: {
        icon: <Archive className="h-4 w-4" />,
        name: "Control de Lotes",
        description: "Rastrea lotes de productos para control de calidad",
        details: "Importante para productos con fecha de fabricación",
        benefits: ["Trazabilidad completa", "Control de calidad", "Identificación de origen"],
        recommendedFor: ["HEALTHCARE", "RESTAURANT"]
      },
      habilitarVencimientos: {
        icon: <Clock className="h-4 w-4" />,
        name: "Control de Vencimientos",
        description: "Alerta sobre productos próximos a vencer",
        details: "Crítico para productos perecederos",
        benefits: ["Alertas automáticas", "Reducción de pérdidas", "Rotación FIFO"],
        recommendedFor: ["HEALTHCARE", "RESTAURANT", "RETAIL"]
      }
    }
  },
  specialized: {
    title: "Funcionalidades Especializadas",
    description: "Características para tipos específicos de negocio",
    features: {
      habilitarRecetas: {
        icon: <FileText className="h-4 w-4" />,
        name: "Control de Recetas",
        description: "Gestión de medicamentos con receta médica",
        details: "Específico para farmacias y consultorios médicos",
        benefits: ["Validación de recetas", "Control regulatorio", "Historial médico"],
        recommendedFor: ["HEALTHCARE"]
      },
      habilitarReportes: {
        icon: <BarChart3 className="h-4 w-4" />,
        name: "Reportes Avanzados",
        description: "Análisis detallado de ventas, inventario y rendimiento",
        details: "Para tomar decisiones basadas en datos",
        benefits: ["Gráficos interactivos", "Exportación a Excel", "Análisis de tendencias"],
        recommendedFor: ["RETAIL", "SERVICES", "MIXED", "PROFESSIONAL"]
      },
      habilitarMultiUsuarios: {
        icon: <Users className="h-4 w-4" />,
        name: "Multi-Usuarios",
        description: "Gestiona múltiples empleados con diferentes permisos",
        details: "Para negocios con varios empleados o sucursales",
        benefits: ["Roles y permisos", "Seguimiento por usuario", "Control de acceso"],
        recommendedFor: ["RETAIL", "SERVICES", "RESTAURANT", "MIXED"]
      }
    }
  }
};

export function FeatureConfigurator({ 
  configuration, 
  onConfigChange, 
  businessType 
}: FeatureConfiguratorProps) {
  // ✅ Función para verificar si una característica es recomendada
  const isRecommended = (featureKey: string): boolean => {
    if (!businessType) return false;
    
    // Buscar la característica en todas las secciones
    for (const section of Object.values(FEATURES)) {
      const feature = section.features[featureKey];
      if (feature && feature.recommendedFor.includes(businessType)) {
        return true;
      }
    }
    return false;
  };

  // Si businessType es null, muestra un mensaje
  if (!businessType) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-border rounded-lg">
        <div className="text-muted-foreground mb-2">
          <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Selecciona un tipo de negocio</p>
          <p className="text-sm">para configurar las funcionalidades disponibles</p>
        </div>
      </div>
    );
  }

  const renderFeature = (key: string, feature: Feature) => (
    <div key={key} className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-1">
            {feature.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor={key} className="font-medium text-base">
                {feature.name}
              </Label>
              {isRecommended(key) && (
                <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-green-800 dark:text-green-300">
                  Recomendado
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
            <p className="text-xs text-muted-foreground mb-2">{feature.details}</p>
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground/80">Beneficios:</div>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                {feature.benefits.map((benefit: string, index: number) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <Switch
          id={key}
          checked={configuration[key as keyof FeatureConfig]}
          onCheckedChange={(checked) => onConfigChange(key, checked)}
          className="mt-1"
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Configura las funcionalidades</CardTitle>
        <CardDescription>
          Selecciona las características que necesitas para tu negocio. Puedes cambiar estas opciones más adelante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(FEATURES).map(([sectionKey, section]) => (
          <div key={sectionKey} className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground dark:text-foreground">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>

            <div className="space-y-4">
              {Object.entries(section.features).map(([key, feature]) =>
                renderFeature(key, feature)
              )}
            </div>

            {sectionKey !== "specialized" && <Separator />}
          </div>
        ))}

        <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
          <div className="flex items-start space-x-2">
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">¿No estás seguro?</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                No te preocupes. Puedes habilitar o deshabilitar cualquier funcionalidad después desde el panel de configuración.
                Comienza con lo básico y ve agregando características según las necesites.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { FeatureConfig };