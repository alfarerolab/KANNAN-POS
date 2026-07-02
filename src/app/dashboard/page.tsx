"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { EnhancedVentasChart } from "@/components/dashboard/EnhancedVentasChart";
import { NotificacionesVentasFiadas } from "@/components/ventas/NotificacionesVentasFiadas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Scissors,
  AlertTriangle,
  Star,
  Coffee,
  Shirt,
  Wrench,
  Pill,
  Smartphone,
  BookOpen,
  UtensilsCrossed,
  RefreshCw,
  Loader2,
  Plus,
  DollarSign,
  CreditCard,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// ✅ Tipo para alertas
interface Alerta {
  tipo: 'error' | 'warning' | 'info';
  mensaje: string;
  accion: string;
}

// Iconos por tipo de negocio
const ICONOS_NEGOCIO = {
  CAFETERIA: Coffee,
  SALON_BELLEZA: Scissors,
  FARMACIA: Pill,
  ROPA: Shirt,
  RESTAURANTE: UtensilsCrossed,
  FERRETERIA: Wrench,
  ELECTRONICA: Smartphone,
  LIBRERIA: BookOpen,
  TIENDA_COMIDA: ShoppingCart,
  PELUQUERIA: Scissors,
  OTRO: ShoppingCart
} as const;

export default function DashboardPage() {
  const { session } = useAuth();
  const { data: sessionData, status } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [chartType, setChartType] = useState<"area" | "bar" | "line">("area");

  // Hook optimizado para datos del dashboard con APIs reales
  const {
    stats,
    isLoading,
    isRefreshing,
    error,
    lastUpdate,
    refreshData,
    formatCurrency: formatCurrencyHook,
    hasData
  } = useDashboardData({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000,
    enableRealTime: false
  });

  // ✅ Redirección SIN recargar la página
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      startTransition(() => {
        router.push("/iniciar-sesion");
      });
      return;
    }

    // Si es SuperAdmin, redirigir a su panel específico
    if (session.user.role === "SUPERADMIN") {
      startTransition(() => {
        router.push("/dashboard/superadmin");
      });
      return;
    }

    // Si es empleado, redirigir directamente al POS
    if (session.user.role === "EMPLEADO") {
      startTransition(() => {
        router.push("/dashboard/pos");
      });
      return;
    }
  }, [session, status, router]);

  // Mostrar pantalla de carga
  if (status === "loading" || isPending) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión o es rol especial, no mostrar nada
  if (!session || session.user.role === "SUPERADMIN" || session.user.role === "EMPLEADO") {
    return null;
  }

  // Renderizar dashboard según el rol
  return (
    <div className="space-y-6">
      {/* Dashboard para Administradores y Gerentes */}
      {(session.user.role === "ADMINISTRADOR" || session.user.role === "GERENTE") && (
        <DashboardPrincipal
          stats={stats}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          lastUpdate={lastUpdate}
          refreshData={refreshData}
          formatCurrency={formatCurrencyHook}
          hasData={hasData}
          chartType={chartType}
          setChartType={setChartType}
          userRole={session.user.role}
        />
      )}
    </div>
  );
}

