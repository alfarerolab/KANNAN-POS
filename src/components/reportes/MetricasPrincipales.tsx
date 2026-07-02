import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, TrendingUp, Package, DollarSign, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ProductoVendido {
  id: string;
  nombre: string;
  cantidad: number;
  monto: number;
  tipo?: string;
}

interface ReporteGeneral {
  totalVentas: number;
  totalIngresos: number;
  totalProductosVendidos: number;
  totalServiciosPrestados?: number;
  ventaPromedio: number;
  ingresosProductos?: number;
  ingresosServicios?: number;
}

interface MetricasPrincipalesProps {
  reporteGeneral: ReporteGeneral;
  fechaInicio: Date | undefined;
  fechaFin: Date | undefined;
  productosDetallados?: ProductoVendido[];
  mostrarServicios?: boolean;
}

export function MetricasPrincipales({ 
  reporteGeneral, 
  fechaInicio, 
  fechaFin,
  productosDetallados = [],
  mostrarServicios = false
}: MetricasPrincipalesProps) {
  
  // Función para identificar si es servicio
  const esServicio = (item: ProductoVendido) => {
    const esServicioPorTipo = item.tipo === 'SERVICIO' || item.tipo === 'servicio' || item.tipo === 'Servicio';
    const esServicioPorNombre = (!item.tipo || item.tipo === '' || item.tipo === 'undefined') && 
                                item.nombre && item.nombre.toLowerCase().startsWith('servicio:');
    return esServicioPorTipo || esServicioPorNombre;
  };

  // Separar productos y servicios si tenemos datos detallados
  let totalProductosVendidos = 0;
  let totalServiciosPrestados = 0;
  let ingresosProductos = 0;
  let ingresosServicios = 0;

  if (productosDetallados && productosDetallados.length > 0) {
    // Calcular desde los datos detallados
    productosDetallados.forEach(item => {
      if (esServicio(item)) {
        totalServiciosPrestados += item.cantidad;
        ingresosServicios += item.monto;
      } else {
        totalProductosVendidos += item.cantidad;
        ingresosProductos += item.monto;
      }
    });
  } else {
    // Fallback: usar datos del reporte general
    totalProductosVendidos = reporteGeneral.totalProductosVendidos || 0;
    totalServiciosPrestados = reporteGeneral.totalServiciosPrestados || 0;
    ingresosProductos = reporteGeneral.ingresosProductos || 0;
    ingresosServicios = reporteGeneral.ingresosServicios || 0;
  }

  return (
    <div className="space-y-6">
      {/* Métricas generales */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ventas</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground">{reporteGeneral.totalVentas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {fechaInicio && fechaFin 
              ? `${format(fechaInicio, "dd/MM/yyyy", { locale: es })} - ${format(fechaFin, "dd/MM/yyyy", { locale: es })}`
              : 'Selecciona un período'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ingresos</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground">{formatCurrency(reporteGeneral.totalIngresos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ventas completadas en el periodo
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Venta Promedio</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground">{formatCurrency(reporteGeneral.ventaPromedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio por transacción
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas separadas por productos y servicios - SOLO SI HAY SERVICIOS */}
      <div className={`grid gap-4 grid-cols-1 ${mostrarServicios ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'}`}>
        {/* Productos vendidos */}
        <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Productos Vendidos</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground">{totalProductosVendidos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unidades vendidas
            </p>
          </CardContent>
        </Card>

        {/* Ingresos por productos */}
        <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Productos</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground">{formatCurrency(ingresosProductos)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ventas de productos
            </p>
          </CardContent>
        </Card>

        {/* Servicios prestados - SOLO SI mostrarServicios es true */}
        {mostrarServicios && (
          <>
            <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Servicios Prestados</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-foreground">{totalServiciosPrestados}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Servicios realizados
                </p>
              </CardContent>
            </Card>

            {/* Ingresos por servicios */}
            <Card className="border border-border shadow-sm bg-card hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Servicios</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-foreground">{formatCurrency(ingresosServicios)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ventas de servicios
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}