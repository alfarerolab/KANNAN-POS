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
          description: "La exportación a Excel no está disponible para este reporte",
          variant: "destructive",
        });
        return;
      }

      let nombreArchivo = "";
      let sheetName = "";
      let xmlColumns = "";
      let xmlHeaders = "";
      let xmlDataRows = "";

      // Definición de Estilos Excel XML
      const xmlHeader = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:CharSet="0" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1B5E20"/>
  </Style>
  <Style ss:ID="Subtitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#555555"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#388E3C" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="Currency">
   <NumberFormat ss:Format="$#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0E0E0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRow">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B5E20" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCurrency">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1B5E20" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="$#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1B5E20"/>
   </Borders>
  </Style>
 </Styles>
`;

      if (tabActiva === "ventas-por-fecha") {
        nombreArchivo = "ventas-por-fecha";
        sheetName = "Ventas por Fecha";
        xmlColumns = `   <Column ss:Width="120"/>\n   <Column ss:Width="100"/>\n   <Column ss:Width="150"/>\n`;
        xmlHeaders = `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cant. Ventas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Monto Total</Data></Cell>
   </Row>\n`;

        let sumVentas = 0;
        let sumMonto = 0;
        const items = reporteVentas?.ventasPorDia || [];
        if (!items.length) {
          toast({ title: "Sin datos", description: "No hay datos para exportar", variant: "destructive" });
          return;
        }

        items.forEach((d) => {
          xmlDataRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${d.fecha}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${d.cantidad}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${d.monto}</Data></Cell>
   </Row>\n`;
          sumVentas += d.cantidad;
          sumMonto += d.monto;
        });

        // Fila Total
        xmlDataRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${sumVentas}</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumMonto}</Data></Cell>
   </Row>\n`;

      } else if (tabActiva === "productos-servicios-top") {
        nombreArchivo = "productos-top";
        sheetName = "Top Productos";
        xmlColumns = `   <Column ss:Width="250"/>\n   <Column ss:Width="100"/>\n   <Column ss:Width="150"/>\n`;
        xmlHeaders = `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Producto / Servicio</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cant. Vendida</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Monto Total</Data></Cell>
   </Row>\n`;

        let sumCant = 0;
        let sumMonto = 0;
        const items = reporteVentas?.productosMasVendidosPorCantidad || [];
        if (!items.length) {
          toast({ title: "Sin datos", description: "No hay datos para exportar", variant: "destructive" });
          return;
        }

        items.forEach((p) => {
          xmlDataRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${p.nombre}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${p.cantidad}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${p.monto}</Data></Cell>
   </Row>\n`;
          sumCant += p.cantidad;
          sumMonto += p.monto;
        });

        // Fila Total
        xmlDataRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${sumCant}</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumMonto}</Data></Cell>
   </Row>\n`;

      } else if (tabActiva === "ventas-por-usuario") {
        nombreArchivo = "ventas-por-usuario";
        sheetName = "Ventas por Vendedor";
        xmlColumns = `   <Column ss:Width="180"/>\n   <Column ss:Width="180"/>\n   <Column ss:Width="100"/>\n   <Column ss:Width="150"/>\n   <Column ss:Width="120"/>\n`;
        xmlHeaders = `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Usuario / Trabajadora</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cant. Ventas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Ventas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Ticket Promedio</Data></Cell>
   </Row>\n`;

        let sumVentas = 0;
        let sumMonto = 0;
        if (!ventasPorUsuario.length) {
          toast({ title: "Sin datos", description: "No hay datos para exportar", variant: "destructive" });
          return;
        }

        ventasPorUsuario.forEach((u) => {
          xmlDataRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${u.nombre}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${u.email || "-"}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${u.cantidadVentas}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${u.totalVentas}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${u.promedioVenta}</Data></Cell>
   </Row>\n`;
          sumVentas += u.cantidadVentas;
          sumMonto += u.totalVentas;
        });

        // Fila Total
        xmlDataRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL GENERAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${sumVentas}</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumMonto}</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumVentas > 0 ? Math.round(sumMonto / sumVentas) : 0}</Data></Cell>
   </Row>\n`;

      } else if (tabActiva === "ventas-por-cliente") {
        nombreArchivo = "ventas-por-cliente";
        sheetName = "Ventas por Cliente";
        xmlColumns = `   <Column ss:Width="180"/>\n   <Column ss:Width="180"/>\n   <Column ss:Width="100"/>\n   <Column ss:Width="100"/>\n   <Column ss:Width="150"/>\n   <Column ss:Width="120"/>\n`;
        xmlHeaders = `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cliente</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Teléfono</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cant. Ventas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Compras</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Última Compra</Data></Cell>
   </Row>\n`;

        let sumVentas = 0;
        let sumMonto = 0;
        if (!ventasPorCliente.length) {
          toast({ title: "Sin datos", description: "No hay datos para exportar", variant: "destructive" });
          return;
        }

        ventasPorCliente.forEach((c) => {
          xmlDataRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${c.nombre}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${c.email || "-"}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${c.telefono || "-"}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${c.cantidadVentas}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${c.totalVentas}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${c.ultimaCompra || "-"}</Data></Cell>
   </Row>\n`;
          sumVentas += c.cantidadVentas;
          sumMonto += c.totalVentas;
        });

        // Fila Total
        xmlDataRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL GENERAL</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${sumVentas}</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumMonto}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
   </Row>\n`;

      } else if (tabActiva === "cuentas-por-cobrar") {
        nombreArchivo = "cuentas-por-cobrar";
        sheetName = "Cuentas por Cobrar";
        xmlColumns = `   <Column ss:Width="200"/>\n   <Column ss:Width="150"/>\n   <Column ss:Width="100"/>\n`;
        xmlHeaders = `   <Row ss:Height="22">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cliente</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Deuda</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Cant. Ventas</Data></Cell>
   </Row>\n`;

        let sumDeuda = 0;
        let sumVentas = 0;
        const items = cuentasPorCobrar?.cuentas || [];
        if (!items.length) {
          toast({ title: "Sin datos", description: "No hay datos para exportar", variant: "destructive" });
          return;
        }

        items.forEach((c: any) => {
          const totalDeudaVal = c.totalDeuda ?? c.monto ?? 0;
          xmlDataRows += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${c.clienteNombre || c.nombre || "Cliente Sin Nombre"}</Data></Cell>
    <Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalDeudaVal}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${c.cantidadVentas ?? 0}</Data></Cell>
   </Row>\n`;
          sumDeuda += totalDeudaVal;
          sumVentas += (c.cantidadVentas ?? 0);
        });

        // Fila Total
        xmlDataRows += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL DEUDA</Data></Cell>
    <Cell ss:StyleID="TotalCurrency"><Data ss:Type="Number">${sumDeuda}</Data></Cell>
    <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${sumVentas}</Data></Cell>
   </Row>\n`;
      }

      // Encabezados descriptivos superiores
      let xmlTitleRows = "";
      xmlTitleRows += `   <Row ss:Height="24">
    <Cell ss:StyleID="Title"><Data ss:Type="String">REPORTE DE ${sheetName.toUpperCase()}</Data></Cell>
   </Row>\n`;
      xmlTitleRows += `   <Row ss:Height="18">
    <Cell ss:StyleID="Subtitle"><Data ss:Type="String">Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}</Data></Cell>
   </Row>\n`;
      xmlTitleRows += `   <Row><Cell></Cell></Row>\n`;

      const xmlFooter = `  </Table>
 </Worksheet>
</Workbook>`;

      const completeXml = xmlHeader + ` <Worksheet ss:Name="${sheetName}">\n  <Table>\n` + xmlColumns + xmlTitleRows + xmlHeaders + xmlDataRows + xmlFooter;

      const blob = new Blob([completeXml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${nombreArchivo}-${format(new Date(), "yyyy-MM-dd")}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Exportación completada",
        description: "Se ha descargado el archivo Excel profesional",
      });
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte a Excel",
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
            Exportar Excel
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
