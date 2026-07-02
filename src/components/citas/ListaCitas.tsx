import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Edit, Trash2, DollarSign, Clock, Play, CheckCircle } from "lucide-react";
import { Cita,  ESTADOS_CITAS } from "@/types/citas";

interface ListaCitasProps {
  citas: Cita[];
  cargando: boolean;
  fechaSeleccionada: string;
  onEditarCita: (cita: Cita) => void;
  onEliminarCita: (citaId: string) => void;
  onActualizarEstado: (citaId: string, nuevoEstado: string) => void;
  router: any;
  session: any;
}

export function ListaCitas({
  citas,
  cargando,
  fechaSeleccionada,
  onEditarCita,
  onEliminarCita,
  onActualizarEstado,
  router,
  session
}: ListaCitasProps) {
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;
  
  const totalPaginas = Math.ceil(citas.length / itemsPorPagina);
  const citasPaginadas = citas.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  const formatearHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatearFecha = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleCobrarServicio = (cita: Cita) => {
    localStorage.removeItem('servicioParaCobro');
    localStorage.removeItem('servicioParaAgendamiento');
    
    const servicioParaCobro = {
      id: cita.servicio.id,
      servicioId: cita.servicio.id,
      nombre: cita.servicio.nombre,
      precio: Number(cita.servicio.precio) || 0,
      duracion: cita.duracion || cita.servicio.duracion || 60,
      empresaId: session?.user?.empresaId,
      categoria: cita.servicio.categoria || 'Servicios',
      cliente: {
        id: cita.cliente?.id,
        nombre: cita.cliente?.nombre,
        telefono: cita.cliente?.telefono,
        email: cita.cliente?.email,
        empresaId: session?.user?.empresaId
      },
      citaId: cita.id, // Esto es crucial para vincular la venta con la cita
      timestamp: Date.now()
    };

    localStorage.setItem('servicioParaCobro', JSON.stringify(servicioParaCobro));
    
    setTimeout(() => {
      router.push('/dashboard/pos?autoAddService=true');
    }, 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {fechaSeleccionada === new Date().toISOString().split('T')[0]
            ? "Citas de Hoy"
            : `Citas del ${formatearFecha(fechaSeleccionada + 'T00:00:00')}`
          }
        </CardTitle>
        <CardDescription>
          {cargando ? (
            <span>Cargando citas...</span>
          ) : (
            <span>
              {citas.length} cita{citas.length !== 1 ? 's' : ''} encontrada{citas.length !== 1 ? 's' : ''}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {cargando ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando citas...</span>
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay citas programadas para esta fecha.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {citasPaginadas.map((cita) => {
              const estadoInfo = ESTADOS_CITAS[cita.estado];
              const nextAction = estadoInfo?.nextAction;

              return (
                <Card key={cita.id} className="hover:shadow-md transition-all duration-200 border-l-4" style={{borderLeftColor: '#6366f1'}}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="text-center min-w-20">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {formatearHora(cita.fechaHora)}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            {cita.duracion} min
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="font-semibold text-lg">{cita.cliente?.nombre || 'Cliente no disponible'}</h4>
                            <Badge 
                              className={`${estadoInfo.color} ${estadoInfo.darkColor} border font-medium px-3 py-1`}
                              variant={estadoInfo.variant}
                            >
                              {estadoInfo.label}
                            </Badge>
                            
                            {/* Mostrar si ya está facturada/vendida */}
                            {cita.venta && (
                              <Badge className="bg-emerald-500/15 text-green-800 dark:text-green-300 border-green-500/40">
                                <span>Vendida: ${cita.venta.total.toLocaleString()}</span>
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground/80">Servicio:</span>
                              <span className="font-medium">{cita.servicio?.nombre || 'Servicio no disponible'}</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                ${cita.servicio?.precio?.toLocaleString() || 0}
                              </span>
                            </div>
                            {cita.empleado && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground/80">Empleado:</span>
                                <span>{cita.empleado.nombre}</span>
                              </div>
                            )}
                            {cita.cliente?.telefono && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground/80">Teléfono:</span>
                                <span>{cita.cliente.telefono}</span>
                              </div>
                            )}
                            {cita.notas && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <span className="font-medium text-foreground/80">Notas:</span>
                                <span>{cita.notas}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Botón de acción principal según el estado */}
                        {nextAction && (
                          <Button
                            size="sm"
                            className={`${nextAction.color} text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all duration-200`}
                            onClick={() => {
                              if (nextAction.special && cita.estado === 'COMPLETADA') {
                                handleCobrarServicio(cita);
                              } else {
                                onActualizarEstado(cita.id, nextAction.state);
                              }
                            }}
                          >
                            {nextAction.special ? (
                              <DollarSign className="h-4 w-4 mr-1" />
                            ) : (
                              getActionIcon(nextAction.state)
                            )}
                            <span>{nextAction.label}</span>
                          </Button>
                        )}

                        {/* Botones de acción adicionales solo para estados específicos */}
                        {renderActionButtons(cita, onActualizarEstado)}

                        {/* Botones de edición y eliminación */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditarCita(cita)}
                          className="hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEliminarCita(cita.id)}
                          className="hover:bg-destructive/10 text-red-600 dark:text-red-400"
                          disabled={cita.estado === 'FACTURADA' || !!cita.venta}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {/* Controles de Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} a {Math.min(paginaActual * itemsPorPagina, citas.length)} de {citas.length} citas
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                    disabled={paginaActual === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center justify-center px-4 font-medium text-sm">
                    Página {paginaActual} de {totalPaginas}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaActual(prev => Math.min(totalPaginas, prev + 1))}
                    disabled={paginaActual === totalPaginas}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Función auxiliar para obtener el ícono apropiado - SOLUCIONADO
function getActionIcon(state: string) {
  const iconMap: Record<string, JSX.Element> = {
    'CONFIRMADA': <CheckCircle className="h-4 w-4 mr-1" />,
    'EN_PROCESO': <Play className="h-4 w-4 mr-1" />,
    'COMPLETADA': <CheckCircle className="h-4 w-4 mr-1" />,
    'FINALIZADA': <CheckCircle className="h-4 w-4 mr-1" />
  };
  return iconMap[state] || <Clock className="h-4 w-4 mr-1" />;
}

// Función auxiliar para renderizar botones adicionales
function renderActionButtons(cita: Cita, onActualizarEstado: (id: string, estado: string) => void) {
  const { estado } = cita;
  
  // Solo mostrar botones adicionales para estados específicos
  if (estado === 'PROGRAMADA') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onActualizarEstado(cita.id, 'CANCELADA')}
        className="border-destructive/30 text-red-600 dark:text-red-400 hover:bg-destructive/10"
      >
        Cancelar
      </Button>
    );
  }
  
  if (estado === 'CONFIRMADA') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onActualizarEstado(cita.id, 'CANCELADA')}
        className="border-destructive/30 text-red-600 dark:text-red-400 hover:bg-destructive/10"
      >
        Cancelar
      </Button>
    );
  }
  
  if (estado === 'EN_PROCESO') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onActualizarEstado(cita.id, 'NO_ASISTIO')}
        className="border-border dark:border-border text-muted-foreground hover:bg-muted/50"
      >
        No Asistió
      </Button>
    );
  }

  return null;
}