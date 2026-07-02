"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import {
  TrendingUp,
  Users,
  Building,
  Activity,
  Calendar,
  DollarSign,
  Target,
  Clock
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAutorizacion } from "@/hooks/use-autorizacion";

// Interfaz actualizada según lo que devuelve el API
interface AnalyticsResponse {
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  metricas: {
    empresas: {
      distribucionTipos: Record<string, { total: number; activas: number; inactivas: number }>;
      crecimientoPorMes: Record<string, number>;
      topEmpresas: Array<{
        id: string;
        nombre: string;
        tipoNegocio: string;
        _count: {
          ventas: number;
          productos: number;
          usuarios: number;
        };
      }>;
      retencion: number;
    };
    usuarios: {
      estadisticas: Array<{
        rol: string;
        activo: boolean;
        _count: { id: number };
      }>;
      creados: number;
    };
    actividad: {
      ventas: number;
      productos: number;
      usuarios: number;
    };
    funcionalidades: Record<string, { habilitadas: number; total: number }>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function AnalyticsPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { esSuperAdmin } = useAutorizacion();

  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState("30d");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuthorization = () => {
      if (!session) {
        setIsAuthorized(null);
        return;
      }

      if (session.user.role !== "SUPERADMIN" || !esSuperAdmin) {
        setIsAuthorized(false);
        router.push("/dashboard");
        return;
      }

      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [session, esSuperAdmin, router]);

  useEffect(() => {
    if (isAuthorized !== true) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/administrador/analytics?periodo=${periodo}`);
        if (!response.ok) throw new Error("Error al cargar analytics");

        const data: AnalyticsResponse = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los analytics",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthorized, periodo, toast]);

  const exportarReporte = async () => {
    try {
      // Ajusta esta ruta según donde esté ubicado tu archivo route.ts para export
      const response = await fetch(`/api/administrador/analytics/exportar?periodo=${periodo}`);
      if (!response.ok) {
        console.error('Response status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error("Error al exportar reporte");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${periodo}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte exportado",
        description: "El reporte se ha descargado exitosamente",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
  };

  // Procesar datos para los gráficos
  const getEmpresasPorTipo = () => {
    if (!analytics?.metricas.empresas.distribucionTipos) return [];
    
    return Object.entries(analytics.metricas.empresas.distribucionTipos).map(([tipo, datos]) => ({
      tipo,
      total: datos.total,
      activas: datos.activas,
      inactivas: datos.inactivas,
    }));
  };

  const getCrecimientoTemporal = () => {
    if (!analytics?.metricas.empresas.crecimientoPorMes) return [];
    
    return Object.entries(analytics.metricas.empresas.crecimientoPorMes).map(([mes, cantidad]) => ({
      mes,
      empresasNuevas: cantidad,
      empresasActivas: cantidad, // Simplificado, podrías necesitar más lógica aquí
    }));
  };

  const getFuncionalidadesMasUsadas = () => {
    if (!analytics?.metricas.funcionalidades) return [];
    
    return Object.entries(analytics.metricas.funcionalidades).map(([funcionalidad, datos]) => ({
      funcionalidad,
      usos: datos.habilitadas,
      empresas: datos.total,
      porcentaje: datos.total > 0 ? (datos.habilitadas / datos.total) * 100 : 0,
    }));
  };

  const getTotalEmpresas = () => {
    const distribucion = analytics?.metricas.empresas.distribucionTipos;
    if (!distribucion) return 0;
    
    return Object.values(distribucion).reduce((sum, datos) => sum + datos.total, 0);
  };

  const getEmpresasActivas = () => {
    const distribucion = analytics?.metricas.empresas.distribucionTipos;
    if (!distribucion) return 0;
    
    return Object.values(distribucion).reduce((sum, datos) => sum + datos.activas, 0);
  };

  const getTotalUsuarios = () => {
    const usuariosStats = analytics?.metricas.usuarios.estadisticas;
    if (!usuariosStats) return 0;
    
    return usuariosStats.reduce((sum, stat) => sum + stat._count.id, 0);
  };

  if (isAuthorized === null || (isAuthorized && isLoading)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return null;
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>No se pudieron cargar los datos de analytics</p>
      </div>
    );
  }

  const empresasPorTipo = getEmpresasPorTipo();
  const crecimientoTemporal = getCrecimientoTemporal();
  const funcionalidadesMasUsadas = getFuncionalidadesMasUsadas();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics del Sistema</h1>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportarReporte}>
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Total Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalEmpresas()}</div>
            <p className="text-xs text-muted-foreground">
              {getEmpresasActivas()} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Usuarios Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalUsuarios()}</div>
            <p className="text-xs text-green-600 dark:text-green-400">
              +{analytics.metricas.usuarios.creados} este período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Ventas del Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metricas.actividad.ventas}</div>
            <p className="text-xs text-muted-foreground">
              Total del sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Retención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.metricas.empresas.retencion}%</div>
            <p className="text-xs text-muted-foreground">
              Empresas activas 6m+
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Vista General</TabsTrigger>
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Empresas por Tipo de Negocio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={empresasPorTipo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ tipo, total }) => `${tipo}: ${total}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                    >
                      {empresasPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crecimiento Temporal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={crecimientoTemporal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="empresasNuevas"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Nuevas Empresas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="empresas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Tipo de Negocio</CardTitle>
              <CardDescription>
                Empresas registradas y activas por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={empresasPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#8884d8" name="Total" />
                  <Bar dataKey="activas" fill="#82ca9d" name="Activas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Empresas por Actividad</CardTitle>
              <CardDescription>
                Empresas con mayor número de ventas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.metricas.empresas.topEmpresas.slice(0, 5).map((empresa, index) => (
                  <div key={empresa.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{empresa.nombre}</p>
                      <p className="text-sm text-muted-foreground">{empresa.tipoNegocio}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{empresa._count.ventas} ventas</p>
                      <p className="text-sm text-muted-foreground">
                        {empresa._count.productos} productos, {empresa._count.usuarios} usuarios
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funcionalidades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades Más Utilizadas</CardTitle>
              <CardDescription>
                Porcentaje de empresas que tienen habilitada cada funcionalidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={funcionalidadesMasUsadas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="funcionalidad" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === "porcentaje" ? `${typeof value === 'number' ? value.toFixed(1) : value}%` : value,
                    name === "porcentaje" ? "Adopción" : name
                  ]} />
                  <Bar dataKey="porcentaje" fill="#8884d8" name="porcentaje" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tendencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad del Sistema</CardTitle>
              <CardDescription>
                Métricas generales de actividad en el período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {analytics.metricas.actividad.ventas}
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">Ventas Realizadas</p>
                </div>
                <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analytics.metricas.actividad.productos}
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-300">Productos Creados</p>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {analytics.metricas.actividad.usuarios}
                  </div>
                  <p className="text-sm text-purple-800">Usuarios Registrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}