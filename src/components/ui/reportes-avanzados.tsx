"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FileBarChart,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Package,
  Scissors,
  Heart,
  Pill,
  Wrench,
  Utensils,
  Coffee,
  BookOpen,
  Smartphone
} from "lucide-react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

// Colores para gráficos
const COLORES = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#ff0000', '#00ffff', '#ff00ff', '#ffff00', '#0000ff'
];

interface ReportesAvanzadosProps {
  empresaId: string;
}

export function ReportesAvanzados({ empresaId }: ReportesAvanzadosProps) {
  const { configuracion, configNegocio, obtenerTema } = useConfiguracionEmpresa();
  const { toast } = useToast();

  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split('T')[0];
  });

  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [reporteSeleccionado, setReporteSeleccionado] = useState("ventas");
  const [datosReporte, setDatosReporte] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const tema = obtenerTema();
  const tipoNegocio = configuracion?.tipoNegocio;

  // Configuración de reportes específicos por tipo de negocio
  const getReportesDisponibles = () => {
    const reportesBase = [
      { id: "ventas", nombre: "Ventas Generales", icono: <TrendingUp className="h-4 w-4" /> },
      { id: "productos", nombre: "Productos Top", icono: <Package className="h-4 w-4" /> },
      { id: "clientes", nombre: "Análisis de Clientes", icono: <Users className="h-4 w-4" /> }
    ];

    const reportesEspecificos: any = {
      VETERINARIA: [
        { id: "mascotas", nombre: "Reportes de Mascotas", icono: <Heart className="h-4 w-4" /> },
        { id: "tratamientos", nombre: "Tratamientos y Diagnósticos", icono: <Heart className="h-4 w-4" /> },
        { id: "citas-veterinaria", nombre: "Citas Médicas", icono: <Calendar className="h-4 w-4" /> }
      ],
      PELUQUERIA: [
        { id: "servicios", nombre: "Servicios Populares", icono: <Scissors className="h-4 w-4" /> },
        { id: "empleados", nombre: "Rendimiento Empleados", icono: <Users className="h-4 w-4" /> },
        { id: "citas-servicios", nombre: "Agenda de Citas", icono: <Calendar className="h-4 w-4" /> }
      ],
      SALON_BELLEZA: [
        { id: "servicios", nombre: "Servicios de Belleza", icono: <Scissors className="h-4 w-4" /> },
        { id: "empleados", nombre: "Especialistas Top", icono: <Users className="h-4 w-4" /> },
        { id: "productos-belleza", nombre: "Productos de Belleza", icono: <Package className="h-4 w-4" /> }
      ],
      FARMACIA: [
        { id: "medicamentos", nombre: "Medicamentos Top", icono: <Pill className="h-4 w-4" /> },
        { id: "vencimientos", nombre: "Control de Vencimientos", icono: <Calendar className="h-4 w-4" /> },
        { id: "lotes", nombre: "Gestión de Lotes", icono: <Package className="h-4 w-4" /> },
        { id: "recetas", nombre: "Análisis de Recetas", icono: <FileBarChart className="h-4 w-4" /> }
      ],
      FERRETERIA: [
        { id: "herramientas", nombre: "Herramientas Populares", icono: <Wrench className="h-4 w-4" /> },
        { id: "proveedores", nombre: "Análisis de Proveedores", icono: <Users className="h-4 w-4" /> },
        { id: "productos-metro", nombre: "Ventas por Metro", icono: <Package className="h-4 w-4" /> }
      ],
      RESTAURANTE: [
        { id: "platos", nombre: "Platos Populares", icono: <Utensils className="h-4 w-4" /> },
        { id: "mesas", nombre: "Rotación de Mesas", icono: <Package className="h-4 w-4" /> },
        { id: "ingredientes", nombre: "Uso de Ingredientes", icono: <Package className="h-4 w-4" /> }
      ],
      CAFETERIA: [
        { id: "bebidas", nombre: "Bebidas Populares", icono: <Coffee className="h-4 w-4" /> },
        { id: "horarios", nombre: "Horarios Peak", icono: <TrendingUp className="h-4 w-4" /> },
        { id: "temporadas", nombre: "Análisis Temporal", icono: <Calendar className="h-4 w-4" /> }
      ],
      ROPA: [
        { id: "variantes", nombre: "Variantes Populares", icono: <Package className="h-4 w-4" /> },
        { id: "tallas", nombre: "Análisis de Tallas", icono: <Package className="h-4 w-4" /> },
        { id: "temporadas-ropa", nombre: "Temporadas de Venta", icono: <Calendar className="h-4 w-4" /> }
      ],
      ELECTRONICA: [
        { id: "dispositivos", nombre: "Dispositivos Top", icono: <Smartphone className="h-4 w-4" /> },
        { id: "reparaciones", nombre: "Servicios Técnicos", icono: <Wrench className="h-4 w-4" /> },
        { id: "garantias", nombre: "Gestión de Garantías", icono: <FileBarChart className="h-4 w-4" /> }
      ],
      LIBRERIA: [
        { id: "libros", nombre: "Libros Populares", icono: <BookOpen className="h-4 w-4" /> },
        { id: "categorias-libros", nombre: "Categorías de Libros", icono: <Package className="h-4 w-4" /> },
        { id: "autores", nombre: "Autores Populares", icono: <Users className="h-4 w-4" /> }
      ]
    };

    return [...reportesBase, ...(tipoNegocio ? reportesEspecificos[tipoNegocio] || [] : [])];
  };

  // Cargar datos del reporte
  const cargarDatosReporte = async () => {
    setCargando(true);
    try {
      const response = await fetch(`/api/reportes/${reporteSeleccionado}?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&empresaId=${empresaId}`);

      if (!response.ok) {
        // Si no existe el endpoint, generar datos simulados
        setDatosReporte(generarDatosSimulados(reporteSeleccionado));
        return;
      }

      const datos = await response.json();
      setDatosReporte(datos);
    } catch (error) {
      console.error("Error al cargar reporte:", error);
      // Generar datos simulados como fallback
      setDatosReporte(generarDatosSimulados(reporteSeleccionado));
    } finally {
      setCargando(false);
    }
  };

  // Generar datos simulados para demostración
  const generarDatosSimulados = (tipo: string) => {
    const baseData = {
      titulo: `Reporte de ${tipo}`,
      periodo: `${fechaInicio} - ${fechaFin}`,
      resumen: {
        total: Math.floor(Math.random() * 1000000),
        cantidad: Math.floor(Math.random() * 500),
        promedio: Math.floor(Math.random() * 50000)
      }
    };

    switch (tipo) {
      case "ventas":
        return {
          ...baseData,
          titulo: "Reporte de Ventas",
          grafico: Array.from({ length: 7 }, (_, i) => ({
            fecha: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
            ventas: Math.floor(Math.random() * 100000),
            cantidad: Math.floor(Math.random() * 50)
          })),
          topProductos: Array.from({ length: 5 }, (_, i) => ({
            nombre: `Producto ${i + 1}`,
            ventas: Math.floor(Math.random() * 50000),
            cantidad: Math.floor(Math.random() * 100)
          }))
        };

      case "mascotas":
        return {
          ...baseData,
          titulo: "Reporte de Mascotas",
          especies: [
            { nombre: "Perros", cantidad: 45, color: COLORES[0] },
            { nombre: "Gatos", cantidad: 32, color: COLORES[1] },
            { nombre: "Aves", cantidad: 12, color: COLORES[2] },
            { nombre: "Otros", cantidad: 8, color: COLORES[3] }
          ],
          tratamientos: Array.from({ length: 5 }, (_, i) => ({
            tipo: `Tratamiento ${i + 1}`,
            cantidad: Math.floor(Math.random() * 30),
            ingresos: Math.floor(Math.random() * 200000)
          }))
        };

      case "servicios":
        return {
          ...baseData,
          titulo: "Reporte de Servicios",
          serviciosPopulares: Array.from({ length: 6 }, (_, i) => ({
            nombre: `Servicio ${i + 1}`,
            cantidad: Math.floor(Math.random() * 50),
            ingresos: Math.floor(Math.random() * 300000),
            duracion: Math.floor(Math.random() * 120) + 30
          })),
          empleados: Array.from({ length: 4 }, (_, i) => ({
            nombre: `Empleado ${i + 1}`,
            servicios: Math.floor(Math.random() * 30),
            ingresos: Math.floor(Math.random() * 150000)
          }))
        };

      case "vencimientos":
        return {
          ...baseData,
          titulo: "Control de Vencimientos",
          proximosVencer: Array.from({ length: 10 }, (_, i) => ({
            producto: `Medicamento ${i + 1}`,
            lote: `LOT${1000 + i}`,
            fechaVencimiento: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            cantidad: Math.floor(Math.random() * 50),
            valor: Math.floor(Math.random() * 100000)
          })),
          alertas: {
            critico: 3,
            advertencia: 7,
            normal: 25
          }
        };

      default:
        return baseData;
    }
  };

  // Exportar reporte a PDF
  const exportarPDF = () => {
    if (!datosReporte) return;

    const pdf = new jsPDF();

    // Header
    pdf.setFontSize(20);
    pdf.text(`${configuracion?.empresa?.nombre || 'Mi Empresa'}`, 20, 20);
    pdf.setFontSize(16);
    pdf.text(datosReporte.titulo, 20, 35);
    pdf.setFontSize(12);
    pdf.text(`Período: ${datosReporte.periodo}`, 20, 45);

    // Resumen
    pdf.text(`Total: $${datosReporte.resumen?.total?.toLocaleString() || 0}`, 20, 60);
    pdf.text(`Cantidad: ${datosReporte.resumen?.cantidad || 0}`, 20, 70);
    pdf.text(`Promedio: $${datosReporte.resumen?.promedio?.toLocaleString() || 0}`, 20, 80);

    // Generar contenido específico según el tipo de reporte
    let yPosition = 100;

    if (datosReporte.topProductos) {
      pdf.text("Top Productos:", 20, yPosition);
      yPosition += 10;
      datosReporte.topProductos.forEach((producto: any, index: number) => {
        pdf.text(`${index + 1}. ${producto.nombre} - $${producto.ventas.toLocaleString()}`, 25, yPosition);
        yPosition += 8;
      });
    }

    if (datosReporte.proximosVencer) {
      pdf.text("Próximos a Vencer:", 20, yPosition);
      yPosition += 10;
      datosReporte.proximosVencer.slice(0, 5).forEach((item: any, index: number) => {
        pdf.text(`${index + 1}. ${item.producto} - ${item.fechaVencimiento}`, 25, yPosition);
        yPosition += 8;
      });
    }

    pdf.save(`reporte-${reporteSeleccionado}-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "PDF exportado",
      description: "El reporte ha sido descargado como PDF"
    });
  };

  useEffect(() => {
    cargarDatosReporte();
  }, [reporteSeleccionado, fechaInicio, fechaFin]);

  const reportesDisponibles = getReportesDisponibles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reportes Avanzados</h2>
          <p className="text-muted-foreground">
            Análisis específico para {configNegocio?.nombre}
          </p>
        </div>
        <Badge variant="outline" className={tema.accent}>
          {tema.icon} {configNegocio?.nombre}
        </Badge>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Configuración del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={reporteSeleccionado} onValueChange={setReporteSeleccionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportesDisponibles.map(reporte => (
                    <SelectItem key={reporte.id} value={reporte.id}>
                      <div className="flex items-center gap-2">
                        {reporte.icono}
                        {reporte.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Acciones</Label>
              <div className="flex gap-2">
                <Button onClick={cargarDatosReporte} disabled={cargando}>
                  {cargando ? "Cargando..." : "Actualizar"}
                </Button>
                <Button variant="outline" onClick={exportarPDF} disabled={!datosReporte}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del Reporte */}
      {datosReporte && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold">
                  ${datosReporte.resumen?.total?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Total de ingresos</p>
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {datosReporte.resumen?.cantidad || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {reporteSeleccionado === 'mascotas' ? 'Mascotas atendidas' :
                   reporteSeleccionado === 'servicios' ? 'Servicios realizados' :
                   'Transacciones'}
                </p>
              </div>
              <div>
                <div className="text-lg">
                  ${datosReporte.resumen?.promedio?.toLocaleString() || 0}
                </div>
                <p className="text-sm text-muted-foreground">Promedio por transacción</p>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos específicos por tipo */}
          <div className="lg:col-span-2">
            {/* Reporte de Ventas */}
            {reporteSeleccionado === "ventas" && datosReporte.grafico && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={datosReporte.grafico}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Ventas']} />
                      <Line type="monotone" dataKey="ventas" stroke={COLORES[0]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Reporte de Mascotas */}
            {reporteSeleccionado === "mascotas" && datosReporte.especies && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Especies</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={datosReporte.especies}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cantidad"
                        label={({ nombre, cantidad }) => `${nombre}: ${cantidad}`}
                      >
                        {datosReporte.especies.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Reporte de Servicios */}
            {reporteSeleccionado === "servicios" && datosReporte.serviciosPopulares && (
              <Card>
                <CardHeader>
                  <CardTitle>Servicios Más Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={datosReporte.serviciosPopulares}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nombre" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [value, 'Cantidad']} />
                      <Bar dataKey="cantidad" fill={COLORES[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Reporte de Vencimientos */}
            {reporteSeleccionado === "vencimientos" && datosReporte.proximosVencer && (
              <Card>
                <CardHeader>
                  <CardTitle>Productos Próximos a Vencer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {datosReporte.proximosVencer.slice(0, 8).map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{item.producto}</div>
                          <div className="text-sm text-muted-foreground">
                            Lote: {item.lote} | Cantidad: {item.cantidad}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.fechaVencimiento}</div>
                          <div className="text-sm text-muted-foreground">
                            ${item.valor.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
