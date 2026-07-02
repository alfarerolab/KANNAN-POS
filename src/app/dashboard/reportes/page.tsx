"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, Download, Filter, Loader2, BarChart3, TrendingUp, Users, Package, DollarSign } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { servicioUsuarios, servicioClientes, servicioReportes } from "@/lib/api-service";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useSession } from "next-auth/react";

// Componentes divididos
import { MetricasPrincipales } from "@/components/reportes/MetricasPrincipales";
import { FiltrosReporte } from "@/components/reportes/FiltrosReporte";
import { VentasPorFecha } from "@/components/reportes/VentasPorFecha";
import { ProductosYServiciosTop } from "@/components/reportes/ProductosYServiciosTop";
import { VentasPorUsuario } from "@/components/reportes/VentasPorUsuario";
import { VentasPorCliente } from "@/components/reportes/VentasPorCliente";
import { ReportesAvanzados } from "@/components/reportes/ReportesAvanzados";
import { CuentasPorCobrar } from "@/components/reportes/CuentasPorCobrar";
import { InventarioPorPeriodo } from "@/components/reportes/InventarioPorPeriodo";

interface ReporteGeneral {
  totalVentas: number;
  totalIngresos: number;
  totalProductosVendidos: number;
  ventaPromedio: number;
}

interface VentaPorUsuario {
  usuarioId: string;
  nombre: string;
  email: string;
  cantidadVentas: number;
  totalVentas: number;
  promedioVenta: number;
}

interface VentaPorCliente {
  clienteId: string;
  nombre: string;
  email: string;
  telefono: string;
  cantidadVentas: number;
  totalVentas: number;
  promedioVenta: number;
  ultimaCompra: string | null;
}

interface ProductoVendido {
  id: string;
  nombre: string;
  cantidad: number;
  monto: number;
  tipo?: string; // 'PRODUCTO' | 'SERVICIO'
}

interface ReporteVentas {
  resumen: {
    totalVentas: number;
    montoTotal: number;
    promedioPorVenta: number;
  };
  ventasPorDia: Array<{
    fecha: string;
    cantidad: number;
    monto: number;
  }>;
  productosMasVendidosPorCantidad: ProductoVendido[];
  productosMasVendidosPorMonto: ProductoVendido[];
  ventas: any[];
}

