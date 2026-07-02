"use client"
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, DollarSign, ShoppingCart, Target, TrendingUp,
  Download, ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
  AlertTriangle, Activity, Settings, Loader2, FileText, Filter,
  BarChart3,
  Package,
  Users,
  Clock,
  List,
  Brain
} from "lucide-react";

// Importar los componentes modulares
import { AnalyticsTab } from "@/components/ventas/AnalyticsTab";
import { ProductosTab } from "@/components/ventas/ProductosTab";
import { VendedoresTab } from "@/components/ventas/VendedoresTab";
import { TiempoRealTab } from "@/components/ventas/TiempoRealTab";
import { PrediccionesTab } from "@/components/ventas/PrediccionesTab";
import { ConfiguracionMetasModal } from "@/components/ventas/ConfiguracionMetasModal";

import { ListaVentasTab } from "@/components/ventas/ListaVentasTab";
import { useAnalisisVentas, useEstadisticasRapidas, useAlertasVentas, esTendenciasVentas, esEstadisticasGenerales, esAnalisisComparativo } from "@/hooks/use-analitica-ventas";
import { useMetas } from "@/hooks/use-metas";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface FiltrosLocales {
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  categoria: string;
  vendedor: string;
}

export default function AdvancedSalesPage() {
  const { data: session } = useSession();

  const {
    datos,
    loading,
    error,
    cargarAnalisis,
    actualizarFiltros,
    filtrosActuales,
    exportarDatos,
  } = useAnalisisVentas();


  const { stats: statsRapidas, loading: loadingStats, refresh: refreshStats } = useEstadisticasRapidas();
  const { alertas, alertasCriticas, alertasAdvertencia, dismissAlert } = useAlertasVentas();
  
  // Hook de metas integrado
  const { 
    metas, 
    loading: loadingMetas, 
    error: errorMetas,
    cargarMetas,
    obtenerMetaPorTipo,
    obtenerEstadisticasGenerales: obtenerEstadisticasMetas,
    formatearMoneda: formatearMonedaMetas
  } = useMetas();
  
  // Estados locales
  const [filtros, setFiltros] = useState<FiltrosLocales>({
    periodo: "semana",
    fechaInicio: "",
    fechaFin: "",
    categoria: "todas",
    vendedor: "todos"
  });

  // Estados para modales
  const [modalMetasAbierto, setModalMetasAbierto] = useState(false);
  const [metaParaEditar, setMetaParaEditar] = useState<{
    id: string;
    periodo: 'diaria' | 'semanal' | 'mensual';
    objetivo: number;
    tipo?: 'ingresos' | 'ventas';
  } | null>(null);

  // Cargar metas al montar el componente
  useEffect(() => {
    if (session?.user?.empresaId) {
      cargarMetas();
    }
  }, [session?.user?.empresaId]);

  // Funciones auxiliares
  const formatearMoneda = (cantidad?: number) => {
    if (cantidad == null || isNaN(cantidad)) return "--";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cantidad);
  };

  const getTrendIcon = (valor: number) => {
    if (valor > 0) return <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (valor < 0) return <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      "COMPLETADA": "bg-emerald-500/15 dark:bg-green-900/40 text-green-800 dark:text-green-300 dark:text-green-300",
      "EN_PROGRESO": "bg-amber-500/15 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300", 
      "PENDIENTE": "bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300"
    };
    const labels = {
      "COMPLETADA": "Completada",
      "EN_PROGRESO": "En Progreso",
      "PENDIENTE": "Pendiente"
    };
    return <Badge className={variants[estado as keyof typeof variants] || ""}>{labels[estado as keyof typeof labels] || estado}</Badge>;
  };

  const getAlertIcon = (tipo: string) => {
    if (tipo === "critica") return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (tipo === "advertencia") return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    return <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  const getProgressColor = (progreso: number) => {
    if (progreso >= 100) return 'bg-green-500';
    if (progreso >= 80) return 'bg-blue-500';
    if (progreso >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleExport = () => {
    exportarDatos('json');
  };

  const handleRefreshAll = () => {
    refreshStats();
    cargarMetas();
    cargarAnalisis(filtrosActuales);
    toast.success("Datos actualizados correctamente");
  };

  const handleFiltroChange = (nuevosFiltros: Partial<FiltrosLocales>) => {
    const filtrosActualizados = { ...filtros, ...nuevosFiltros };
    setFiltros(filtrosActualizados);
    
    actualizarFiltros({
      tipo: 'general' as const,
      periodo: (filtrosActualizados.periodo || 'mes') as 'dia' | 'semana' | 'mes' | 'año',
      fechaInicio: filtrosActualizados.fechaInicio,
      fechaFin: filtrosActualizados.fechaFin,
    });
  };

  const handleEditarMeta = (meta: any) => {
    setMetaParaEditar(meta);
    setModalMetasAbierto(true);
  };

  const handleCerrarModal = () => {
    setModalMetasAbierto(false);
    setMetaParaEditar(null);
    // Recargar metas después de cerrar el modal
    cargarMetas();
  };

  // Mostrar loading si no hay datos iniciales
  if (loading && !datos) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Cargando datos de ventas...</p>
          </div>
        </div>
      </div>
    );
  }

  // Datos por defecto si no hay datos de la API
  const kpisData = datos && 'resumen' in datos ? {
    ventasHoy: { 
      valor: datos.ventasHoy?.cantidad || 0, 
      cambio: datos.ventasHoy?.crecimientoVentas || 0,
      tipo: (datos.ventasHoy?.crecimientoVentas || 0) >= 0 ? "positivo" : "negativo"
    },
    ingresosHoy: { 
      valor: datos.ventasHoy?.ingresos || 0, 
      cambio: datos.ventasHoy?.crecimientoIngresos || 0,
      tipo: (datos.ventasHoy?.crecimientoIngresos || 0) >= 0 ? "positivo" : "negativo"
    },
    ticketPromedio: { 
      valor: datos.resumen?.ticketPromedio || 0, 
      cambio: 0,
      tipo: "neutral" as const
    },
    conversionRate: { valor: 87.5, cambio: 3.2, tipo: "positivo" as const },
  } : {
    ventasHoy: { valor: 0, cambio: 0, tipo: "neutral" as const },
    ingresosHoy: { valor: 0, cambio: 0, tipo: "neutral" as const },
    ticketPromedio: { valor: 0, cambio: 0, tipo: "neutral" as const },
    conversionRate: { valor: 0, cambio: 0, tipo: "neutral" as const },
  };

  // Obtener estadísticas de metas
  const estadisticasMetas = obtenerEstadisticasMetas();

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-4 sm:-m-6 lg:-m-8">
      {/* Header Banner Edge-to-Edge */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Centro de Ventas</h1>
              <p className="text-sm sm:text-base text-muted-foreground flex items-center">
                Análisis integral de tu rendimiento comercial
                <span className="hidden sm:inline mx-2">•</span>
                <span className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-0">
                  <Activity className="mr-1 h-4 w-4" />
                  Sistema activo
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="h-11">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="h-11">
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
            <Link href="/dashboard/pos">
              <Button className="flex items-center gap-2 px-6 h-11 shadow-sm transition-all duration-200 bg-primary hover:bg-primary/90 w-full sm:w-auto mt-2 sm:mt-0">
                <PlusCircle className="h-4 w-4 mr-0" />
                Nueva Venta
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Alertas importantes */}
      {alertas.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {alertas.slice(0, 2).map((alerta) => (
            <Card key={alerta.id} className={`border-l-4 ${
              alerta.tipo === 'critica' ? 'border-l-red-500 bg-destructive/10' : 
              alerta.tipo === 'advertencia' ? 'border-l-amber-500 bg-amber-500/10' : 
              'border-l-blue-500 bg-blue-500/10'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alerta.tipo)}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{alerta.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{alerta.descripcion}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => dismissAlert(alerta.id)}>✕</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle>
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <ShoppingCart className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : kpisData.ventasHoy.valor}
            </div>
            <div className="flex items-center text-xs mt-1">
              {getTrendIcon(kpisData.ventasHoy.cambio)}
              <span className={`ml-1 ${kpisData.ventasHoy.tipo === 'positivo' ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
                {kpisData.ventasHoy.cambio > 0 ? '+' : ''}{kpisData.ventasHoy.cambio.toFixed(1)}% vs ayer
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 animate-fade-in-up stagger-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Hoy</CardTitle>
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <DollarSign className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : formatearMoneda(kpisData.ingresosHoy.valor)}
            </div>
            <div className="flex items-center text-xs mt-1">
              {getTrendIcon(kpisData.ingresosHoy.cambio)}
              <span className={`ml-1 ${kpisData.ingresosHoy.tipo === 'positivo' ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
                {kpisData.ingresosHoy.cambio > 0 ? '+' : ''}{kpisData.ingresosHoy.cambio.toFixed(1)}% vs ayer
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 animate-fade-in-up stagger-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio</CardTitle>
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : formatearMoneda(kpisData.ticketPromedio.valor)}
            </div>
            <div className="flex items-center text-xs mt-1">
              {getTrendIcon(kpisData.ticketPromedio.cambio)}
              <span className="ml-1 text-muted-foreground">Calculado sobre ventas completadas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:shadow-lg transition-all duration-300 animate-fade-in-up stagger-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversión</CardTitle>
            <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpisData.conversionRate.valor}%</div>
            <div className="flex items-center text-xs mt-1">
              {getTrendIcon(kpisData.conversionRate.cambio)}
              <span className="ml-1 text-emerald-600">+{kpisData.conversionRate.cambio}% mejora</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Metas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Metas de Venta</h2>
          <div className="flex items-center space-x-2">
            {loadingMetas && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setModalMetasAbierto(true)}
            >
              <Target className="mr-2 h-4 w-4" />
              Configurar Metas
            </Button>
          </div>
        </div>

        {errorMetas && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Error al cargar las metas: {errorMetas}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen de metas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{estadisticasMetas.total}</div>
                <div className="text-sm text-muted-foreground">Total Metas</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{estadisticasMetas.completadas}</div>
                <div className="text-sm text-muted-foreground">Completadas</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{estadisticasMetas.enProgreso}</div>
                <div className="text-sm text-muted-foreground">En Progreso</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{estadisticasMetas.progresoPromedio.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Progreso Promedio</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metas detalladas */}
        <div className="grid gap-4 md:grid-cols-3">
          {(['diaria', 'semanal', 'mensual'] as const).map((periodo) => {
            const meta = obtenerMetaPorTipo(periodo);
            
            if (!meta) {
              return (
                <Card key={periodo} className="border-dashed border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm capitalize">Meta {periodo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground mb-2">
                        No configurada
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setModalMetasAbierto(true)}
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Configurar Meta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={periodo}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm capitalize">Meta {periodo}</CardTitle>
                    {getEstadoBadge(meta.estado || 'PENDIENTE')}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Objetivo:</span>
                      <span className="font-medium">{formatearMoneda(meta.objetivo)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-medium">{formatearMoneda(meta.actual || 0)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{(meta.progreso || 0).toFixed(1)}%</span>
                        <span>100%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${getProgressColor(meta.progreso || 0)}`}
                          style={{ width: `${Math.min(meta.progreso || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">
                        {meta.falta && meta.falta > 0 
                          ? `Falta: ${formatearMoneda(meta.falta)}`
                          : meta.progreso && meta.progreso >= 100 
                            ? '¡Meta alcanzada! 🎉' 
                            : '--'
                        }
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleEditarMeta(meta)}
                      >
                        Editar
                      </Button>
                    </div>
                    
                    {meta.updatedAt && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Actualizada: {new Date(meta.updatedAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtros de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select
                value={filtros.periodo}
                onValueChange={(value) => handleFiltroChange({ periodo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoy</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mes</SelectItem>
                  <SelectItem value="año">Este Año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleFiltroChange({ fechaInicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleFiltroChange({ fechaFin: e.target.value })}
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button onClick={handleRefreshAll} disabled={loading || loadingMetas} className="w-full">
                {(loading || loadingMetas) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analytics" className="w-full">
        {/* Móvil: scroll horizontal nativo */}
        <div className="w-full overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="flex w-max min-w-full h-auto bg-muted/50 gap-1 p-1 rounded-xl">
            <TabsTrigger value="analytics" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <List className="h-3.5 w-3.5" />
              <span>Ventas</span>
            </TabsTrigger>
            <TabsTrigger value="productos" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              <span>Productos</span>
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Vendedores</span>
            </TabsTrigger>
            <TabsTrigger value="tiempo-real" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>Tiempo Real</span>
            </TabsTrigger>
            <TabsTrigger value="predicciones" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              <span>Predicciones</span>
            </TabsTrigger>
          </TabsList>
        </div>


        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsTab
            datos={datos}
            loading={loading}
            error={error}
            filtrosActuales={filtrosActuales}
            cargarAnalisis={cargarAnalisis}
            formatearMoneda={formatearMoneda}
            esTendenciasVentas={esTendenciasVentas}
            esEstadisticasGenerales={esEstadisticasGenerales}
            esAnalisisComparativo={esAnalisisComparativo}
          />
        </TabsContent>

        <TabsContent value="lista" className="space-y-6">
          <ListaVentasTab formatearMoneda={formatearMoneda} />
        </TabsContent>

        <TabsContent value="productos" className="space-y-6">
          <ProductosTab
            datos={datos}
            loading={loading}
            formatearMoneda={formatearMoneda}
          />
        </TabsContent>

        <TabsContent value="vendedores" className="space-y-6">
          <VendedoresTab
            datos={datos}
            loading={loading}
            formatearMoneda={formatearMoneda}
          />
        </TabsContent>

        <TabsContent value="tiempo-real" className="space-y-6">
          <TiempoRealTab
            formatearMoneda={formatearMoneda}
          />
        </TabsContent>

        <TabsContent value="predicciones" className="space-y-6">
          <PrediccionesTab
            datos={datos}
            loading={loading}
            filtrosActuales={filtrosActuales}
            cargarAnalisis={cargarAnalisis}
            formatearMoneda={formatearMoneda}
          />
        </TabsContent>
      </Tabs>

      {/* Footer con acciones rapidas */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {(loading || loadingMetas) ? 'Actualizando datos...' : 'Sistema activo • Datos actualizados'}
                </span>
              </div>
              {(error || errorMetas) && (
                <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Error en conexión</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={loading || loadingMetas}>
                {(loading || loadingMetas) ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileText className="mr-2 h-4 w-4" />
                Generar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de configuracion de metas */}
      <ConfiguracionMetasModal
        abierto={modalMetasAbierto}
        onClose={handleCerrarModal}
        metaEditar={metaParaEditar}
      />
      </div>
    </div>
  );
}