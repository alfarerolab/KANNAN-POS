"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Filter,
  Download,
  RefreshCw,
  CreditCard,
  Percent,
  BarChart,
  Activity,
  Target,
  Building,
  Mail,
  Calendar as CalendarIcon,
  Eye
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Area,
  AreaChart
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SuscripcionInfo {
  id: string;
  empresaId: string;
  nombre: string;
  email: string;
  tipoNegocio: string;
  fechaVencimiento: string;
  fechaInicio: string;
  activa: boolean;
  diasRestantes: number;
  estado: 'activa' | 'por_vencer' | 'vencida' | 'suspendida';
  ultimoPago: string;
  montoMensual: number;
  precioTotal: number;
  planNombre: string;
  planMeses: number;
  estadoSuscripcion: string;
  metodoPago: string;
  renovacionAutomatica: boolean;
  descuentoAplicado: number;
  createdAt?: string;
  updatedAt?: string;
}

interface EstadisticasSuscripciones {
  totalSuscripciones: number;
  suscripcionesActivas: number;
  porVencer: number;
  vencidas: number;
  ingresosMensuales: number;
  ingresosTotales: number;
  suscripcionesRecientes: number;
  ingresosMesActual: number;
  tasaCrecimiento: number;
}

interface DatosSuscripciones {
  suscripciones: SuscripcionInfo[];
  estadisticas: EstadisticasSuscripciones;
  estadisticasPorTipoNegocio: Record<string, { cantidad: number; ingresos: number }>;
  metadata: {
    moneda: string;
    timezone: string;
    ultimaActualizacion: string;
  };
}

