// components/citas/FormularioCita.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { FormularioNuevoCliente } from "./FormularioNuevoCliente";
import { Cita, Cliente, Servicio, Empleado, FormCita, VALOR_SIN_EMPLEADO, VALOR_NUEVO_CLIENTE } from "@/types/citas";

interface FormularioCitaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citaEditando: Cita | null;
  formData: FormCita;
  setFormData: (data: FormCita | ((prev: FormCita) => FormCita)) => void;
  clientes: Cliente[];
  servicios: Servicio[];
  empleados: Empleado[];
  onSubmit: () => Promise<void>;
  enviando: boolean;
  tema: any;
  onClienteCreado: (cliente: Cliente) => void;
}

export function FormularioCita({
  open,
  onOpenChange,
  citaEditando,
  formData,
  setFormData,
  clientes,
  servicios,
  empleados,
  onSubmit,
  enviando,
  tema,
  onClienteCreado
}: FormularioCitaProps) {
  const [dialogClienteAbierto, setDialogClienteAbierto] = useState(false);

  const handleClienteChange = (value: string) => {
    if (value === VALOR_NUEVO_CLIENTE) {
      setFormData(prev => ({ ...prev, clienteId: '' }));
      setDialogClienteAbierto(true);
    } else {
      setFormData(prev => ({ ...prev, clienteId: value }));
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      fechaHora: '',
      clienteId: '',
      servicioId: '',
      empleadoId: VALOR_SIN_EMPLEADO,
      notas: ''
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    limpiarFormulario();
  };

  const servicioSeleccionado = servicios.find(s => s.id === formData.servicioId);
  const clienteSeleccionado = clientes.find(c => c.id === formData.clienteId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {citaEditando ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Rellena los detalles para programar o actualizar la cita
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fechaHora">Fecha y Hora *</Label>
              <Input
                id="fechaHora"
                type="datetime-local"
                value={formData.fechaHora}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaHora: e.target.value }))}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="clienteId">Cliente *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialogClienteAbierto(true)}
                  className="text-xs h-6 px-2"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Nuevo
                </Button>
              </div>
              <Select value={formData.clienteId} onValueChange={handleClienteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VALOR_NUEVO_CLIENTE}>
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <UserPlus className="h-4 w-4 mr-2" />
                      ✨ Crear nuevo cliente...
                    </div>
                  </SelectItem>
                  {clientes.length === 0 ? (
                    <SelectItem value="no-clientes" disabled>
                      No hay clientes disponibles
                    </SelectItem>
                  ) : (
                    clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{cliente.nombre}</span>
                          {cliente.telefono && (
                            <span className="text-xs text-muted-foreground">
                              {cliente.telefono}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servicioId">Servicio *</Label>
              <Select
                value={formData.servicioId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, servicioId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un servicio" />
                </SelectTrigger>
                <SelectContent>
                  {servicios.length === 0 ? (
                    <SelectItem value="no-servicios" disabled>
                      No hay servicios disponibles
                    </SelectItem>
                  ) : (
                    servicios.map((servicio) => (
                      <SelectItem key={servicio.id} value={servicio.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{servicio.nombre}</span>
                          <span className="text-xs text-muted-foreground">
                            ${servicio.precio?.toLocaleString()} • {servicio.duracion} min
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="empleadoId">Empleado (Opcional)</Label>
              <Select
                value={formData.empleadoId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, empleadoId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={VALOR_SIN_EMPLEADO}>
                    <span className="text-muted-foreground">Sin empleado específico</span>
                  </SelectItem>
                  {empleados.length === 0 ? (
                    <SelectItem value="no-empleados" disabled>
                      No hay empleados disponibles
                    </SelectItem>
                  ) : (
                    empleados.map((empleado) => (
                      <SelectItem key={empleado.id} value={empleado.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{empleado.nombre}</span>
                          {empleado.email && (
                            <span className="text-xs text-muted-foreground">
                              {empleado.email}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                placeholder="Notas adicionales sobre la cita..."
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Información del servicio seleccionado */}
            {servicioSeleccionado && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Información del servicio:</div>
                <div className="text-xs text-muted-foreground">
                  <p>Duración: {servicioSeleccionado.duracion} minutos</p>
                  <p>Precio: ${servicioSeleccionado.precio?.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Información del cliente seleccionado */}
            {clienteSeleccionado && (
              <div className="p-3 bg-emerald-500/10 dark:bg-green-950 rounded-lg border border-emerald-500/30 dark:border-green-800">
                <div className="text-sm font-medium text-green-800 dark:text-green-300 dark:text-green-200 mb-1">
                  Cliente seleccionado:
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 dark:text-green-300">
                  <p>{clienteSeleccionado.nombre}</p>
                  {clienteSeleccionado.telefono && <p>📞 {clienteSeleccionado.telefono}</p>}
                  {clienteSeleccionado.email && <p>📧 {clienteSeleccionado.email}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              onClick={onSubmit}
              disabled={enviando || !formData.fechaHora || !formData.clienteId || !formData.servicioId}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {enviando ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>{citaEditando ? 'Actualizando...' : 'Creando...'}</span>
                </span>
              ) : (
                <span>{citaEditando ? 'Actualizar' : 'Crear'}</span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FormularioNuevoCliente
        open={dialogClienteAbierto}
        onOpenChange={setDialogClienteAbierto}
        onClienteCreado={(cliente) => {
          onClienteCreado(cliente);
          setFormData(prev => ({ ...prev, clienteId: cliente.id }));
          setDialogClienteAbierto(false);
        }}
        tema={tema}
      />
    </>
  );
}