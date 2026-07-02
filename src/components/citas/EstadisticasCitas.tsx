// components/citas/EstadisticasCitas.tsx
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, CheckCircle, DollarSign, Calendar, TrendingUp, Filter, BarChart3 } from "lucide-react";
import type { Cita } from "@/types/citas";

interface EstadisticasCitasProps {
  citas: Cita[];
  fechaSeleccionada: string;
  children?: React.ReactNode;
}

interface EstadisticasData {
  programadas: number;
  enProceso: number;
  completadas: number;
  facturadas: number;
  canceladas: number;
  noAsistio: number;
  totalIngresos: number;
  ingresosFacturados: number;
  citasHoy: number;
  citasSemana: number;
}

export function EstadisticasCitas({ citas, fechaSeleccionada, children }: EstadisticasCitasProps) {
  const [filtroTiempo, setFiltroTiempo] = useState<'hoy' | 'semana' | 'mes' | 'todos'>('todos');
  
  // Estados para paginación
  const [paginaFacturadas, setPaginaFacturadas] = useState(1);
  const [paginaCompletadas, setPaginaCompletadas] = useState(1);
  const itemsPorPagina = 5; // Como es un historial, mostramos 5 por interfaz compacta

  const citasFiltradas = useMemo(() => {
    const fechaActual = new Date();
    const fechaHoy = fechaActual.toISOString().split('T')[0];

    switch (filtroTiempo) {
      case 'hoy':
        return citas.filter(cita =>
          new Date(cita.fechaHora).toISOString().split('T')[0] === fechaHoy
        );
      case 'semana':
        const inicioSemana = new Date(fechaActual);
        inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        return citas.filter(cita => {
          const fechaCita = new Date(cita.fechaHora);
          return fechaCita >= inicioSemana && fechaCita <= finSemana;
        });
      case 'mes':
        const inicioMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
        const finMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0);
        return citas.filter(cita => {
          const fechaCita = new Date(cita.fechaHora);
          return fechaCita >= inicioMes && fechaCita <= finMes;
        });
      default:
        return citas;
    }
  }, [citas, filtroTiempo]);

  const estadisticas: EstadisticasData = useMemo(() => {
  const fechaHoy = new Date().toISOString().split('T')[0];
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);

  return citasFiltradas.reduce((acc, cita) => {
    const fechaCita = new Date(cita.fechaHora);
    const precio = Number(cita.servicio.precio) || 0;

    // Contar por estado
    switch (cita.estado) {
      case 'PROGRAMADA':
      case 'CONFIRMADA':
        acc.programadas++;
        break;
      case 'EN_PROCESO':
        acc.enProceso++;
        break;
      case 'COMPLETADA':
        acc.completadas++;
        // NO sumar a ingresos hasta que esté facturada
        break;
      case 'FACTURADA': // ✅ CORREGIDO: Reconocer estado FACTURADA
        acc.facturadas++;
        acc.ingresosFacturados += precio;
        acc.totalIngresos += precio;
        break;
      case 'CANCELADA':
        acc.canceladas++;
        break;
      case 'NO_ASISTIO':
        acc.noAsistio++;
        break;
    }

    // Contar citas de hoy y de la semana
    if (fechaCita.toISOString().split('T')[0] === fechaHoy) {
      acc.citasHoy++;
    }
    if (fechaCita >= inicioSemana && fechaCita <= finSemana) {
      acc.citasSemana++;
    }

    return acc;
  }, {
    programadas: 0,
    enProceso: 0,
    completadas: 0,
    facturadas: 0,
    canceladas: 0,
    noAsistio: 0,
    totalIngresos: 0,
    ingresosFacturados: 0,
    citasHoy: 0,
    citasSemana: 0
  });
}, [citasFiltradas]);

const citasFacturadasDetalle = useMemo(() => {
  return citasFiltradas.filter(cita => cita.estado === 'FACTURADA');
}, [citasFiltradas]);