// Función para formatear moneda colombiana
const formatearMoneda = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Función para formatear fechas en español
const formatearFecha = (fecha: string): string => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function SuscripcionesPage() {
  const router = useRouter();
  
  const [datos, setDatos] = useState<DatosSuscripciones>({
    suscripciones: [],
    estadisticas: {
      totalSuscripciones: 0,
      suscripcionesActivas: 0,
      porVencer: 0,
      vencidas: 0,
      ingresosMensuales: 0,
      ingresosTotales: 0,
      suscripcionesRecientes: 0,
      ingresosMesActual: 0,
      tasaCrecimiento: 0
    },
    estadisticasPorTipoNegocio: {},
    metadata: {
      moneda: 'COP',
      timezone: 'America/Bogota',
      ultimaActualizacion: new Date().toISOString()
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroTipoNegocio, setFiltroTipoNegocio] = useState<string>("todos");
  const [selectedSuscripcion, setSelectedSuscripcion] = useState<SuscripcionInfo | null>(null);
  const [renovarDialogOpen, setRenovarDialogOpen] = useState(false);
  const [mesesRenovacion, setMesesRenovacion] = useState(1);
  const [isRenovando, setIsRenovando] = useState(false);

  // Cargar datos de la API
  const cargarSuscripciones = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/administrador/suscripciones', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: DatosSuscripciones = await response.json();
      setDatos(data);
      
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al iniciar
  useEffect(() => {
    cargarSuscripciones();
  }, []);

  // Filtrar suscripciones
  const suscripcionesFiltradas = useMemo(() => {
    return datos.suscripciones.filter(s => {
      const matchesSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = filtroEstado === "todos" || s.estado === filtroEstado;
      const matchesTipoNegocio = filtroTipoNegocio === "todos" || s.tipoNegocio === filtroTipoNegocio;
      return matchesSearch && matchesEstado && matchesTipoNegocio;
    });
  }, [datos.suscripciones, searchTerm, filtroEstado, filtroTipoNegocio]);

  // Obtener tipos de negocio únicos
  const tiposNegocio = useMemo(() => 
    [...new Set(datos.suscripciones.map(s => s.tipoNegocio))], 
    [datos.suscripciones]
  );

  // Calcular métricas adicionales
  const metricas = useMemo(() => {
    const { estadisticas } = datos;
    const arr = estadisticas.ingresosMensuales * 12;
    const churnRate = estadisticas.totalSuscripciones > 0 
      ? Math.round((estadisticas.vencidas / estadisticas.totalSuscripciones) * 100 * 100) / 100 
      : 0;
    
    return {
      ...estadisticas,
      arr,
      churnRate,
      retencionRate: 100 - churnRate
    };
  }, [datos.estadisticas]);

  // Datos para gráficos
  const datosGraficoEstados = useMemo(() => [
    { name: 'Activas', value: metricas.suscripcionesActivas, color: '#16a34a' },
    { name: 'Por Vencer', value: metricas.porVencer, color: '#eab308' },
    { name: 'Vencidas', value: metricas.vencidas, color: '#dc2626' }
  ], [metricas]);

  const datosGraficoIngresos = useMemo(() => {
    return Object.entries(datos.estadisticasPorTipoNegocio).map(([tipo, datos]) => ({
      name: tipo,
      cantidad: datos.cantidad,
      ingresos: datos.ingresos
    }));
  }, [datos.estadisticasPorTipoNegocio]);

  // Renovar suscripción
  const renovarSuscripcion = async () => {
    if (!selectedSuscripcion) return;

    setIsRenovando(true);
    try {
      const response = await fetch(`/api/administrador/suscripciones/${selectedSuscripcion.id}/renovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meses: mesesRenovacion }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al renovar suscripción');
      }

      const resultado = await response.json();
      
      // Mostrar mensaje de éxito (reemplaza con tu sistema de toast)
      // Recargar datos
      await cargarSuscripciones();

    } catch (error) {
      console.error('Error al renovar:', error);
      setError(error instanceof Error ? error.message : 'Error al renovar suscripción');
    } finally {
      setIsRenovando(false);
      setRenovarDialogOpen(false);
      setSelectedSuscripcion(null);
      setMesesRenovacion(1);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const estilos = {
      activa: "bg-emerald-500/15 text-green-800 dark:text-green-300 border-green-500/40",
      por_vencer: "bg-amber-500/15 text-yellow-800 border-yellow-300",
      vencida: "bg-destructive/15 text-red-800 dark:text-red-300 border-destructive/40",
      suspendida: "bg-muted text-foreground border-border"
    };

    const textos = {
      activa: "Activa",
      por_vencer: "Por Vencer",
      vencida: "Vencida",
      suspendida: "Suspendida"
    };

    const claseEstilo = estilos[estado as keyof typeof estilos] || "bg-muted text-foreground border-border";
    const texto = textos[estado as keyof typeof textos] || estado;

    return (
      <Badge className={`${claseEstilo} border font-medium`}>
        {texto}
      </Badge>
    );
  };

  const exportarDatos = () => {
    const datosExportar = suscripcionesFiltradas.map(s => ({
      Empresa: s.nombre,
      Email: s.email,
      'Tipo de Negocio': s.tipoNegocio,
      Plan: s.planNombre,
      Estado: s.estado,
      'Fecha Inicio': formatearFecha(s.fechaInicio),
      'Fecha Vencimiento': formatearFecha(s.fechaVencimiento),
      'Días Restantes': s.diasRestantes,
      'Ingreso Mensual': s.montoMensual,
      'Precio Total': s.precioTotal,
      'Método Pago': s.metodoPago,
      'Renovación Automática': s.renovacionAutomatica ? 'Sí' : 'No',
      Activa: s.activa ? 'Sí' : 'No'
    }));

    const csv = [
      Object.keys(datosExportar[0] || {}).join(','),
      ...datosExportar.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suscripciones_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={cargarSuscripciones}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Panel de Suscripciones
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestión completa de suscripciones y análisis de ingresos
          </p>
          {datos.metadata.ultimaActualizacion && (
            <p className="text-xs text-muted-foreground mt-1">
              Última actualización: {formatearFecha(datos.metadata.ultimaActualizacion)} - 
              {new Date(datos.metadata.ultimaActualizacion).toLocaleTimeString('es-CO')}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarDatos} variant="outline" size="sm" disabled={suscripcionesFiltradas.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={cargarSuscripciones} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales (MRR)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatearMoneda(metricas.ingresosMensuales)}</div>
            <p className="text-xs text-muted-foreground">Ingresos recurrentes mensuales</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proyección Anual (ARR)</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatearMoneda(metricas.arr)}</div>
            <p className="text-xs text-muted-foreground">Ingresos anuales proyectados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metricas.suscripcionesActivas}</div>
            <p className="text-xs text-muted-foreground">de {metricas.totalSuscripciones} totales</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
            <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{metricas.retencionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Clientes retenidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Este Mes</CardTitle>
            <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{formatearMoneda(metricas.ingresosMesActual)}</div>
            <p className="text-xs text-muted-foreground">Ingresos del mes actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{metricas.porVencer}</div>
            <p className="text-xs text-muted-foreground">Próximas a vencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{metricas.vencidas}</div>
            <p className="text-xs text-muted-foreground">Requieren renovación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">+{metricas.tasaCrecimiento}%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Suscripciones</CardTitle>
            <CardDescription>Distribución actual por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosGraficoEstados}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
                    label={({ name, value, percent = 0 }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {datosGraficoEstados.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} suscripciones`, 'Cantidad']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Tipo de Negocio</CardTitle>
            <CardDescription>Ingresos mensuales por industria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={datosGraficoIngresos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'ingresos' ? formatearMoneda(Number(value)) : value,
                      name === 'ingresos' ? 'Ingresos' : 'Cantidad'
                    ]} 
                  />
                  <Bar dataKey="ingresos" fill="#3b82f6" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="busqueda">Buscar empresa</Label>
              <Input
                id="busqueda"
                placeholder="Nombre de empresa o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activa">Activas</SelectItem>
                  <SelectItem value="por_vencer">Por vencer</SelectItem>
                  <SelectItem value="vencida">Vencidas</SelectItem>
                  <SelectItem value="suspendida">Suspendidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de negocio</Label>
              <Select value={filtroTipoNegocio} onValueChange={setFiltroTipoNegocio}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {tiposNegocio.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de suscripciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Lista de Suscripciones
              </CardTitle>
              <CardDescription>
                Mostrando {suscripcionesFiltradas.length} de {datos.suscripciones.length} suscripciones
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-muted-foreground">Cargando suscripciones...</p>
            </div>
          ) : suscripcionesFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron suscripciones</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filtroEstado !== "todos" || filtroTipoNegocio !== "todos" 
                  ? "Intenta cambiar los filtros de búsqueda"
                  : "Aún no hay suscripciones registradas en el sistema"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Empresa</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Ingreso Mensual</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suscripcionesFiltradas.map((suscripcion) => (
                    <TableRow key={suscripcion.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500/15 rounded-full flex items-center justify-center">
                              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground dark:text-foreground truncate">
                              {suscripcion.nombre}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{suscripcion.email}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suscripcion.tipoNegocio}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs font-normal">
                            {suscripcion.planNombre}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {suscripcion.planMeses} {suscripcion.planMeses === 1 ? 'mes' : 'meses'}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getEstadoBadge(suscripcion.estado)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm flex items-center gap-1 font-medium">
                            <CalendarIcon className="h-3 w-3" />
                            {formatearFecha(suscripcion.fechaVencimiento)}
                          </div>
                          <div className={`text-xs font-medium px-2 py-1 rounded-full inline-block ${
                            suscripcion.diasRestantes < 0 
                              ? 'bg-destructive/15 text-red-800 dark:text-red-300' :
                            suscripcion.diasRestantes <= 7 
                              ? 'bg-destructive/15 text-red-800 dark:text-red-300' :
                            suscripcion.diasRestantes <= 15 
                              ? 'bg-amber-500/15 text-yellow-800' :
                              'bg-emerald-500/15 text-green-800 dark:text-green-300'
                          }`}>
                            {suscripcion.diasRestantes < 0
                              ? `Vencida hace ${Math.abs(suscripcion.diasRestantes)} días`
                              : suscripcion.diasRestantes === 0
                              ? 'Vence hoy'
                              : suscripcion.diasRestantes === 1
                              ? 'Vence mañana'
                              : `${suscripcion.diasRestantes} días restantes`
                            }
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <div className="font-semibold text-green-600 dark:text-green-400 text-base">
                            {formatearMoneda(suscripcion.montoMensual)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total: {formatearMoneda(suscripcion.precioTotal)}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSuscripcion(suscripcion);
                            setRenovarDialogOpen(true);
                          }}
                          className="text-xs hover:bg-blue-500/10 hover:border-blue-500/40"
                          disabled={suscripcion.estado === 'activa' && suscripcion.diasRestantes > 30}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Renovar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen por tipo de negocio */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Tipo de Negocio</CardTitle>
          <CardDescription>Análisis detallado de suscripciones por industria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(datos.estadisticasPorTipoNegocio).map(([tipo, estadisticas]) => (
              <div key={tipo} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground dark:text-foreground">{tipo}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {estadisticas.cantidad} activas
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ingresos totales:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatearMoneda(estadisticas.ingresos)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Promedio por cliente:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {formatearMoneda(estadisticas.cantidad > 0 ? estadisticas.ingresos / estadisticas.cantidad : 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de renovación */}
      <Dialog open={renovarDialogOpen} onOpenChange={setRenovarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Renovar Suscripción
            </DialogTitle>
            <DialogDescription>
              Configura la renovación para <strong>{selectedSuscripcion?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información actual */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Información Actual</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Plan:</p>
                  <p className="font-medium">{selectedSuscripcion?.planNombre}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado:</p>
                  {selectedSuscripcion && getEstadoBadge(selectedSuscripcion.estado)}
                </div>
                <div>
                  <p className="text-muted-foreground">Vence:</p>
                  <p className="font-medium">
                    {selectedSuscripcion ? formatearFecha(selectedSuscripcion.fechaVencimiento) : ''}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Días restantes:</p>
                  <p className={`font-medium ${
                    selectedSuscripcion && selectedSuscripcion.diasRestantes < 0 ? 'text-red-600 dark:text-red-400' :
                    selectedSuscripcion && selectedSuscripcion.diasRestantes <= 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {selectedSuscripcion && selectedSuscripcion.diasRestantes < 0 
                      ? `${Math.abs(selectedSuscripcion.diasRestantes)} días vencida`
                      : `${selectedSuscripcion?.diasRestantes || 0} días`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Selección de período */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="meses" className="text-base font-medium">
                  Período de Renovación
                </Label>
                <p className="text-sm text-muted-foreground">
                  Selecciona el tiempo de extensión de la suscripción
                </p>
              </div>
              
              <Select
                value={mesesRenovacion.toString()}
                onValueChange={(value) => setMesesRenovacion(Number.parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mes</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="text-xs text-muted-foreground bg-blue-500/10 p-3 rounded border border-blue-500/30">
                <p className="font-medium text-blue-900 mb-1">Información importante:</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                  <li>• La nueva fecha se calculará desde la fecha actual o vencimiento existente</li>
                  <li>• La suscripción se reactivará automáticamente si estaba suspendida</li>
                  <li>• Se registrará un log de auditoría de esta renovación</li>
                </ul>
              </div>
            </div>

            {/* Preview de nueva fecha */}
            {selectedSuscripcion && (
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>Nueva fecha de vencimiento:</strong> {
                    (() => {
                      const fechaBase = new Date(selectedSuscripcion.fechaVencimiento) > new Date()
                        ? new Date(selectedSuscripcion.fechaVencimiento)
                        : new Date();
                      const nuevaFecha = new Date(fechaBase);
                      nuevaFecha.setMonth(nuevaFecha.getMonth() + mesesRenovacion);
                      return formatearFecha(nuevaFecha.toISOString());
                    })()
                  }
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setRenovarDialogOpen(false);
                setSelectedSuscripcion(null);
                setMesesRenovacion(1);
              }}
              className="flex-1"
              disabled={isRenovando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={renovarSuscripcion} 
              className="bg-blue-600 hover:bg-blue-700 flex-1"
              disabled={isRenovando}
            >
              {isRenovando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Renovando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renovar por {mesesRenovacion} {mesesRenovacion === 1 ? 'mes' : 'meses'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}