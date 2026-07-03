import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { 
  AlertTriangle, RefreshCw, BarChart3, Target, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Minus, Loader2 
} from "lucide-react";

// ✅ IMPORTAR TIPOS DESDE EL HOOK
import type { 
  DatosAnalisis,
  EstadisticasGenerales,
  TendenciasVentas,
  AnalisisComparativo,
  FiltrosAnalisis
} from "@/hooks/use-analitica-ventas";

// ✅ PROPS ACTUALIZADAS
interface AnalyticsTabProps {
  datos: DatosAnalisis | null;  // Tipo correcto
  loading: boolean;
  error: string | null;
  filtrosActuales: FiltrosAnalisis;
  cargarAnalisis: (filtros: FiltrosAnalisis) => void;
  formatearMoneda: (cantidad?: number) => string;
  esTendenciasVentas: (datos: any) => datos is TendenciasVentas;
  esEstadisticasGenerales: (datos: any) => datos is EstadisticasGenerales;
  esAnalisisComparativo: (datos: any) => datos is AnalisisComparativo;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  datos,
  loading,
  error,
  filtrosActuales,
  cargarAnalisis,
  formatearMoneda,
  esTendenciasVentas,
  esEstadisticasGenerales,
  esAnalisisComparativo
}) => {
  
  const formatearFechaGrafico = (fecha: any, periodo: string) => {
    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }
    
    switch (periodo) {
      case 'dia':
        return fechaObj.toLocaleDateString('es-CO', { 
          day: '2-digit', 
          month: 'short'
        });
      case 'semana':
        return `S${Math.ceil(fechaObj.getDate() / 7)} ${fechaObj.toLocaleDateString('es-CO', { month: 'short' })}`;
      case 'mes':
        return fechaObj.toLocaleDateString('es-CO', { 
          month: 'short',
          year: '2-digit'
        });
      case 'año':
        return fechaObj.getFullYear().toString();
      default:
        return fechaObj.toLocaleDateString('es-CO', { 
          day: '2-digit', 
          month: 'short'
        });
    }
  };

  const formatearFechaCompleta = (fecha: any) => {
    const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
    
    if (isNaN(fechaObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return fechaObj.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTrendIcon = (valor: number) => {
    if (valor > 0) return <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (valor < 0) return <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  // ✅ FUNCIÓN MEJORADA con type guards
  const prepararDatosTendencias = () => {
    if (esTendenciasVentas(datos)) {
      const fechaActual = new Date();
      const hace2Anos = new Date();
      hace2Anos.setFullYear(fechaActual.getFullYear() - 2);
      
      const datosValidos = datos.tendencias
        .filter(item => {
          const fecha = item.fecha instanceof Date ? item.fecha : new Date(item.fecha);
          const esFechaValida = !isNaN(fecha.getTime());
          const esFechaRealista = fecha >= hace2Anos && fecha <= fechaActual;
          
          return esFechaValida && esFechaRealista;
        })
        .sort((a, b) => {
          const fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
          const fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
          return fechaA.getTime() - fechaB.getTime();
        });

      if (datosValidos.length === 0) {
        return [];
      }

      return datosValidos.map((item) => ({
        fecha: formatearFechaGrafico(item.fecha, filtrosActuales.periodo),
        fechaCompleta: formatearFechaCompleta(item.fecha),
        fechaOriginal: item.fecha,
        cantidad: Number(item.cantidad) || 0, 
        ingresos: Number(item.ingresos) || 0,   
        promedio: Number(item.promedio) || 0   
      }));
    }
    
    return [];
  };

  const datosTendenciasFormateados = prepararDatosTendencias();

  const calcularIntervalo = (totalDatos: number) => {
    if (totalDatos <= 7) return 0;
    if (totalDatos <= 14) return 1;
    if (totalDatos <= 30) return Math.floor(totalDatos / 10);
    return Math.floor(totalDatos / 8);
  };

  // ✅ EXTRAER DATOS CON TYPE GUARDS
  const ventasPorEstado = esEstadisticasGenerales(datos) ? datos.ventasPorEstado : undefined;
  const comparativo = esAnalisisComparativo(datos) ? datos.comparativo : 
                     esEstadisticasGenerales(datos) ? undefined : undefined;
  const topClientes = esEstadisticasGenerales(datos) ? datos.topClientes : undefined;

  return (
    <div className="w-full space-y-4 md:space-y-6">
      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Gráfico de Tendencias */}
        <Card className="w-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg md:text-xl">Tendencias de Ventas</CardTitle>
              <CardDescription className="text-sm">
                {datosTendenciasFormateados.length > 0 
                  ? `${datosTendenciasFormateados.length} registros - Período: ${filtrosActuales.periodo}` 
                  : "Cargando datos de tendencias..."
                }
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cargarAnalisis({ ...filtrosActuales, tipo: 'tendencias' })}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {loading ? 'Cargando' : 'Actualizar'}
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {loading ? (
              <div className="h-[250px] md:h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Cargando tendencias...</p>
                </div>
              </div>
            ) : datosTendenciasFormateados.length > 0 ? (
              <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 250 : 300}>
                <ComposedChart data={datosTendenciasFormateados} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="fecha" 
                    tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }}
                    angle={window.innerWidth < 768 ? -90 : -45}
                    textAnchor="end"
                    height={window.innerWidth < 768 ? 80 : 70}
                    interval={calcularIntervalo(datosTendenciasFormateados.length)}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }} width={60} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }} width={60} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      const numericValue = Number(value);
                      return [
                        name === 'ingresos' || name === 'promedio'
                          ? formatearMoneda(numericValue) 
                          : numericValue.toLocaleString('es-CO'),
                        name === 'ingresos' ? 'Ingresos' : 
                        name === 'cantidad' ? 'Ventas' : 'Ticket Promedio'
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0] && payload[0].payload) {
                        return payload[0].payload.fechaCompleta || label;
                      }
                      return label;
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="cantidad" 
                    fill="#3b82f6" 
                    name="Ventas"
                    radius={[2, 2, 0, 0]}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#10b981" 
                    strokeWidth={window.innerWidth < 768 ? 2 : 3} 
                    name="Ingresos"
                    dot={{ r: window.innerWidth < 768 ? 3 : 4, fill: '#10b981' }}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="promedio" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    name="Ticket Promedio"
                    dot={{ r: 3, fill: '#f59e0b' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] md:h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                  <div className="space-y-2">
                    <p className="mb-2 text-sm font-medium">No hay datos de tendencias</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Carga el análisis de tendencias para ver gráficos
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => cargarAnalisis({ ...filtrosActuales, tipo: 'tendencias' })}
                    className="w-full sm:w-auto mt-4"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Cargar Tendencias
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Estados */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Estados de Ventas</CardTitle>
            <CardDescription className="text-sm">
              Distribución por estado • {ventasPorEstado?.length || 0} categorías
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {loading ? (
              <div className="h-[250px] md:h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Cargando estados...</p>
                </div>
              </div>
            ) : ventasPorEstado && ventasPorEstado.length > 0 ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 200 : 250}>
                  <PieChart>
                    <Pie
                      data={ventasPorEstado}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => {
                        if (window.innerWidth < 768) return '';
                        const total = ventasPorEstado.reduce((sum, item) => sum + item.cantidad, 0) || 1;
                        const percent = ((entry.cantidad / total) * 100).toFixed(0);
                        return `${percent}%`;
                      }}
                      outerRadius={window.innerWidth < 768 ? 70 : 90}
                      fill="#8884d8"
                      dataKey="cantidad"
                    >
                      {ventasPorEstado.map((entry, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.estado === 'COMPLETADA' ? '#10b981' :
                            entry.estado === 'PENDIENTE' ? '#f59e0b' :
                            entry.estado === 'CANCELADA' ? '#ef4444' : '#6b7280'
                          } 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value} ventas`,
                        props.payload.estado
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                  {ventasPorEstado.map((entry, index) => {
                    const total = ventasPorEstado.reduce((sum, item) => sum + item.cantidad, 0) || 1;
                    const percent = ((entry.cantidad / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: 
                              entry.estado === 'COMPLETADA' ? '#10b981' :
                              entry.estado === 'PENDIENTE' ? '#f59e0b' :
                              entry.estado === 'CANCELADA' ? '#ef4444' : '#6b7280'
                          }}
                        />
                        <span className="text-xs md:text-sm font-medium">
                          {entry.estado.charAt(0) + entry.estado.slice(1).toLowerCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.cantidad} ({percent}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[250px] md:h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                  <p className="text-sm">No hay datos de estados disponibles</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => cargarAnalisis({ ...filtrosActuales, tipo: 'general' })}
                    className="mt-4"
                  >
                    Cargar Datos
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análisis Comparativo */}
      {comparativo && (
        <Card className="w-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg md:text-xl">Análisis Comparativo</CardTitle>
              <CardDescription className="text-sm">Comparación con período anterior</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cargarAnalisis({ ...filtrosActuales, tipo: 'comparativo' })}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {loading ? 'Cargando...' : 'Actualizar'}
            </Button>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-3 md:p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900 text-sm md:text-base">Ventas</h4>
                  <div className="flex items-center">
                    {getTrendIcon(comparativo.crecimientoVentas)}
                    <span className={`ml-1 text-xs md:text-sm font-bold ${
                      comparativo.crecimientoVentas >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {comparativo.crecimientoVentas > 0 ? '+' : ''}
                      {comparativo.crecimientoVentas.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl md:text-2xl font-bold text-blue-900">
                    {comparativo.ventasActuales.toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">
                    Anterior: {comparativo.ventasAnteriores.toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-900 text-sm md:text-base">Ingresos</h4>
                  <div className="flex items-center">
                    {getTrendIcon(comparativo.crecimientoIngresos)}
                    <span className={`ml-1 text-xs md:text-sm font-bold ${
                      comparativo.crecimientoIngresos >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {comparativo.crecimientoIngresos > 0 ? '+' : ''}
                      {comparativo.crecimientoIngresos.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl md:text-2xl font-bold text-green-900">
                    {formatearMoneda(comparativo.ingresosActuales)}
                  </p>
                  <p className="text-xs md:text-sm text-green-600 dark:text-green-400">
                    Anterior: {formatearMoneda(comparativo.ingresosAnteriores)}
                  </p>
                </div>
              </div>

              <div className="p-3 md:p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-900 text-sm md:text-base">Ticket Promedio</h4>
                  <div className="flex items-center">
                    {getTrendIcon(comparativo.crecimientoTicketPromedio)}
                    <span className={`ml-1 text-xs md:text-sm font-bold ${
                      comparativo.crecimientoTicketPromedio >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {comparativo.crecimientoTicketPromedio > 0 ? '+' : ''}
                      {comparativo.crecimientoTicketPromedio.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl md:text-2xl font-bold text-purple-900">
                    {formatearMoneda(comparativo.ticketPromedioActual)}
                  </p>
                  <p className="text-xs md:text-sm text-purple-600 dark:text-purple-400">
                    Anterior: {formatearMoneda(comparativo.ticketPromedioAnterior)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Clientes */}
      {topClientes && topClientes.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Top Clientes</CardTitle>
            <CardDescription className="text-sm">
              Clientes con mayor volumen de compras • {topClientes.length} registros
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="space-y-2 md:space-y-3">
              {topClientes.map((cliente, index) => (
                <div 
                  key={cliente.id} 
                  className="flex items-center justify-between p-2 md:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs md:text-sm ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-primary text-primary-foreground' :
                      index === 2 ? 'bg-primary text-primary-foreground' :
                      'bg-primary text-primary-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{cliente.nombre}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {cliente.email || 'Sin email registrado'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm md:text-base">{formatearMoneda(cliente.totalCompras)}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {cliente.cantidadVentas} compras
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};