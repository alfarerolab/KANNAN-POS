"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Calendar, Plus, Loader2, Wrench, User, UserPlus, Grid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Componentes
import { FormularioCita } from "@/components/citas/FormularioCita";
import { EstadisticasCitas } from "@/components/citas/EstadisticasCitas";
import { ListaCitas } from "@/components/citas/ListaCitas";
import { CalendarioCitas } from "@/components/citas/CalendarioCitas";

import  { Cita, Cliente, Servicio, Empleado, FormCita,  VALOR_SIN_EMPLEADO } from "@/types/citas";

export default function CitasPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { configuracion, tieneCitas, obtenerTema, estaCargando: configCargando } = useConfiguracionEmpresa();

  // Estados principales
  const [citas, setCitas] = useState<Cita[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState('lista');

  // Estados para formularios
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [citaEditando, setCitaEditando] = useState<Cita | null>(null);
  const [formData, setFormData] = useState<FormCita>({
    fechaHora: '',
    clienteId: '',
    servicioId: '',
    empleadoId: VALOR_SIN_EMPLEADO,
    notas: ''
  });
  const [enviando, setEnviando] = useState(false);

  // Refs para evitar efectos múltiples
  const inicializadoRef = useRef(false);
  const cargandoRef = useRef(false);

  const tema = obtenerTema();

  // Función auxiliar para validar respuestas de API
  const validarRespuestaAPI = async (response: Response, tipoRecurso: string) => {
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status} al cargar ${tipoRecurso}:`, errorText);
      throw new Error(`Error ${response.status} al cargar ${tipoRecurso}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      if (Array.isArray(data.datos)) {
        return data.datos;
      }
      if (Array.isArray(data[tipoRecurso])) {
        return data[tipoRecurso];
      }
    }

    return [];
  };

  // Cargar datos iniciales
  const cargarDatosIniciales = async () => {
    try {
      const [clientesResponse, serviciosResponse, empleadosResponse] = await Promise.all([
        fetch('/api/clientes'),
        fetch('/api/servicios'),
        fetch('/api/usuarios?rol=EMPLEADO')
      ]);

      const [clientesData, serviciosData, empleadosData] = await Promise.all([
        validarRespuestaAPI(clientesResponse, 'clientes'),
        validarRespuestaAPI(serviciosResponse, 'servicios'),
        validarRespuestaAPI(empleadosResponse, 'empleados')
      ]);

      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setServicios(Array.isArray(serviciosData) ? serviciosData : []);

      const empleadosFiltrados = Array.isArray(empleadosData)
        ? empleadosData.filter((usuario: any) => usuario.rol === 'EMPLEADO')
        : [];

      setEmpleados(empleadosFiltrados);

    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      setClientes([]);
      setServicios([]);
      setEmpleados([]);
      toast.error("Error al cargar los datos iniciales");
    }
  };

  // Función para cargar citas
  const cargarCitas = async (fecha?: string, forzarRecarga = false) => {
    if (!session?.user?.empresaId || (cargandoRef.current && !forzarRecarga)) {
      return;
    }

    try {
      cargandoRef.current = true;
      if (!forzarRecarga) setCargando(true);
      setError(null);

      const url = new URL('/api/citas', window.location.origin);
      const response = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("No tienes autorización para ver las citas");
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const citasNormalizadas = data.map(cita => ({
          ...cita,
          servicio: {
            ...cita.servicio,
            precio: typeof cita.servicio.precio === 'string'
              ? Number.parseFloat(cita.servicio.precio)
              : cita.servicio.precio
          }
        }));

        const citasValidas = citasNormalizadas.filter(cita => {
          if (!cita || typeof cita !== 'object') {
            return false;
          }

          if (!cita.cliente || !cita.cliente.nombre || cita.cliente.nombre.trim() === '') {
            return false;
          }

          if (!cita.servicio || !cita.servicio.nombre || cita.servicio.nombre.trim() === '') {
            return false;
          }

          if (!cita.id || !cita.fechaHora) {
            return false;
          }

          return true;
        });

        setCitas(citasValidas);

        if (citasValidas.length !== data.length) {
        }
      } else {
        console.error('Los datos de citas no son un array:', data);
        setCitas([]);
        toast.error("Formato de datos de citas incorrecto");
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar las citas');
      setCitas([]);
      toast.error("Error al cargar las citas");
    } finally {
      setCargando(false);
      cargandoRef.current = false;
    }
  };

  // Efecto para inicialización única
  useEffect(() => {
    if (inicializadoRef.current || configCargando) return;

    if (!session?.user?.empresaId) {
      setCargando(false);
      inicializadoRef.current = true;
      return;
    }

    if (configuracion) {
      if (!tieneCitas()) {
        setCargando(false);
      } else {
        Promise.all([
          cargarCitas(fechaSeleccionada),
          cargarDatosIniciales()
        ]).finally(() => {
          setCargando(false);
        });
      }
      inicializadoRef.current = true;
    }
  }, [configuracion, configCargando, session?.user?.empresaId]);

  // Efecto para cambios de fecha
  useEffect(() => {
    if (!inicializadoRef.current || !configuracion || !tieneCitas()) return;

    const timeoutId = setTimeout(() => {
      cargarCitas(fechaSeleccionada);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [fechaSeleccionada]);

  // Función para formatear fecha para envío
  const formatearFechaParaEnvio = (fechaHoraLocal: string): string => {
    const fecha = new Date(fechaHoraLocal);
    if (isNaN(fecha.getTime())) {
      throw new Error('Fecha inválida');
    }
    return fecha.toISOString();
  };

  // Crear cita
  const crearCita = async () => {
    if (!formData.fechaHora || !formData.clienteId || !formData.servicioId) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      setEnviando(true);

      const fechaFormateada = formatearFechaParaEnvio(formData.fechaHora);

      const datosParaEnviar = {
        fechaHora: fechaFormateada,
        clienteId: formData.clienteId,
        servicioId: formData.servicioId,
        notas: formData.notas || undefined,
        ...(formData.empleadoId && formData.empleadoId !== VALOR_SIN_EMPLEADO && {
          empleadoId: formData.empleadoId
        })
      };

      const response = await fetch('/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosParaEnviar),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);

        if (errorData.details && Array.isArray(errorData.details)) {
          const mensajesError = errorData.details.map((detail: any) => detail.message).join(', ');
          throw new Error(`Error de validación: ${mensajesError}`);
        }

        throw new Error(errorData.error || 'Error al crear la cita');
      }

      const nuevaCita = await response.json();
      await cargarCitas(fechaSeleccionada, true);

      setDialogAbierto(false);
      limpiarFormulario();
      
      if (nuevaCita.autoAdjusted) {
        toast.success(`Cita agendada para las ${new Date(nuevaCita.fechaHora).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})} porque el empleado estaba ocupado a la hora que pediste.`);
      } else {
        toast.success("Cita creada exitosamente");
      }
    } catch (error) {
      console.error('Error al crear cita:', error);
      toast.error(error instanceof Error ? error.message : "Error al crear la cita");
    } finally {
      setEnviando(false);
    }
  };

  // Actualizar cita
  const actualizarCita = async () => {
    if (!citaEditando || !formData.fechaHora || !formData.clienteId || !formData.servicioId) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    try {
      setEnviando(true);

      const fechaFormateada = formatearFechaParaEnvio(formData.fechaHora);

      const datosParaEnviar = {
        fechaHora: fechaFormateada,
        clienteId: formData.clienteId,
        servicioId: formData.servicioId,
        notas: formData.notas || undefined,
        ...(formData.empleadoId && formData.empleadoId !== VALOR_SIN_EMPLEADO && {
          empleadoId: formData.empleadoId
        })
      };

      const response = await fetch(`/api/citas/${citaEditando.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datosParaEnviar),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);

        if (errorData.details && Array.isArray(errorData.details)) {
          const mensajesError = errorData.details.map((detail: any) => detail.message).join(', ');
          throw new Error(`Error de validación: ${mensajesError}`);
        }

        throw new Error(errorData.error || 'Error al actualizar la cita');
      }

      const citaActualizadaApi = await response.json();

      await cargarCitas(fechaSeleccionada, true);

      setDialogAbierto(false);
      limpiarFormulario();
      
      if (citaActualizadaApi.autoAdjusted) {
        toast.success(`Cita actualizada y movida para las ${new Date(citaActualizadaApi.fechaHora).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})} porque el empleado estaba ocupado a la hora que pediste.`);
      } else {
        toast.success("Cita actualizada exitosamente");
      }
    } catch (error) {
      console.error('Error al actualizar cita:', error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar la cita");
    } finally {
      setEnviando(false);
    }
  };

  // Funciones auxiliares
  const limpiarFormulario = () => {
    setFormData({
      fechaHora: '',
      clienteId: '',
      servicioId: '',
      empleadoId: VALOR_SIN_EMPLEADO,
      notas: ''
    });
    setCitaEditando(null);
  };

  const abrirDialogoNuevaCita = () => {
    limpiarFormulario();
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    mañana.setHours(9, 0, 0, 0);

    setFormData(prev => ({
      ...prev,
      fechaHora: mañana.toISOString().slice(0, 16)
    }));
    setDialogAbierto(true);
  };

  const abrirDialogoEditarCita = (cita: Cita) => {
    setCitaEditando(cita);

    const fechaCita = new Date(cita.fechaHora);
    const fechaFormateada = fechaCita.toISOString().slice(0, 16);

    setFormData({
      fechaHora: fechaFormateada,
      clienteId: cita.cliente.id,
      servicioId: cita.servicio.id,
      empleadoId: cita.empleado?.id || VALOR_SIN_EMPLEADO,
      notas: cita.notas || ''
    });
    setDialogAbierto(true);
  };

  const actualizarEstadoCita = async (citaId: string, nuevoEstado: string) => {
    try {
      if (nuevoEstado === 'FACTURADA') {
        const cita = citas.find(c => c.id === citaId);
        if (cita) {
          // Limpiar cualquier servicio anterior
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
            citaId: cita.id, // IMPORTANTE: ID de la cita para vincular
            timestamp: Date.now(),
            esDeServicio: true,
            cantidad: 1,
            // AGREGAR CALLBACK PARA ACTUALIZAR ESTADO
            onVentaCompletada: async (ventaId: string) => {
              try {
                const response = await fetch('/api/citas/actualizar-estado-venta', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    citaId: cita.id,
                    ventaId: ventaId,
                  }),
                });

                if (response.ok) {
                  // Recargar citas para reflejar el cambio
                  await cargarCitas(fechaSeleccionada, true);
                }
              } catch (error) {
                console.error('Error al actualizar estado de cita:', error);
              }
            }
          };

          localStorage.setItem('servicioParaCobro', JSON.stringify(servicioParaCobro));
          
          // Pequeña pausa para asegurar que localStorage se guarde
          await new Promise(resolve => setTimeout(resolve, 100));
          
          router.push('/dashboard/pos?autoAddService=true');
          
          toast.success(`Redirigiendo a cobrar: ${cita.servicio.nombre}`);
          return;
        }
      }

      // Para cualquier otro estado (CONFIRMADA, CANCELADA, etc.)
      const response = await fetch(`/api/citas/${citaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el estado de la cita');
      }

      const citaActualizada = await response.json();
      // RECARGAR CITAS inmediatamente para ver el cambio
      await cargarCitas(fechaSeleccionada, true);
      
      const estadoTexto = {
        'PROGRAMADA': 'Programada',
        'CONFIRMADA': 'Confirmada', 
        'EN_PROCESO': 'En Proceso',
        'COMPLETADA': 'Completada',
        'FACTURADA': 'Facturada',
        'CANCELADA': 'Cancelada',
        'NO_ASISTIO': 'No Asistió'
      }[nuevoEstado] || nuevoEstado;
      
      toast.success(`Cita actualizada a: ${estadoTexto}`);
      
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar el estado de la cita");
    }
  };

const eliminarCita = async (citaId: string) => {
  try {
    const response = await fetch(`/api/citas/${citaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al eliminar la cita');
    }

    // Recargar las citas para reflejar el cambio
    await cargarCitas(fechaSeleccionada, true);
    
    toast.success("Cita eliminada exitosamente");
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    toast.error(error instanceof Error ? error.message : "Error al eliminar la cita");
  }
};

  const handleClienteCreado = (nuevoCliente: Cliente) => {
    setClientes(prev => [nuevoCliente, ...prev]);
  };

  // Efecto para auto-abrir formulario desde URL
  useEffect(() => {
    const nuevaCita = searchParams.get('nuevaCita');
    const clienteIdParam = searchParams.get('clienteId');
    const servicioIdParam = searchParams.get('servicioId');
    
    if (nuevaCita === 'true' && !dialogAbierto && !configCargando && inicializadoRef.current) {
      const timer = setTimeout(() => {
        abrirDialogoNuevaCita();
        
        if (clienteIdParam) {
          const clienteExiste = clientes.find(c => c.id === clienteIdParam);
          if (clienteExiste) {
            setFormData(prev => ({
              ...prev,
              clienteId: clienteIdParam
            }));
          }
        }
        
        if (servicioIdParam) {
          const servicioExiste = servicios.find(s => s.id === servicioIdParam);
          if (servicioExiste) {
            setFormData(prev => ({
              ...prev,
              servicioId: servicioIdParam
            }));
          }
        }
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, dialogAbierto, configCargando, inicializadoRef.current, clientes, servicios]);

  useEffect(() => {
    const servicioParaCobro = localStorage.getItem('servicioParaCobro');
    if (servicioParaCobro && !dialogAbierto) {
      try {
        const servicio = JSON.parse(servicioParaCobro);
        
        // Asegurar que el objeto incluya la información de la cita
        const servicioConCita = {
          ...servicio,
          citaId: servicio.citaId, // Esto es importante para la vinculación
          esDeServicio: true,
          cantidad: 1,
        };
        
        // Aquí deberías agregar el servicio al carrito si estás en la página POS
        // o hacer lo que necesites con el servicio
        
        localStorage.removeItem('servicioParaCobro');
        toast.success(`Servicio "${servicio.nombre}" listo para cobro`);
        
      } catch (error) {
        console.error('Error al cargar servicio:', error);
        localStorage.removeItem('servicioParaCobro');
      }
    }
  }, [dialogAbierto]);
  // Mostrar loading mientras se carga la configuración
  if (configCargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Cargando configuración...</span>
      </div>
    );
  }

  // Mostrar mensaje si no tiene citas habilitadas
  if (!configuracion || !tieneCitas()) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h3 className="text-2xl font-bold mb-2">Sistema de citas no disponible</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            El sistema de citas no está habilitado para tu tipo de negocio.
          </p>
          <Button
            onClick={() => router.push('/dashboard/configuracion-inicial')}
            className={tema.accent}
          >
            <Wrench className="h-4 w-4 mr-2" />
            Configurar Sistema
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Error al cargar las citas</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => cargarCitas(fechaSeleccionada, true)} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Gestión de Citas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Administra las citas y servicios programados
          </p>
        </div>
        <Button 
          size="sm" 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
          onClick={abrirDialogoNuevaCita}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>

      {/* Estadísticas e Historial (ahora envuelve las Tabs para quedar en el medio) */}
      <EstadisticasCitas citas={citas} fechaSeleccionada={fechaSeleccionada}>
        {/* Tabs para cambiar vista */}
        <Tabs value={vistaActual} onValueChange={setVistaActual}>
          <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="lista" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendario" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Calendario
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm cursor-pointer"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cargarCitas(fechaSeleccionada, true)}
                disabled={cargando}
              >
                {cargando ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Actualizando...</span>
                  </span>
                ) : (
                  <span>Actualizar</span>
                )}
              </Button>
            </div>
          </div>

          {/* Vista de Lista */}
          <TabsContent value="lista" className="mt-0">
            <ListaCitas
              citas={citas}
              cargando={cargando}
              fechaSeleccionada={fechaSeleccionada}
              onEditarCita={abrirDialogoEditarCita}
              onEliminarCita={eliminarCita}
              onActualizarEstado={actualizarEstadoCita}
              router={router}
              session={session}
            />
          </TabsContent>

          {/* Vista de Calendario */}
          <TabsContent value="calendario" className="mt-0">
            <CalendarioCitas
              citas={citas}
              fechaSeleccionada={fechaSeleccionada}
              onFechaChange={setFechaSeleccionada}
            />
          </TabsContent>
        </Tabs>
      </EstadisticasCitas>

      {/* Formulario de cita */}
      <FormularioCita
        open={dialogAbierto}
        onOpenChange={setDialogAbierto}
        citaEditando={citaEditando}
        formData={formData}
        setFormData={setFormData}
        clientes={clientes}
        servicios={servicios}
        empleados={empleados}
        onSubmit={citaEditando ? actualizarCita : crearCita}
        enviando={enviando}
        tema={tema}
        onClienteCreado={handleClienteCreado}
      />

      {/* Información de ayuda si no hay datos */}
      {citas.length === 0 && !cargando && clientes.length === 0 && (
        <Card className="border-dashed border-2 border-border mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground/70 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Necesitas clientes y servicios</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Para crear citas, primero necesitas tener clientes y servicios registrados.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/clientes/nuevo')}
                  className="hover:bg-blue-500/10 hover:border-blue-500/40"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Cliente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/servicios')}
                  className="hover:bg-emerald-500/10 hover:border-green-500/40"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Servicio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}