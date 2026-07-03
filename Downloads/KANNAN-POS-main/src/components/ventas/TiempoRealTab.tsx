import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, RefreshCw, AlertTriangle, 
  TrendingUp, TrendingDown, Minus, Clock, 
  ShoppingCart, Package,
  Zap, Wifi, WifiOff, Bell, BellOff
} from "lucide-react";
import { useTiempoReal } from "@/hooks/use-tiempo-real";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TiempoRealTabProps {
  formatearMoneda: (cantidad?: number) => string;
}

export const TiempoRealTab: React.FC<TiempoRealTabProps> = ({
  formatearMoneda: formatearMonedaFallback
}) => {
  const {
    datos: datosTiempoReal,
    loading: loadingTiempoReal,
    error,
    conectado,
    actualizarManual,
    formatearMoneda,
    obtenerColorTendencia,
    configuracion,
    cambiarConfiguracion
  } = useTiempoReal({
    intervaloActualizacion: 30000,
    autoRefresh: true,
    mostrarNotificaciones: true
  });

  const getTrendIcon = (valor: number) => {
    if (valor > 0) return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (valor < 0) return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getAlertIcon = (tipo: string) => {
    const iconClass = "h-4 w-4";
    switch (tipo) {
      case 'critica': return <AlertTriangle className={`${iconClass} text-red-600 dark:text-red-400`} />;
      case 'advertencia': return <AlertTriangle className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />;
      default: return <AlertTriangle className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
    }
  };

  const formatearTiempo = (fecha: string) => {
    return format(new Date(fecha), "HH:mm:ss", { locale: es });
  };

  const formatearFechaRelativa = (fecha: string) => {
    const now = new Date();
    const fechaVenta = new Date(fecha);
    const diffMinutos = Math.floor((now.getTime() - fechaVenta.getTime()) / (1000 * 60));
    
    if (diffMinutos < 1) return "Ahora";
    if (diffMinutos < 60) return `${diffMinutos}m`;
    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `${diffHoras}h`;
    return format(fechaVenta, "dd/MM", { locale: es });
  };

  const toggleAutoRefresh = () => {
    cambiarConfiguracion({ autoRefresh: !configuracion.autoRefresh });
  };

  const toggleNotificaciones = () => {
    cambiarConfiguracion({ mostrarNotificaciones: !configuracion.mostrarNotificaciones });
  };

  const formatearMonedaFinal = formatearMoneda || formatearMonedaFallback;

  if (error && !datosTiempoReal) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <WifiOff className="h-8 w-8 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">Error de Conexión</h3>
                <p className="text-red-700 dark:text-red-400">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={actualizarManual}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            conectado ? 'bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' : 'bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300'
          }`}>
            {conectado ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{conectado ? 'Conectado' : 'Desconectado'}</span>
          </div>
          {datosTiempoReal && (
            <span className="text-sm text-muted-foreground">
              Actualizado: {formatearTiempo(datosTiempoReal.timestamp)}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleNotificaciones}
            className={configuracion.mostrarNotificaciones ? "bg-blue-500/10" : ""}
          >
            {configuracion.mostrarNotificaciones ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoRefresh}
            className={configuracion.autoRefresh ? "bg-emerald-500/10" : ""}
          >
            <Zap className={`h-4 w-4 ${configuracion.autoRefresh ? 'text-green-600 dark:text-green-400' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={actualizarManual} disabled={loadingTiempoReal}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingTiempoReal ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alertas activas */}
      {datosTiempoReal?.alertas && Array.isArray(datosTiempoReal.alertas) && datosTiempoReal.alertas.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {datosTiempoReal.alertas.slice(0, 4).map((alerta) => (
            <Card key={alerta.id} className={`border-l-4 ${
              alerta.tipo === 'critica' ? 'border-l-red-500 bg-destructive/10' : 
              alerta.tipo === 'advertencia' ? 'border-l-yellow-500 bg-amber-500/10' : 
              'border-l-blue-500 bg-blue-500/10'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alerta.tipo)}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{alerta.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{alerta.descripcion}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatearTiempo(alerta.timestamp)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Ventas Recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-green-500" />
              Ventas Recientes
            </CardTitle>
            <CardDescription>
              Últimas transacciones • Actualización automática cada {configuracion.intervaloActualizacion / 1000}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTiempoReal ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse p-3 border rounded">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : datosTiempoReal?.ventasRecientes && datosTiempoReal.ventasRecientes.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {datosTiempoReal.ventasRecientes.map((venta: any) => {
                  // Asegurar que venta.productos sea un array
                  const productos = Array.isArray(venta.productos) ? venta.productos : [];
                  
                  return (
                    <div key={venta.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium">{formatearMonedaFinal(venta.total)}</span>
                            <Badge variant="outline" className="text-xs">
                              {venta.tipo || venta.estado || 'N/A'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>
                              Cliente: {venta.cliente || 'Cliente general'}  
                            </div>
                            <div>
                              Vendedor: {venta.usuario || 'Sistema'}
                            </div>
                            <div>{venta.metodoPago || 'Efectivo'}</div>
                            {productos.length > 0 && (
                              <div className="mt-1 text-xs">
                                {productos.slice(0, 2).map((prod: any, idx: number) => {
                                  const cantidad = prod.cantidad || 1;
                                  const nombre = prod.nombre || prod.producto?.nombre || `Producto #${(prod.productoId || prod.id || 'N/A').toString().slice(-6)}`;
                                  
                                  return (
                                    <span key={idx} className="mr-2">
                                      {cantidad}x {nombre}
                                    </span>
                                  );
                                })}
                                {productos.length > 2 && (
                                  <span>+{productos.length - 2} más</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatearFechaRelativa(venta.fecha)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatearTiempo(venta.fecha)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No hay ventas recientes</p>
                <p className="text-sm">Las nuevas ventas aparecerán aquí automáticamente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monitor de Actividad */}
        <Card>
          <CardHeader>
            <CardTitle>Monitor de Actividad</CardTitle>
            <CardDescription>Métricas en vivo del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {loadingTiempoReal ? "--" : (datosTiempoReal?.metricas?.ventasUltimos30Min || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Últimos 30min</div>
              </div>
              
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {loadingTiempoReal ? "--" : (datosTiempoReal?.metricas?.usuariosActivos || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Usuarios activos</div>
              </div>
              
              <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {loadingTiempoReal ? "--" : (datosTiempoReal?.metricas?.ventasHoy || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Ventas hoy</div>
              </div>
              
              <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {datosTiempoReal?.alertas?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Alertas activas</div>
              </div>
            </div>

            {/* Tendencia de ventas */}
            {datosTiempoReal?.metricas?.tendenciaVentas !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tendencia (30min vs anterior)</span>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(datosTiempoReal.metricas.tendenciaVentas)}
                    <span className={`text-sm ${obtenerColorTendencia(datosTiempoReal.metricas.tendenciaVentas)}`}>
                      {datosTiempoReal.metricas.tendenciaVentas > 0 ? '+' : ''}
                      {datosTiempoReal.metricas.tendenciaVentas.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rendimiento del sistema */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Rendimiento del sistema</span>
                <span className={`text-sm ${
                  (datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 90 ? 'text-green-600 dark:text-green-400' :
                  (datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {(datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 90 ? 'Óptimo' :
                   (datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 70 ? 'Bueno' : 'Requiere atención'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    (datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 90 ? 'bg-green-500' :
                    (datosTiempoReal?.estadoSistema?.rendimiento || 0) >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${datosTiempoReal?.estadoSistema?.rendimiento || 0}%` }}
                />
              </div>
            </div>

            {/* Estado de conexión y sincronización */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>🔄 Última sincronización</span>
                <span className="text-muted-foreground">
                  {datosTiempoReal ? formatearFechaRelativa(datosTiempoReal.timestamp) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Estado de conexión</span>
                <Badge className={conectado ? "bg-emerald-500/15 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" : "bg-destructive/15 dark:bg-red-900/40 text-red-800 dark:text-red-300 dark:text-red-300"}>
                  {conectado ? 'Conectado' : 'Desconectado'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Auto-actualización</span>
                <Badge className={configuracion.autoRefresh ? "bg-blue-500/15 text-blue-800 dark:text-blue-300" : "bg-muted text-foreground"}>
                  {configuracion.autoRefresh ? 'Activa' : 'Pausada'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de actividad por hora */}
      {datosTiempoReal?.metricas?.ingresosPorHora && datosTiempoReal.metricas.ingresosPorHora.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
              Actividad por Hora - Hoy
            </CardTitle>
            <CardDescription>Ventas e ingresos distribuidos durante el día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
              {datosTiempoReal.metricas.ingresosPorHora.map((hora: any) => (
                <div key={hora.hora} className="text-center">
                  <div 
                    className="bg-blue-200 rounded-t mb-1 transition-all hover:bg-blue-300"
                    style={{ 
                      height: `${Math.max(4, (hora.ventas / Math.max(...datosTiempoReal.metricas.ingresosPorHora.map((h: any) => h.ventas))) * 60)}px`
                    }}
                    title={`${hora.hora}:00 - ${hora.ventas} ventas - ${formatearMonedaFinal(hora.ingresos)}`}
                  />
                  <div className="text-xs text-muted-foreground">
                    {hora.hora}h
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>Volumen de ventas por hora</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};