// Componente del Dashboard Principal mejorado
function DashboardPrincipal({
  stats,
  isLoading,
  isRefreshing,
  error,
  lastUpdate,
  refreshData,
  formatCurrency: formatCurrencyProp,
  hasData,
  chartType,
  setChartType,
  userRole
}: any) {
  const router = useRouter();
  const {
    configuracion,
    obtenerTema,
    tieneServicios,
    tieneCitas,
    obtenerElementosNavegacion,
    estaCargando: configLoading
  } = useConfiguracionEmpresa();

  // Estado para estadísticas de ventas fiadas
  const [estadisticasFiadas, setEstadisticasFiadas] = useState<any>(null);
  const [cargandoFiadas, setCargandoFiadas] = useState(true);

  const tema = obtenerTema();
  const elementos = obtenerElementosNavegacion();

  // Cargar estadísticas de ventas fiadas
  useEffect(() => {
    const cargarEstadisticasFiadas = async () => {
      try {
        const response = await fetch("/api/ventas/fiadas/estadisticas");
        if (response.ok) {
          const data = await response.json();
          setEstadisticasFiadas(data);
        }
      } catch (err) {
        console.error("Error al cargar estadísticas fiadas:", err);
      } finally {
        setCargandoFiadas(false);
      }
    };

    cargarEstadisticasFiadas();
  }, []);

  // ✅ Función con tipo correcto para generar alertas
  const generarAlertas = (datos: any, config: any, estadFiadas: any): Alerta[] => {
    const alertas: Alerta[] = [];

    if (!datos) return alertas;

    // NUEVO: Alertas para ventas fiadas vencidas
    if (estadFiadas && estadFiadas.ventasVencidas > 0) {
      alertas.push({
        tipo: 'error',
        mensaje: `${estadFiadas.ventasVencidas} ventas fiadas vencidas (${formatCurrency(estadFiadas.montoVencido)} pendiente)`,
        accion: '/dashboard/ventas?filtro=vencidas'
      });
    }

    // NUEVO: Alertas para ventas próximas a vencer
    if (estadFiadas && estadFiadas.ventasPorVencer > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `${estadFiadas.ventasPorVencer} ventas fiadas vencen en los próximos 7 días`,
        accion: '/dashboard/ventas?filtro=por-vencer'
      });
    }

    // Alertas para farmacias
    if (config?.tipoNegocio === 'FARMACIA' && datos.productosVencenProximamente > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `${datos.productosVencenProximamente} productos vencen próximamente`,
        accion: '/dashboard/inventario'
      });
    }

    // Alertas para servicios
    if (tieneServicios() && datos.citasPendientes > 10) {
      alertas.push({
        tipo: 'info',
        mensaje: `Tienes ${datos.citasPendientes} citas pendientes`,
        accion: '/dashboard/citas'
      });
    }

    // Alertas generales de stock
    if (datos.productosStockBajo > 0) {
      alertas.push({
        tipo: 'warning',
        mensaje: `${datos.productosStockBajo} productos con stock bajo`,
        accion: '/dashboard/inventario'
      });
    }

    // Sin stock
    if (datos.productosSinStock > 0) {
      alertas.push({
        tipo: 'error',
        mensaje: `${datos.productosSinStock} productos sin stock`,
        accion: '/dashboard/inventario'
      });
    }

    return alertas;
  };

  // Formatear fecha
  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (isLoading || configLoading || !configuracion) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            Panel de {userRole === "ADMINISTRADOR" ? "Administrador" : "Gerente"}
          </h1>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">
          Panel de {userRole === "ADMINISTRADOR" ? "Administrador" : "Gerente"}
        </h1>
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="flex justify-between items-center">
            <span className="text-red-800 dark:text-red-300">Error al cargar datos: {error}</span>
            <Button onClick={refreshData} variant="outline" size="sm" disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const IconoNegocio = ICONOS_NEGOCIO[configuracion.tipoNegocio as keyof typeof ICONOS_NEGOCIO] || ShoppingCart;
  const alertas: Alerta[] = stats ? generarAlertas(stats, configuracion, estadisticasFiadas) : [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <IconoNegocio className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              Panel de {userRole === "ADMINISTRADOR" ? "Administrador" : "Gerente"}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={tema.accent}>
                {tema.icon} {configuracion.tipoNegocio.replace('_', ' ')}
              </Badge>
              {lastUpdate && (
                <span className="text-xs text-muted-foreground">
                  Actualizado: {formatearFecha(lastUpdate.toISOString())}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="transition-all duration-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>

          <div className="text-right hidden sm:block">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas dinámicas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((alerta, index) => (
            <Alert 
              key={index} 
              className={
                alerta.tipo === 'error' ? 'border-destructive/40 bg-destructive/10 dark:bg-red-950/30 dark:border-red-800' :
                alerta.tipo === 'warning' ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 dark:border-amber-800' : 
                'border-blue-500/40 bg-blue-500/10 dark:bg-blue-950/30 dark:border-blue-800'
              }
            >
              <AlertTriangle className={`h-4 w-4 ${
                alerta.tipo === 'error' ? 'text-red-600 dark:text-red-400 dark:text-red-400' :
                alerta.tipo === 'warning' ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' :
                'text-blue-600 dark:text-blue-400 dark:text-blue-400'
              }`} />
              <AlertDescription className="flex justify-between items-center">
                <span>{alerta.mensaje}</span>
                <Button asChild variant="outline" size="sm">
                  <Link href={alerta.accion}>Ver detalles</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Accesos Rápidos */}
      {userRole === "ADMINISTRADOR" && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {elementos.slice(0, 6).map((elemento) => {
            const Icon = elemento.href.includes('pos') ? ShoppingCart :
                       elemento.href.includes('ventas') ? BarChart3 :
                       elemento.href.includes('productos') ? Package :
                       elemento.href.includes('restaurante') ? UtensilsCrossed :
                       elemento.href.includes('servicios') ? Scissors :
                       elemento.href.includes('citas') ? Calendar :
                       elemento.href.includes('clientes') ? Users :
                       Plus;

            return (
              <Link key={elemento.href} href={elemento.href}>
                <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 bg-card border-border">
                  <CardContent className="flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-primary flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <h3 className="font-semibold text-sm">{elemento.titulo}</h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Hoy */}
        <MetricCard
          title="Ventas Hoy"
          value={formatCurrency(stats?.totalVentasHoy || 0)}
          subtitle={`${stats?.ventasHoy || 0} transacciones`}
          icon={TrendingUp}
          variant="default"
          onClick={() => router.push('/dashboard/ventas')}
          loading={isLoading}
        />

        {/* Productos/Inventario */}
        <MetricCard
          title={configuracion.tipoNegocio === 'FARMACIA' ? 'Medicamentos' : 'Productos'}
          value={stats?.totalProductos || 0}
          subtitle={`${stats?.productosStockBajo || 0} con stock bajo`}
          icon={Package}
          variant={stats?.productosStockBajo > 0 ? "warning" : "success"}
          onClick={() => router.push('/dashboard/inventario')}
          loading={isLoading}
        />

        {/* NUEVO: Ventas Fiadas - Métricas */}
        {!cargandoFiadas && estadisticasFiadas && estadisticasFiadas.totalVentasFiadas > 0 && (
          <MetricCard
            title="Ventas Fiadas"
            value={formatCurrency(estadisticasFiadas.saldoPendienteTotal)}
            subtitle={`${estadisticasFiadas.totalVentasFiadas} ventas pendientes`}
            icon={CreditCard}
            variant={estadisticasFiadas.ventasVencidas > 0 ? "warning" : "default"}
            onClick={() => router.push('/dashboard/ventas?soloFiadas=true')}
            loading={cargandoFiadas}
          />
        )}

        {/* Citas - solo para servicios */}
        {tieneCitas() && (
          <MetricCard
            title="Citas Hoy"
            value={stats?.citasHoy || 0}
            subtitle={`${stats?.citasPendientes || 0} pendientes`}
            icon={Calendar}
            variant="accent"
            onClick={() => router.push('/dashboard/citas')}
            loading={isLoading}
          />
        )}

        {/* Servicios - solo para servicios */}
        {tieneServicios() && !tieneCitas() && (
          <MetricCard
            title="Servicios"
            value={stats?.serviciosActivos || 0}
            subtitle="servicios activos"
            icon={Scissors}
            variant="accent"
            onClick={() => router.push('/dashboard/servicios')}
            loading={isLoading}
          />
        )}

        {/* Clientes */}
        <MetricCard
          title="Clientes"
          value={stats?.totalClientes || 0}
          subtitle={`${stats?.clientesNuevosMes || 0} nuevos este mes`}
          icon={Users}
          variant="success"
          onClick={() => router.push('/dashboard/clientes')}
          loading={isLoading}
        />
      </div>

      {/* Gráficos y widgets */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de ventas */}
        <div className="lg:col-span-2">
          <EnhancedVentasChart
            data={stats?.ventasPorDia || []}
            tipo={chartType}
            onTipoChange={setChartType}
            titulo="Evolución de Ventas"
            descripcion="Rendimiento de ventas en los últimos 7 días"
            mostrarCantidad={true}
            totalPeriodo={stats?.totalVentasSemana || 0}
            cambioAnterior={stats?.cambioVentas || 0}
            loading={isLoading}
          />
        </div>

        {/* NUEVO: Notificaciones de Ventas Fiadas */}
        {!cargandoFiadas && estadisticasFiadas && estadisticasFiadas.totalVentasFiadas > 0 && (
          <div className="lg:col-span-1">
            <NotificacionesVentasFiadas
              maxItems={5}
              mostrarTodas={false}
              onNotificacionClick={(ventaId) => router.push(`/dashboard/ventas/${ventaId}`)}
            />
          </div>
        )}

        {/* Ventas Recientes */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
            <CardDescription>Las últimas transacciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !stats?.ventasRecientes?.length ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/70" />
                <p className="text-sm text-muted-foreground">
                  No hay ventas recientes registradas
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/dashboard/pos">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Venta
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.ventasRecientes.slice(0, 5).map((venta: any) => (
                  <div key={venta.id} className="flex justify-between items-center pb-2 border-b border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {venta.cliente?.nombre || "Cliente no registrado"}
                        </p>
                        {/* NUEVO: Badge para ventas fiadas */}
                        {venta.esVentaFiada && (
                          <Badge variant="outline" className="text-xs">
                            FIADO
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatearFecha(venta.createdAt)} • {venta.metodoPago}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(venta.total)}</p>
                      {/* NUEVO: Mostrar saldo pendiente si es fiada */}
                      {venta.esVentaFiada && venta.saldoPendiente > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Pendiente: {formatCurrency(venta.saldoPendiente)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos Populares */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>
              {configuracion.tipoNegocio === 'FARMACIA' ? 'Medicamentos Populares' :
               configuracion.tipoNegocio === 'RESTAURANTE' ? 'Platos Populares' :
               'Productos Populares'}
            </CardTitle>
            <CardDescription>Los productos más vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : !stats?.productosMasVendidos?.length ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/70" />
                <p className="text-sm text-muted-foreground">
                  No hay datos suficientes para mostrar productos populares
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.productosMasVendidos.slice(0, 5).map((producto: any, index: number) => (
                  <div key={producto.id} className="flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {index < 3 && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        <p className="font-medium">{producto.nombre}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Precio: {formatCurrency(Number(producto.precio))}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">
                      {producto.cantidadVendida} vendidos
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
