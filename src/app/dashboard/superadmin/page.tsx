"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Target,
  Percent,
  Activity,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Crown,
  Building,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  TrendingDown,
  UserPlus,
  UserMinus
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAutorizacion } from "@/hooks/use-autorizacion";

interface MetricasSaaS {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  cac: number;
  totalClientes: number;
  clientesActivos: number;
  clientesInactivos: number;
  clientesNuevos: number;
  tasaCrecimiento: number;
  retencionMensual: number;
  suscripcionesActivas: number;
  ingresosPorPlan: { [key: string]: { monto: number; clientes: number } };
  empresasRecientes: Array<{
    nombre: string;
    plan: string;
    fechaRegistro: string;
    monto: number;
  }>;
  alertas: Array<{
    tipo: 'vencimiento' | 'churn' | 'oportunidad';
    mensaje: string;
    fecha: string;
    prioridad: 'alta' | 'media' | 'baja';
    empresaId?: string;
  }>;
  objetivos: {
    mrrObjetivo: number;
    clientesObjetivo: number;
    churnObjetivo: number;
  };
  estadisticas: {
    empresasEsteMes: number;
    empresasMesAnterior: number;
    suscripcionesVencenProximas: number;
    conversionRate: number;
  };
}

export default function SuperAdminDashboard() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin } = useAutorizacion();

  const [isLoading, setIsLoading] = useState(true);
  const [metricas, setMetricas] = useState<MetricasSaaS | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  // Memoizar la función de formateo para evitar recrearla en cada render
  const formatearMoneda = useCallback((valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }, []);

  // Memoizar funciones que no cambian
  const getProgressColor = useCallback((actual: number, objetivo: number, inverso = false) => {
    const porcentaje = (actual / objetivo) * 100;
    if (inverso) {
      return porcentaje <= 100 ? "bg-green-500" : "bg-red-500";
    }
    return porcentaje >= 80 ? "bg-green-500" : porcentaje >= 60 ? "bg-yellow-500" : "bg-red-500";
  }, []);

  const getAlertIcon = useCallback((tipo: string) => {
    switch (tipo) {
      case 'vencimiento':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'churn':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'oportunidad':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  }, []);

  const getTrendIcon = useCallback((valor: number) => {
    if (valor > 0) {
      return <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />;
    } else if (valor < 0) {
      return <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />;
    }
    return <Activity className="h-3 w-3 text-muted-foreground" />;
  }, []);

  // Función de carga de métricas optimizada
  const cargarMetricas = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/administrador/dashboard/metricas');

      if (!response.ok) {
        throw new Error('Error al cargar métricas');
      }

      const data = await response.json();
      setMetricas(data);
      setUltimaActualizacion(new Date());

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las métricas del sistema",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // Solo depende de toast

  // Effect optimizado con dependencias correctas
  useEffect(() => {
    if (esSuperAdmin === false) {
      router.push("/dashboard");
      return;
    }
    
    if (esSuperAdmin === true) {
      cargarMetricas();
    }
  }, [esSuperAdmin, router, cargarMetricas]);

  // Memoizar cálculos costosos
  const metricasCalculadas = useMemo(() => {
    if (!metricas) return null;

    return {
      ltvCacRatio: metricas.cac > 0 ? Math.round((metricas.ltv / metricas.cac) * 10) / 10 : 0,
      promedioMensualArr: Math.round(metricas.arr / 12),
      porcentajesMrr: Object.entries(metricas.ingresosPorPlan).reduce((acc, [plan, data]) => {
        acc[plan] = metricas.mrr > 0 ? Math.round((data.monto / metricas.mrr) * 100) : 0;
        return acc;
      }, {} as Record<string, number>),
      progresosObjetivos: {
        mrr: (metricas.mrr / metricas.objetivos.mrrObjetivo) * 100,
        clientes: (metricas.clientesActivos / metricas.objetivos.clientesObjetivo) * 100,
        churn: (metricas.churnRate / metricas.objetivos.churnObjetivo) * 100
      }
    };
  }, [metricas]);

  // Early returns para evitar renders innecesarios
  if (esSuperAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando métricas del sistema...</p>
        </div>
      </div>
    );
  }

  if (!metricas || !metricasCalculadas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">Error al cargar datos</h2>
          <p className="text-muted-foreground mb-4">No se pudieron obtener las métricas del sistema.</p>
          <Button onClick={cargarMetricas}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Dashboard SaaS
          </h1>
          <p className="text-muted-foreground">
            Panel de control ejecutivo del sistema POS SaaS
          </p>
          {ultimaActualizacion && (
            <p className="text-xs text-muted-foreground mt-1">
              Última actualización: {ultimaActualizacion.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cargarMetricas}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link href="/dashboard/superadmin/empresas/nuevo">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Empresa
            </Button>
          </Link>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatearMoneda(metricas.mrr)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(metricas.tasaCrecimiento)}
              <span className="ml-1">
                {metricas.tasaCrecimiento > 0 ? '+' : ''}{metricas.tasaCrecimiento}% vs mes anterior
              </span>
            </div>
            <div className="mt-2">
              <Progress
                value={metricasCalculadas.progresosObjetivos.mrr}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {formatearMoneda(metricas.objetivos.mrrObjetivo)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatearMoneda(metricas.arr)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3 mr-1" />
              {formatearMoneda(metricasCalculadas.promedioMensualArr)}/mes promedio
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.clientesActivos}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <UserPlus className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
              +{metricas.clientesNuevos} este mes
            </div>
            <div className="mt-2">
              <Progress
                value={metricasCalculadas.progresosObjetivos.clientes}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {metricas.objetivos.clientesObjetivo} clientes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Percent className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{metricas.churnRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              Meta: &lt;{metricas.objetivos.churnObjetivo}%
            </div>
            <div className="mt-2">
              <Progress
                value={metricasCalculadas.progresosObjetivos.churn}
                className="h-2"
              />
              <p className={`text-xs mt-1 ${
                metricas.churnRate <= metricas.objetivos.churnObjetivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {metricas.churnRate <= metricas.objetivos.churnObjetivo ? 'Dentro del objetivo' : 'Por encima del objetivo'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LTV:CAC Ratio</CardTitle>
            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metricasCalculadas.ltvCacRatio}:1
            </div>
            <p className="text-xs text-muted-foreground">
              LTV: {formatearMoneda(metricas.ltv)} | CAC: {formatearMoneda(metricas.cac)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retención</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{metricas.retencionMensual}%</div>
            <p className="text-xs text-muted-foreground">Retención mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversión</CardTitle>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metricas.estadisticas.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metricas.suscripcionesActivas} de {metricas.totalClientes} clientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Vencimientos</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {metricas.estadisticas.suscripcionesVencenProximas}
            </div>
            <p className="text-xs text-muted-foreground">En los próximos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos por plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Plan</CardTitle>
            <CardDescription>Distribución de MRR por tipo de plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(metricas.ingresosPorPlan).map(([plan, data]) => (
              <div key={plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{plan}</p>
                  <p className="text-sm text-muted-foreground">{data.clientes} clientes</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatearMoneda(data.monto)}</p>
                  <p className="text-xs text-muted-foreground">
                    {metricasCalculadas.porcentajesMrr[plan]}% del MRR
                  </p>
                </div>
              </div>
            ))}
            {Object.keys(metricas.ingresosPorPlan).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay planes activos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas importantes */}
        <Card>
          <CardHeader>
            <CardTitle>Alertas Importantes</CardTitle>
            <CardDescription>Eventos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricas.alertas.length > 0 ? (
                metricas.alertas.map((alerta, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    {getAlertIcon(alerta.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alerta.mensaje}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alerta.fecha).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        alerta.prioridad === 'alta' ? 'destructive' :
                        alerta.prioridad === 'media' ? 'default' : 'secondary'
                      }
                    >
                      {alerta.prioridad}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay alertas pendientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empresas recientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nuevos Clientes</CardTitle>
              <CardDescription>Empresas registradas recientemente</CardDescription>
            </div>
            <Link href="/dashboard/superadmin/empresas">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {metricas.empresasRecientes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricas.empresasRecientes.map((empresa, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{empresa.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{empresa.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(empresa.fechaRegistro).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatearMoneda(empresa.monto)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay empresas registradas recientemente</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enlaces rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/superadmin/empresas">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <Building className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="font-medium">Clientes</p>
                <p className="text-sm text-muted-foreground">{metricas.totalClientes} total</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/superadmin/suscripciones">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="font-medium">Suscripciones</p>
                <p className="text-sm text-muted-foreground">{metricas.suscripcionesActivas} activas</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/superadmin/planes">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                <p className="font-medium">Planes</p>
                <p className="text-sm text-muted-foreground">{Object.keys(metricas.ingresosPorPlan).length} activos</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/superadmin/analytics">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                <p className="font-medium">Analytics</p>
                <p className="text-sm text-muted-foreground">Reportes avanzados</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}