export default function ReportesPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const [cargando, setCargando] = useState(false);
  const [reporteVentas, setReporteVentas] = useState<ReporteVentas | null>(null);
  const [ventasPorUsuario, setVentasPorUsuario] = useState<VentaPorUsuario[]>([]);
  const [ventasPorCliente, setVentasPorCliente] = useState<VentaPorCliente[]>([]);
  const [reporteProductos, setReporteProductos] = useState<any>(null);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroMetodoPago, setFiltroMetodoPago] = useState("todos");


  // Estado para saber si el negocio tiene servicios
  const [tieneServicios, setTieneServicios] = useState(false);

  const [fechaInicio, setFechaInicio] = useState<Date | undefined>(undefined);
  const [fechaFin, setFechaFin] = useState<Date | undefined>(undefined);
  const [tabActiva, setTabActiva] = useState("ventas-por-fecha");
  const [reporteGeneral, setReporteGeneral] = useState<ReporteGeneral>({
    totalVentas: 0,
    totalIngresos: 0,
    totalProductosVendidos: 0,
    ventaPromedio: 0,
  });

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        await Promise.all([
          cargarReporteVentas(),
          cargarUsuariosYClientes(),
        ]);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de reportes",
          variant: "destructive",
        });
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [toast]);

  // Cargar reportes cuando cambien los filtros
  useEffect(() => {
    if (tabActiva === "ventas-por-fecha") {
      cargarReporteVentas();
    } else if (tabActiva === "productos-servicios-top") {
      cargarReporteProductos();
    } else if (tabActiva === "ventas-por-usuario") {
      cargarReporteVentasPorUsuario();
    } else if (tabActiva === "ventas-por-cliente") {
      cargarReporteVentasPorCliente();
    } else if (tabActiva === "cuentas-por-cobrar") {
      cargarCuentasPorCobrar();
    }
  }, [
    tabActiva,
    fechaInicio,
    fechaFin,
    filtroUsuario,
    filtroCliente,
    filtroEstado,
    filtroMetodoPago,
  ]);

  const cargarUsuariosYClientes = async () => {
    try {
      const [respuestaUsuarios, respuestaClientes] = await Promise.all([
        servicioUsuarios.obtenerUsuarios({ limite: 100 }),
        servicioClientes.obtenerClientes({ limite: 100 })
      ]);

      setUsuarios(respuestaUsuarios.datos || []);
      setClientes(respuestaClientes.datos || []);
    } catch (error) {
      console.error("Error al cargar usuarios y clientes:", error);
    }
  };

  const cargarReporteVentas = async () => {
    try {
      setCargando(true);

      const filtros = {
        fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : undefined,
        fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : undefined,
        // Solo enviar filtros si tienen valores válidos (no vacíos y no "todos")
        clienteId: filtroCliente && filtroCliente !== "" && filtroCliente !== "todos" ? filtroCliente : undefined,
        usuarioId: filtroUsuario && filtroUsuario !== "" && filtroUsuario !== "todos" ? filtroUsuario : undefined,
      };

      const respuesta = await servicioReportes.obtenerReporteVentas(filtros);
      setReporteVentas(respuesta);

      if (respuesta) {
        // Detectar si hay servicios en los datos
        const hayServicios = respuesta.productosMasVendidosPorCantidad.some((item: ProductoVendido) => {
          const esServicioPorTipo = item.tipo === 'SERVICIO' || item.tipo === 'servicio' || item.tipo === 'Servicio';
          const esServicioPorNombre = (!item.tipo || item.tipo === '' || item.tipo === 'undefined') &&
                                      item.nombre && item.nombre.toLowerCase().startsWith('servicio:');
          return esServicioPorTipo || esServicioPorNombre;
        });
        setTieneServicios(hayServicios);

        const totalProductosVendidos = respuesta.productosMasVendidosPorCantidad
          .reduce((sum: number, p: ProductoVendido) => sum + p.cantidad, 0);

        setReporteGeneral({
          totalVentas: respuesta.resumen.totalVentas,
          totalIngresos: respuesta.resumen.montoTotal,
          totalProductosVendidos,
          ventaPromedio: respuesta.resumen.promedioPorVenta,
        });
      }
    } catch (error) {
      console.error("Error al cargar reporte de ventas:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de ventas",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarReporteProductos = async () => {
    try {
      setCargando(true);
      const respuesta = await servicioReportes.obtenerReporteProductos();
      setReporteProductos(respuesta);
    } catch (error) {
      console.error("Error al cargar reporte de productos:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de productos",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarReporteVentasPorUsuario = async () => {
    try {
      setCargando(true);
      const filtros = {
        fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : undefined,
        fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : undefined,
      };

      const respuesta = await servicioReportes.obtenerReporteVentasPorUsuario(filtros);
      setVentasPorUsuario(respuesta.datos || []);
    } catch (error) {
      console.error("Error al cargar reporte de ventas por usuario:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de ventas por usuario",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarReporteVentasPorCliente = async () => {
    try {
      setCargando(true);
      const filtros = {
        fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : undefined,
        fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : undefined,
      };

      const respuesta = await servicioReportes.obtenerReporteVentasPorCliente(filtros);
      setVentasPorCliente(respuesta.datos || []);
    } catch (error) {
      console.error("Error al cargar reporte de ventas por cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de ventas por cliente",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarCuentasPorCobrar = async () => {
    try {
      setCargando(true);
      const filtros = {
        fechaInicio: fechaInicio ? format(fechaInicio, "yyyy-MM-dd") : undefined,
        fechaFin: fechaFin ? format(fechaFin, "yyyy-MM-dd") : undefined,
        clienteId: filtroCliente && filtroCliente !== "todos" ? filtroCliente : undefined,
      };

      const respuesta = await servicioReportes.obtenerCuentasPorCobrar(filtros);
      setCuentasPorCobrar(respuesta);
    } catch (error) {
      console.error("Error al cargar cuentas por cobrar:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte de cuentas por cobrar",
        variant: "destructive",
      });
    } finally {
      setCargando(false);
    }
  };

  const exportarCSV = () => {
  try {
    if (tabActiva === "inventario-periodo" || tabActiva === "reportes-avanzados") {
      toast({
        title: "No disponible",
        description: "La exportación CSV no está disponible para este reporte",
        variant: "destructive",
      });
      return;
    }

    let filas: string[][] = [];
    let nombreArchivo = "";

    if (tabActiva === "ventas-por-fecha") {
      nombreArchivo = "ventas-por-fecha";
      filas = [
        ["Fecha", "Cantidad de Ventas", "Monto Total"],
        ...(reporteVentas?.ventasPorDia || []).map((d) => [
          d.fecha,
          String(d.cantidad),
          String(d.monto),
        ]),
      ];
    } else if (tabActiva === "productos-servicios-top") {
      nombreArchivo = "productos-top";
      filas = [
        ["Producto", "Cantidad Vendida", "Monto Total"],
        ...(reporteVentas?.productosMasVendidosPorCantidad || []).map((p) => [
          p.nombre,
          String(p.cantidad),
          String(p.monto),
        ]),
      ];
    } else if (tabActiva === "ventas-por-usuario") {
      nombreArchivo = "ventas-por-usuario";
      filas = [
        ["Usuario", "Email", "Cantidad Ventas", "Total Ventas", "Promedio"],
        ...ventasPorUsuario.map((u) => [
          u.nombre,
          u.email,
          String(u.cantidadVentas),
          String(u.totalVentas),
          String(u.promedioVenta),
        ]),
      ];
    } else if (tabActiva === "ventas-por-cliente") {
      nombreArchivo = "ventas-por-cliente";
      filas = [
        ["Cliente", "Email", "Teléfono", "Cantidad Ventas", "Total Ventas", "Última Compra"],
        ...ventasPorCliente.map((c) => [
          c.nombre,
          c.email,
          c.telefono,
          String(c.cantidadVentas),
          String(c.totalVentas),
          c.ultimaCompra || "",
        ]),
      ];
    } else if (tabActiva === "cuentas-por-cobrar") {
      nombreArchivo = "cuentas-por-cobrar";
      filas = [
        ["Cliente", "Total Deuda", "Cantidad Ventas"],
        ...(cuentasPorCobrar?.cuentas || []).map((c: any) => [
          c.clienteNombre || c.nombre || "",
          String(c.totalDeuda ?? c.monto ?? 0),
          String(c.cantidadVentas ?? 0),
        ]),
      ];
    }

    if (filas.length <= 1) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar en este reporte",
        variant: "destructive",
      });
      return;
    }

    // Construir CSV con BOM para que Excel abra bien los caracteres especiales
    const bom = "\uFEFF";
    const csv = bom + filas.map((fila) =>
      fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${nombreArchivo}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportación completada",
      description: "Se ha descargado el archivo CSV",
    });
  } catch (error) {
    console.error("Error al exportar CSV:", error);
    toast({
      title: "Error",
      description: "No se pudo exportar el reporte",
      variant: "destructive",
    });
  }
};

  if (cargando && !reporteVentas) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-w-7xl mx-auto -m-4 sm:-m-6 lg:-m-8">
      {/* Banner header */}
      <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-5 border-b border-border/60">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40 rounded-t-2xl" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Reportes</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Analiza el rendimiento de ventas y obtén insights de tu negocio
            </p>
          </div>
          <Button
            onClick={exportarCSV}
            disabled={cargando}
            className="flex items-center gap-2 px-6 h-11 shadow-sm bg-primary hover:bg-primary/90 transition-all duration-200 self-start sm:self-auto"
          >
            {cargando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Métricas Principales */}
        <MetricasPrincipales
          reporteGeneral={reporteGeneral}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          productosDetallados={reporteVentas?.productosMasVendidosPorCantidad || []}
          mostrarServicios={tieneServicios}
        />

        {/* Filtros */}
        <FiltrosReporte
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          setFechaInicio={setFechaInicio}
          setFechaFin={setFechaFin}
          filtroUsuario={filtroUsuario}
          setFiltroUsuario={setFiltroUsuario}
          filtroCliente={filtroCliente}
          setFiltroCliente={setFiltroCliente}
          usuarios={usuarios}
          clientes={clientes}
        />

        {/* Tabs de Reportes */}
        <div className="bg-card border-none shadow-none mt-4">
          <Tabs
            defaultValue="ventas-por-fecha"
            value={tabActiva}
            onValueChange={setTabActiva}
            className="w-full"
          >
            <div className="w-full overflow-x-auto pb-2 scrollbar-none">
              <TabsList className="flex w-max min-w-full h-auto bg-muted/50 gap-1 p-1 rounded-xl">
                <TabsTrigger value="ventas-por-fecha" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Ventas por Fecha
                </TabsTrigger>
                <TabsTrigger value="productos-servicios-top" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  {tieneServicios ? 'Productos y Servicios Top' : 'Productos Top'}
                </TabsTrigger>
                <TabsTrigger value="ventas-por-usuario" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Ventas por Usuario
                </TabsTrigger>
                <TabsTrigger value="ventas-por-cliente" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Ventas por Cliente
                </TabsTrigger>
                <TabsTrigger value="cuentas-por-cobrar" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Cuentas por Cobrar
                </TabsTrigger>
                <TabsTrigger value="inventario-periodo" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Inventario por Período
                </TabsTrigger>
                <TabsTrigger value="reportes-avanzados" className="flex-1 text-xs sm:text-sm h-auto py-2 px-4 whitespace-nowrap rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background transition-all flex items-center justify-center">
                  Reportes Avanzados
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="pt-6">
              <TabsContent value="ventas-por-fecha" className="mt-0">
                <VentasPorFecha
                  reporteVentas={reporteVentas}
                  cargando={cargando}
                />
              </TabsContent>

              <TabsContent value="productos-servicios-top" className="mt-0">
                <ProductosYServiciosTop
                  reporteVentas={reporteVentas}
                  cargando={cargando}
                />
              </TabsContent>

              <TabsContent value="ventas-por-usuario" className="mt-0">
                <VentasPorUsuario
                  ventasPorUsuario={ventasPorUsuario}
                  cargando={cargando}
                />
              </TabsContent>

              <TabsContent value="ventas-por-cliente" className="mt-0">
                <VentasPorCliente
                  ventasPorCliente={ventasPorCliente}
                  cargando={cargando}
                />
              </TabsContent>

              <TabsContent value="cuentas-por-cobrar" className="mt-0">
                <CuentasPorCobrar
                  cuentas={cuentasPorCobrar?.cuentas || []}
                  resumen={cuentasPorCobrar?.resumen || { totalDeudaGeneral: 0, totalClientesConDeuda: 0, totalVentasFiadas: 0 }}
                  cargando={cargando}
                />
              </TabsContent>

               <TabsContent value="inventario-periodo" className="mt-0">
                <InventarioPorPeriodo
                  fechaInicio={fechaInicio}
                  fechaFin={fechaFin}
                />
              </TabsContent>

              <TabsContent value="reportes-avanzados" className="mt-0">
                {session?.user?.empresaId ? (
                  <ReportesAvanzados empresaId={session.user.empresaId} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">Configuración requerida</h3>
                    <p className="text-sm text-muted-foreground">
                      No se pudo cargar la configuración de la empresa
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Información adicional */}
        {!cargando && (reporteVentas || ventasPorUsuario.length > 0 || ventasPorCliente.length > 0) && (
          <Card className="bg-blue-500/10/50 border-blue-500/30/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    Información de los datos
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Los reportes se actualizan en tiempo real según los filtros seleccionados.
                    Utiliza el botón "Exportar CSV" para descargar los datos mostrados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
