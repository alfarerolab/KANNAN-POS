// components/citas/CalendarioCitas.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon } from "lucide-react";
import { Cita, ESTADOS_CITAS } from "@/types/citas";

interface CalendarioCitasProps {
  citas: Cita[];
  fechaSeleccionada: string;
  onFechaChange: (fecha: string) => void;
}

export function CalendarioCitas({
  citas,
  fechaSeleccionada,
  onFechaChange
}: CalendarioCitasProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [diaSeleccionadoModal, setDiaSeleccionadoModal] = useState<Date | null>(null);

  const fechaCalendario = new Date(fechaSeleccionada);
  
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatearHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const obtenerDiasDelMes = (fecha: Date) => {
    const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
    const diasDelMes = [];
    
    const primerDiaSemana = primerDia.getDay();
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const dia = new Date(primerDia);
      dia.setDate(dia.getDate() - (i + 1));
      diasDelMes.push({ fecha: dia, esDelMes: false });
    }
    
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      diasDelMes.push({ 
        fecha: new Date(fecha.getFullYear(), fecha.getMonth(), dia), 
        esDelMes: true 
      });
    }
    
    const ultimoDiaSemana = ultimoDia.getDay();
    for (let i = 1; i < 7 - ultimoDiaSemana; i++) {
      const dia = new Date(ultimoDia);
      dia.setDate(dia.getDate() + i);
      diasDelMes.push({ fecha: dia, esDelMes: false });
    }
    
    return diasDelMes;
  };

  const obtenerCitasDelDia = (fecha: Date) => {
    return citas.filter(cita => {
      const fechaCita = new Date(cita.fechaHora);
      return fechaCita.toDateString() === fecha.toDateString();
    });
  };

  const diasDelMes = obtenerDiasDelMes(fechaCalendario);

  const handleDiaClick = (fecha: Date, citasDelDia: Cita[]) => {
    onFechaChange(fecha.toISOString().split('T')[0]);
    if (citasDelDia.length > 0) {
      setDiaSeleccionadoModal(fecha);
      setModalAbierto(true);
    }
  };

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {meses[fechaCalendario.getMonth()]} {fechaCalendario.getFullYear()}
            </CardTitle>
            <CardDescription>
              Vista de calendario con todas las citas programadas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const nuevaFecha = new Date(fechaCalendario);
                nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
                onFechaChange(nuevaFecha.toISOString().split('T')[0]);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFechaChange(new Date().toISOString().split('T')[0])}
            >
              Hoy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const nuevaFecha = new Date(fechaCalendario);
                nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
                onFechaChange(nuevaFecha.toISOString().split('T')[0]);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dia => (
            <div key={dia} className="p-3 text-center font-semibold text-muted-foreground bg-muted/50 rounded-lg">
              {dia}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {diasDelMes.map((dia) => {
            const citasDelDia = obtenerCitasDelDia(dia.fecha);
            const esHoy = dia.fecha.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={dia.fecha.toISOString()}
                className={`
                  min-h-28 p-2 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${dia.esDelMes 
                    ? 'hover:bg-blue-500/10 hover:border-blue-500/40' 
                    : 'bg-muted/50 text-muted-foreground/70 border-border'}
                  ${esHoy 
                    ? 'border-blue-500 bg-blue-500/10 shadow-md' 
                    : 'border-border'}
                `}
                onClick={() => handleDiaClick(dia.fecha, citasDelDia)}
              >
                <div className={`text-sm font-bold mb-2 ${esHoy ? 'text-blue-600 dark:text-blue-400' : dia.esDelMes ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                  {dia.fecha.getDate()}
                </div>
                
                {citasDelDia.slice(0, 2).map((cita) => (
                  <div 
                    key={cita.id}
                    className={`
                      text-xs p-1.5 mb-1 rounded-md truncate font-medium
                      ${ESTADOS_CITAS[cita.estado].color} ${ESTADOS_CITAS[cita.estado].darkColor}
                    `}
                    title={`${cita.cliente.nombre} - ${cita.servicio.nombre} - ${formatearHora(cita.fechaHora)}`}
                  >
                    <div className="font-semibold">
                      {formatearHora(cita.fechaHora)}
                    </div>
                    <div className="truncate">
                      {cita.cliente.nombre}
                    </div>
                  </div>
                ))}
                
                {citasDelDia.length > 2 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/15 rounded px-2 py-1 mt-1">
                    +{citasDelDia.length - 2} más
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* Modal de Detalle del Día */}
    <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Citas del {diaSeleccionadoModal?.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            {diaSeleccionadoModal ? obtenerCitasDelDia(diaSeleccionadoModal).length : 0} citas programadas para este día
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 mt-4">
          {diaSeleccionadoModal && obtenerCitasDelDia(diaSeleccionadoModal).map((cita) => (
            <div 
              key={cita.id} 
              className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-muted/50/50"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 font-bold text-lg text-blue-700 dark:text-blue-400">
                  <Clock className="h-4 w-4" />
                  {formatearHora(cita.fechaHora)}
                </div>
                <Badge 
                  className={`${ESTADOS_CITAS[cita.estado].color} ${ESTADOS_CITAS[cita.estado].darkColor} border`}
                  variant={ESTADOS_CITAS[cita.estado].variant}
                >
                  {ESTADOS_CITAS[cita.estado].label}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-foreground dark:text-muted-foreground/40">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {cita.cliente.nombre}
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Servicio:</span> {cita.servicio.nombre} 
                  <span className="font-bold text-green-600 dark:text-green-400 ml-2">${cita.servicio.precio.toLocaleString()}</span>
                </div>
                {cita.empleado && (
                  <div className="pl-6 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground/80">Empleado:</span> {cita.empleado.nombre}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}