const citasCompletadasDetalle = useMemo(() => {
  return citasFiltradas.filter(cita => cita.estado === 'COMPLETADA');
}, [citasFiltradas]);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Cálculos de paginación
  const totalPaginasFacturadas = Math.ceil(citasFacturadasDetalle.length / itemsPorPagina);
  const citasFacturadasPaginadas = citasFacturadasDetalle.slice(
    (paginaFacturadas - 1) * itemsPorPagina,
    paginaFacturadas * itemsPorPagina
  );

  const totalPaginasCompletadas = Math.ceil(citasCompletadasDetalle.length / itemsPorPagina);
  const citasCompletadasPaginadas = citasCompletadasDetalle.slice(
    (paginaCompletadas - 1) * itemsPorPagina,
    paginaCompletadas * itemsPorPagina
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Estadísticas y Filtros</h2>
        <Select value={filtroTiempo} onValueChange={(value: any) => setFiltroTiempo(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mes</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programadas</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estadisticas.programadas}</div>
            <p className="text-xs text-muted-foreground">Por atender</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <User className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.enProceso}</div>
            <p className="text-xs text-muted-foreground">Siendo atendidas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{estadisticas.completadas}</div>
            <p className="text-xs text-muted-foreground">Listas para cobrar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturadas</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{estadisticas.facturadas}</div>
            <p className="text-xs text-muted-foreground">Procesadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de ingresos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Facturados</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${estadisticas.ingresosFacturados.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Ya cobrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${citasCompletadasDetalle.reduce((sum, cita) => sum + Number(cita.servicio.precio), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{estadisticas.citasHoy}</div>
            <p className="text-xs text-muted-foreground">Programadas para hoy</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <BarChart3 className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {citasFiltradas.length > 0
                ? `${Math.round((estadisticas.facturadas / citasFiltradas.length) * 100)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">Citas facturadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal inyectado (Lista / Calendario) */}
      {children && (
        <div className="py-6 border-y my-6 border-dashed border-border dark:border-border">
          {children}
        </div>
      )}

      {/* Detalle de citas facturadas */}
      {citasFacturadasDetalle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              Citas Facturadas ({citasFacturadasDetalle.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {citasFacturadasPaginadas.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div>
                    <p className="font-medium">{cita.cliente.nombre}</p>
                    <p className="text-sm text-muted-foreground">{cita.servicio.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(cita.fechaHora)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">${cita.servicio.precio.toLocaleString()}</p>
                    <Badge variant="outline" className="bg-emerald-500/15 text-green-700 dark:text-green-400 border-green-500/40">
                      {cita.estado === 'FACTURADA' ? 'Facturada' : 'Finalizada'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Controles de Paginación Facturadas */}
              {totalPaginasFacturadas > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {(paginaFacturadas - 1) * itemsPorPagina + 1}-{Math.min(paginaFacturadas * itemsPorPagina, citasFacturadasDetalle.length)} de {citasFacturadasDetalle.length}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => setPaginaFacturadas(p => Math.max(1, p - 1))}
                      disabled={paginaFacturadas === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs flex items-center px-2">
                      {paginaFacturadas} / {totalPaginasFacturadas}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => setPaginaFacturadas(p => Math.min(totalPaginasFacturadas, p + 1))}
                      disabled={paginaFacturadas === totalPaginasFacturadas}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total Facturado:</span>
                  <span className="text-green-600 dark:text-green-400">${estadisticas.ingresosFacturados.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle de citas completadas (listas para cobrar) */}
      {citasCompletadasDetalle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Citas Completadas - Listas para Cobrar ({citasCompletadasDetalle.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {citasCompletadasPaginadas.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div>
                    <p className="font-medium">{cita.cliente.nombre}</p>
                    <p className="text-sm text-muted-foreground">{cita.servicio.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatearFecha(cita.fechaHora)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">${cita.servicio.precio.toLocaleString()}</p>
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40">
                      Lista para cobrar
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Controles de Paginación Completadas */}
              {totalPaginasCompletadas > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Mostrando {(paginaCompletadas - 1) * itemsPorPagina + 1}-{Math.min(paginaCompletadas * itemsPorPagina, citasCompletadasDetalle.length)} de {citasCompletadasDetalle.length}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => setPaginaCompletadas(p => Math.max(1, p - 1))}
                      disabled={paginaCompletadas === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs flex items-center px-2">
                      {paginaCompletadas} / {totalPaginasCompletadas}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => setPaginaCompletadas(p => Math.min(totalPaginasCompletadas, p + 1))}
                      disabled={paginaCompletadas === totalPaginasCompletadas}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total por Cobrar:</span>
                  <span className="text-emerald-600">
                    ${citasCompletadasDetalle.reduce((sum, cita) => sum + Number(cita.servicio.precio), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen adicional */}
      {(estadisticas.canceladas > 0 || estadisticas.noAsistio > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Citas No Exitosas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {estadisticas.canceladas > 0 && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Canceladas</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.canceladas}</p>
                </div>
              )}
              {estadisticas.noAsistio > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium text-foreground dark:text-muted-foreground/40">No Asistieron</p>
                  <p className="text-2xl font-bold text-muted-foreground">{estadisticas.noAsistio}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
  );
}
