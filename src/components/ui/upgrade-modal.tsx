"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Crown,
  Users,
  Package,
  Monitor,
  BarChart3,
  Settings,
  ArrowRight,
  CheckCircle,
  XCircle,
  Star,
  Mail,
  Phone
} from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  razon?: string;
  limiteAlcanzado?: string;
  planActual?: any;
  accionRequerida?: 'upgrade' | 'contactar_soporte' | 'renovar';
  funcionRequerida?: string;
}

interface PlanDestacado {
  id: string;
  nombre: string;
  precio: number;
  meses: number;
  descripcion: string;
  caracteristicas: string[];
  limitesUsuarios?: number;
  limitesProductos?: number;
  limitesTerminales?: number;
  habilitarReportes: boolean;
  habilitarMultiUsuario: boolean;
  habilitarInventario: boolean;
  habilitarServicios: boolean;
  destacado: boolean;
}

const PLANES_EJEMPLO: PlanDestacado[] = [
  {
    id: 'basico',
    nombre: 'Plan Básico',
    precio: 29,
    meses: 1,
    descripcion: 'Perfecto para pequeños negocios',
    caracteristicas: [
      'Hasta 3 usuarios',
      'Hasta 500 productos',
      'Terminal principal',
      'Reportes básicos',
      'Soporte por email'
    ],
    limitesUsuarios: 3,
    limitesProductos: 500,
    limitesTerminales: 1,
    habilitarReportes: false,
    habilitarMultiUsuario: false,
    habilitarInventario: true,
    habilitarServicios: false,
    destacado: false
  },
  {
    id: 'profesional',
    nombre: 'Plan Profesional',
    precio: 79,
    meses: 1,
    descripcion: 'Para negocios en crecimiento',
    caracteristicas: [
      'Hasta 10 usuarios',
      'Productos ilimitados',
      'Hasta 3 terminales',
      'Reportes avanzados',
      'Gestión de servicios',
      'Soporte prioritario'
    ],
    limitesUsuarios: 10,
    limitesProductos: undefined,
    limitesTerminales: 3,
    habilitarReportes: true,
    habilitarMultiUsuario: true,
    habilitarInventario: true,
    habilitarServicios: true,
    destacado: true
  },
  {
    id: 'empresarial',
    nombre: 'Plan Empresarial',
    precio: 149,
    meses: 1,
    descripcion: 'Para empresas grandes',
    caracteristicas: [
      'Usuarios ilimitados',
      'Productos ilimitados',
      'Terminales ilimitadas',
      'Reportes avanzados',
      'Todas las funcionalidades',
      'Soporte 24/7'
    ],
    limitesUsuarios: undefined,
    limitesProductos: undefined,
    limitesTerminales: undefined,
    habilitarReportes: true,
    habilitarMultiUsuario: true,
    habilitarInventario: true,
    habilitarServicios: true,
    destacado: false
  }
];

export function UpgradeModal({
  open,
  onOpenChange,
  razon,
  limiteAlcanzado,
  planActual,
  accionRequerida = 'upgrade',
  funcionRequerida
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  const getIconForLimit = (tipo: string) => {
    switch (tipo) {
      case 'usuarios': return <Users className="h-5 w-5" />;
      case 'productos': return <Package className="h-5 w-5" />;
      case 'terminales': return <Monitor className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getTituloSegunAccion = () => {
    switch (accionRequerida) {
      case 'renovar':
        return 'Suscripción Vencida';
      case 'contactar_soporte':
        return 'Contactar Soporte';
      case 'upgrade':
      default:
        return 'Actualizar Plan';
    }
  };

  const getDescripcionSegunAccion = () => {
    switch (accionRequerida) {
      case 'renovar':
        return 'Su suscripción ha vencido. Renueve para continuar usando el sistema.';
      case 'contactar_soporte':
        return 'Necesita ayuda con su cuenta. Contacte a nuestro equipo de soporte.';
      case 'upgrade':
      default:
        return limiteAlcanzado
          ? `Ha alcanzado el límite de ${limiteAlcanzado} de su plan actual.`
          : `Su plan actual no incluye esta funcionalidad.`;
    }
  };

  const handleContactSupport = () => {
    setLoading(true);
    // Aquí podrías abrir un chat, redirigir a email, etc.
    window.location.href = 'mailto:soporte@sistemapos.com?subject=Consulta sobre plan';
  };

  const handleUpgradePlan = (planId: string) => {
    setLoading(true);
    // Aquí implementarías la lógica de upgrade
    // Ejemplo: redirigir a página de pago
    // window.location.href = `/upgrade/${planId}`;
  };

  const renderContactSupport = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center">
        <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground">
          Nuestro equipo de soporte está aquí para ayudarle.
        </p>

        <div className="space-y-2">
          <Button
            onClick={handleContactSupport}
            disabled={loading}
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Enviar Email
          </Button>

          <div className="text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4" />
              +1 (555) 123-4567
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlanComparison = () => (
    <div className="space-y-4">
      {/* Plan actual */}
      {planActual && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                Plan Actual: {planActual.nombre}
              </CardTitle>
              <Badge variant="destructive">Límite alcanzado</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {limiteAlcanzado && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  {getIconForLimit(limiteAlcanzado)}
                  <span className="font-medium">
                    Límite de {limiteAlcanzado}: {planActual[`limites${limiteAlcanzado.charAt(0).toUpperCase() + limiteAlcanzado.slice(1)}`] || 'No definido'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planes recomendados */}
      <div className="grid gap-4 md:grid-cols-2">
        {PLANES_EJEMPLO
          .filter(plan => {
            // Filtrar planes que resuelvan el problema
            if (limiteAlcanzado) {
              const campoLimite = `limites${limiteAlcanzado.charAt(0).toUpperCase() + limiteAlcanzado.slice(1)}`;
              const limitePlan = plan[campoLimite as keyof PlanDestacado];
              const limiteActual = planActual?.[campoLimite];

              return !limitePlan || (limitePlan && limiteActual && limitePlan > limiteActual);
            }

            if (funcionRequerida) {
              return plan[funcionRequerida as keyof PlanDestacado] === true;
            }

            return true;
          })
          .slice(0, 2)
          .map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.destacado ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
            >
              {plan.destacado && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Recomendado
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    {plan.nombre}
                  </CardTitle>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">${plan.precio}</div>
                    <div className="text-sm text-muted-foreground">/mes</div>
                  </div>
                </div>
                <CardDescription>{plan.descripcion}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {plan.caracteristicas.slice(0, 3).map((caracteristica, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                      {caracteristica}
                    </div>
                  ))}
                  {plan.caracteristicas.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{plan.caracteristicas.length - 3} características más
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleUpgradePlan(plan.id)}
                  disabled={loading}
                  className="w-full"
                  variant={plan.destacado ? "default" : "outline"}
                >
                  Seleccionar Plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            {getTituloSegunAccion()}
          </DialogTitle>
          <DialogDescription className="text-base">
            {getDescripcionSegunAccion()}
          </DialogDescription>

          {razon && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">{razon}</p>
            </div>
          )}
        </DialogHeader>

        <div className="py-4">
          {accionRequerida === 'contactar_soporte' ? renderContactSupport() : renderPlanComparison()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>

          {accionRequerida === 'upgrade' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleContactSupport}>
                <Mail className="h-4 w-4 mr-2" />
                Contactar Soporte
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
