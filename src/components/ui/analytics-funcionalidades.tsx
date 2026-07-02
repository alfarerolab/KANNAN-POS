"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Package,
  Clock,
  RefreshCw,
  Download,
  Filter
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

interface EstadisticasFuncionalidades {
  funcionalidadesHabilitadas: {
    nombre: string;
    habilitada: boolean;
    usoUltimos30Dias: number;
    tendencia: "subiendo" | "bajando" | "estable";
  }[];
  usoGeneral: {
    totalOperaciones: number;
    operacionesHoy: number;
    crecimientoSemanal: number;
    eficienciaOperacional: number;
  };
  detallesPorFuncionalidad: {
    servicios: {
      totalServicios: number;
      serviciosActivos: number;
      ingresosMensuales: number;
      servicioMasPopular: string;
    };
    citas: {
      totalCitas: number;
      citasHoy: number;
      tasaAsistencia: number;
      promedioTiempoEspera: number;
    };
    productos: {
      totalProductos: number;
      conVariantes: number;
      conVencimiento: number;
      alertasStock: number;
    };
    usuarios: {
      totalUsuarios: number;
      activosUltimaSemana: number;
      rolesDistribucion: { rol: string; cantidad: number }[];
    };
  };
  rendimiento: {
    tiempoPromedioVenta: number;
    ventasPorHora: number;
    errorRate: number;
    disponibilidadSistema: number;
  };
}

