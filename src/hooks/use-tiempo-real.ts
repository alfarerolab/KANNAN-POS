// src/hooks/use-tiempo-real.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { servicioTiempoReal } from '@/lib/api-service';

interface VentaReciente {
  id: string;
  total: number;
  fecha: string;
  usuario: string;
  cliente: string;
  productos: Array<{
    nombre: string;
    cantidad: number;
    precio: number;
  }>;
  metodoPago: string;
  tipo: 'producto' | 'servicio' | 'mixta';
}

interface MetricasTiempoReal {
  ventasUltimos30Min: number;
  ventasUltimaHora: number;
  ventasHoy: number;
  usuariosActivos: number;
  tendenciaVentas: number;
  ingresosPorHora: Array<{
    hora: number;
    ventas: number;
    ingresos: number;
  }>;
}

interface EstadoSistema {
  conectado: boolean;
  ultimaActualizacion: string;
  rendimiento: number;
}

interface AlertaTiempoReal {
  id: string;
  tipo: 'critica' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  timestamp: string;
  datos?: any;
}

interface DatosTiempoReal {
  timestamp: string;
  metricas: MetricasTiempoReal;
  ventasRecientes: VentaReciente[];
  productosTop: Array<{
    productoId: string;
    _sum: { cantidad: number };
  }>;
  estadoSistema: EstadoSistema;
  alertas: AlertaTiempoReal[];
}

interface ConfiguracionTiempoReal {
  intervaloActualizacion: number; // en milisegundos
  autoRefresh: boolean;
  mostrarNotificaciones: boolean;
  sonidosActivados: boolean;
}

export const useTiempoReal = (configuracion: Partial<ConfiguracionTiempoReal> = {}) => {
  const [datos, setDatos] = useState<DatosTiempoReal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ventasAnteriores = useRef<string[]>([]);

  const config: ConfiguracionTiempoReal = {
    intervaloActualizacion: 30000, // 30 segundos por defecto
    autoRefresh: true,
    mostrarNotificaciones: true,
    sonidosActivados: false,
    ...configuracion
  };

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const nuevosDatos: DatosTiempoReal = await servicioTiempoReal.obtenerDatosTiempoReal();
      
      // Detectar nuevas ventas
      if (datos && config.mostrarNotificaciones) {
        const ventasActuales = nuevosDatos.ventasRecientes.map(v => v.id);
        const nuevasVentas = ventasActuales.filter(id => !ventasAnteriores.current.includes(id));
        
        if (nuevasVentas.length > 0 && ventasAnteriores.current.length > 0) {
          toast.success(`${nuevasVentas.length} nueva${nuevasVentas.length > 1 ? 's' : ''} venta${nuevasVentas.length > 1 ? 's' : ''}`);
          
          if (config.sonidosActivados) {
            // Reproducir sonido de notificacion
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
              // Silenciar errores de audio
            });
          }
        }
        
        ventasAnteriores.current = ventasActuales;
      }
      
      setDatos(nuevosDatos);
      setConectado(true);
      setError(null);
      
    } catch (err) {
      console.error('Error cargando datos tiempo real:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setConectado(false);
      
      if (config.mostrarNotificaciones) {
        toast.error('Error de conexion con el servidor');
      }
    } finally {
      setLoading(false);
    }
  }, [datos, config]);

  const iniciarActualizacionAutomatica = useCallback(() => {
    if (!config.autoRefresh) return;
    
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Configurar nuevo intervalo
    intervalRef.current = setInterval(cargarDatos, config.intervaloActualizacion);
  }, [cargarDatos, config]);

  const detenerActualizacionAutomatica = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const registrarActividad = useCallback(async (accion: string, detalles: any = {}) => {
    try {
      await servicioTiempoReal.registrarActividad(accion, detalles);
    } catch (err) {
      console.error('Error registrando actividad:', err);
    }
  }, []);

  const actualizarManual = useCallback(async () => {
    await cargarDatos();
  }, [cargarDatos]);

  const cambiarConfiguracion = useCallback((nuevaConfig: Partial<ConfiguracionTiempoReal>) => {
    Object.assign(config, nuevaConfig);
    
    if (config.autoRefresh) {
      iniciarActualizacionAutomatica();
    } else {
      detenerActualizacionAutomatica();
    }

    // Guardar configuracion en localStorage
    try {
      localStorage.setItem('tiempo-real-config', JSON.stringify(config));
    } catch (err) {
    }
  }, [iniciarActualizacionAutomatica, detenerActualizacionAutomatica]);

  // Cargar configuracion guardada
  useEffect(() => {
    try {
      const configGuardada = localStorage.getItem('tiempo-real-config');
      if (configGuardada) {
        const configParseada = JSON.parse(configGuardada);
        Object.assign(config, configParseada);
      }
    } catch (err) {
    }
  }, []);

  // Efectos
  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (config.autoRefresh && !loading) {
      iniciarActualizacionAutomatica();
    }
    
    return () => {
      detenerActualizacionAutomatica();
    };
  }, [iniciarActualizacionAutomatica, detenerActualizacionAutomatica, loading, config.autoRefresh]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      detenerActualizacionAutomatica();
    };
  }, [detenerActualizacionAutomatica]);

  // Funciones de utilidad
  const formatearMoneda = useCallback((cantidad?: number) => {
    if (cantidad == null || isNaN(cantidad)) return "--";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cantidad);
  }, []);

  const calcularTendencia = useCallback((valorActual: number, valorAnterior: number) => {
    if (valorAnterior === 0) return valorActual > 0 ? 100 : 0;
    return ((valorActual - valorAnterior) / valorAnterior) * 100;
  }, []);

  const obtenerColorTendencia = useCallback((tendencia: number) => {
    if (tendencia > 0) return 'text-green-600';
    if (tendencia < 0) return 'text-red-600';
    return 'text-gray-600';
  }, []);

  // Funciones adicionales para metricas
  const obtenerMetricas = useCallback(async (filtros?: {
    fechaInicio?: string;
    fechaFin?: string;
    incluirAlertas?: boolean;
  }) => {
    try {
      return await servicioTiempoReal.obtenerMetricas(filtros);
    } catch (err) {
      console.error('Error obteniendo metricas:', err);
      throw err;
    }
  }, []);

  const obtenerEstadoSistema = useCallback(async () => {
    try {
      return await servicioTiempoReal.obtenerEstadoSistema();
    } catch (err) {
      console.error('Error obteniendo estado del sistema:', err);
      throw err;
    }
  }, []);

  const configurarNotificaciones = useCallback(async (configuracionNotif: {
    alertasStock?: boolean;
    alertasVentas?: boolean;
    alertasSistema?: boolean;
    intervaloActualizacion?: number;
  }) => {
    try {
      return await servicioTiempoReal.configurarNotificaciones(configuracionNotif);
    } catch (err) {
      console.error('Error configurando notificaciones:', err);
      throw err;
    }
  }, []);

  return {
    // Datos
    datos,
    loading,
    error,
    conectado,
    
    // Acciones
    cargarDatos,
    actualizarManual,
    registrarActividad,
    cambiarConfiguracion,
    iniciarActualizacionAutomatica,
    detenerActualizacionAutomatica,
    obtenerMetricas,
    obtenerEstadoSistema,
    configurarNotificaciones,
    
    // Utilidades
    formatearMoneda,
    calcularTendencia,
    obtenerColorTendencia,
    
    // Estado de configuracion
    configuracion: config
  };
};