const COLORES_GRAFICO = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AnalyticsFuncionalidades() {
  const { data: session } = useSession();
  const { configuracion, obtenerTema } = useConfiguracionEmpresa();
  const [estadisticas, setEstadisticas] = useState<EstadisticasFuncionalidades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [rangoFecha, setRangoFecha] = useState("30d");

  const tema = obtenerTema();

  useEffect(() => {
    cargarEstadisticas();
  }, [rangoFecha]);

  const cargarEstadisticas = async () => {
    try {
      setCargando(true);

      // Simular carga de datos (en producción vendría de la API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const datosSimulados: EstadisticasFuncionalidades = {
        funcionalidadesHabilitadas: [
          { nombre: "Servicios", habilitada: true, usoUltimos30Dias: 85, tendencia: "subiendo" },
          { nombre: "Citas", habilitada: true, usoUltimos30Dias: 72, tendencia: "estable" },
          { nombre: "Variantes", habilitada: false, usoUltimos30Dias: 0, tendencia: "estable" },
          { nombre: "Mascotas", habilitada: true, usoUltimos30Dias: 45, tendencia: "subiendo" },
          { nombre: "Vencimientos", habilitada: false, usoUltimos30Dias: 0, tendencia: "estable" },
          { nombre: "Lotes", habilitada: false, usoUltimos30Dias: 0, tendencia: "estable" },
        ],
        usoGeneral: {
          totalOperaciones: 15420,
          operacionesHoy: 47,
          crecimientoSemanal: 12.5,
          eficienciaOperacional: 87
        },
        detallesPorFuncionalidad: {
          servicios: {
            totalServicios: 12,
            serviciosActivos: 10,
            ingresosMensuales: 2350000,
            servicioMasPopular: "Corte y Peinado"
          },
          citas: {
            totalCitas: 234,
            citasHoy: 8,
            tasaAsistencia: 89,
            promedioTiempoEspera: 15
          },
          productos: {
            totalProductos: 456,
            conVariantes: 0,
            conVencimiento: 0,
            alertasStock: 12
          },
          usuarios: {
            totalUsuarios: 6,
            activosUltimaSemana: 5,
            rolesDistribucion: [
              { rol: "ADMINISTRADOR", cantidad: 1 },
              { rol: "GERENTE", cantidad: 2 },
              { rol: "EMPLEADO", cantidad: 3 }
            ]
          }
        },
        rendimiento: {
          tiempoPromedioVenta: 3.2,
          ventasPorHora: 8.5,
          errorRate: 2.1,
          disponibilidadSistema: 99.8
        }
      };

      setEstadisticas(datosSimulados);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setCargando(false);
    }
  };

  const obtenerIconoTendencia = (tendencia: string) => {
    switch (tendencia) {
      case "subiendo": return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "bajando": return <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const datosGraficoTendencia = [
    { dia: "Lun", operaciones: 45 },
    { dia: "Mar", operaciones: 52 },
    { dia: "Mié", operaciones: 48 },
    { dia: "Jue", operaciones: 61 },
    { dia: "Vie", operaciones: 55 },
    { dia: "Sáb", operaciones: 67 },
    { dia: "Dom", operaciones: 43 },
  ];

  if (cargando || !estadisticas) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics de Funcionalidades
          </h2>
          <p className="text-muted-foreground">
            Análisis detallado del uso y rendimiento de las funcionalidades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={rangoFecha}
            onChange={(e) => setRangoFecha(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted/50">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.usoGeneral.totalOperaciones.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Operaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.usoGeneral.operacionesHoy}</p>
                <p className="text-sm text-muted-foreground">Operaciones Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-2xl font-bold">+{estadisticas.usoGeneral.crecimientoSemanal}%</p>
                <p className="text-sm text-muted-foreground">Crecimiento Semanal</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{estadisticas.usoGeneral.eficienciaOperacional}%</p>
                <p className="text-sm text-muted-foreground">Eficiencia</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Analytics */}
      <Tabs defaultValue="funcionalidades">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>

        {/* Tab Funcionalidades */}
        <TabsContent value="funcionalidades">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estado de Funcionalidades */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Funcionalidades</CardTitle>
                <CardDescription>Uso y adopción de cada funcionalidad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {estadisticas.funcionalidadesHabilitadas.map((func, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{func.nombre}</span>
                          <Badge variant={func.habilitada ? "default" : "secondary"}>
                            {func.habilitada ? "Habilitado" : "Deshabilitado"}
                          </Badge>
                          {obtenerIconoTendencia(func.tendencia)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {func.usoUltimos30Dias}%
                        </span>
                      </div>
                      <Progress value={func.usoUltimos30Dias} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detalles por Funcionalidad */}
            <Card>
              <CardHeader>
                <CardTitle>Detalles de Servicios</CardTitle>
                <CardDescription>Estadísticas específicas de servicios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {estadisticas.detallesPorFuncionalidad.servicios.totalServicios}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Servicios</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        ${estadisticas.detallesPorFuncionalidad.servicios.ingresosMensuales.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Ingresos Mensuales</p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <p className="text-sm font-medium">Servicio Más Popular</p>
                    <p className="text-lg">{estadisticas.detallesPorFuncionalidad.servicios.servicioMasPopular}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Servicios Activos</span>
                      <span>{estadisticas.detallesPorFuncionalidad.servicios.serviciosActivos}/{estadisticas.detallesPorFuncionalidad.servicios.totalServicios}</span>
                    </div>
                    <Progress
                      value={(estadisticas.detallesPorFuncionalidad.servicios.serviciosActivos / estadisticas.detallesPorFuncionalidad.servicios.totalServicios) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Tendencias */}
        <TabsContent value="tendencias">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de Uso</CardTitle>
              <CardDescription>Evolución del uso de funcionalidades en el tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGraficoTendencia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="operaciones"
                      stroke={`var(--${tema.color}-500)`}
                      strokeWidth={2}
                      dot={{ fill: `var(--${tema.color}-500)` }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Rendimiento */}
        <TabsContent value="rendimiento">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Rendimiento</CardTitle>
                <CardDescription>Indicadores clave de performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Tiempo Promedio de Venta</span>
                    <span className="font-bold">{estadisticas.rendimiento.tiempoPromedioVenta}min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Ventas por Hora</span>
                    <span className="font-bold">{estadisticas.rendimiento.ventasPorHora}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tasa de Errores</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{estadisticas.rendimiento.errorRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Disponibilidad del Sistema</span>
                    <span className="font-bold text-green-600 dark:text-green-400">{estadisticas.rendimiento.disponibilidadSistema}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Roles</CardTitle>
                <CardDescription>Usuarios por tipo de rol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={estadisticas.detallesPorFuncionalidad.usuarios.rolesDistribucion}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cantidad"
                        nameKey="rol"
                      >
                        {estadisticas.detallesPorFuncionalidad.usuarios.rolesDistribucion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORES_GRAFICO[index % COLORES_GRAFICO.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Usuarios */}
        <TabsContent value="usuarios">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-3xl font-bold">{estadisticas.detallesPorFuncionalidad.usuarios.totalUsuarios}</p>
                  <p className="text-sm text-muted-foreground">Total Usuarios</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-green-600 dark:text-green-400" />
                  <p className="text-3xl font-bold">{estadisticas.detallesPorFuncionalidad.usuarios.activosUltimaSemana}</p>
                  <p className="text-sm text-muted-foreground">Activos (7 días)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-orange-600 dark:text-orange-400" />
                  <p className="text-3xl font-bold">{estadisticas.detallesPorFuncionalidad.citas.citasHoy}</p>
                  <p className="text-sm text-muted-foreground">Citas Hoy</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
