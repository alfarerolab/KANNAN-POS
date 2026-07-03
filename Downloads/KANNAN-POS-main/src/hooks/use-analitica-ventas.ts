import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { servicioMetas } from '@/lib/api-service';

// ✅ EXPORTAR TODAS LAS INTERFACES
export interface FiltrosAnalisis {
  tipo: 'general' | 'tendencias' | 'productos' | 'vendedores' | 'metodos-pago' | 'comparativo';
  periodo: 'dia' | 'semana' | 'mes' | 'año';
  fechaInicio?: string;
  fechaFin?: string;
}

export interface EstadisticasRapidas {
  hoy: {
    ventas: number;
    ingresos: number;
  };
  semana: {
    ventas: number;
    ingresos: number;
  };
  mes: {
    ventas: number;
    ingresos: number;
  };
}

export interface EstadisticasGenerales {
  resumen: {
    totalVentas: number;
    ingresosTotales: number;
    ticketPromedio: number;
    totalDescuentos: number;
    totalImpuestos: number;
  };
  ventasHoy: {
    cantidad: number;
    ingresos: number;
    crecimientoVentas: number;
    crecimientoIngresos: number;
  };
  ventasPorEstado: Array<{
    estado: string;
    cantidad: number;
    ingresos: number;
  }>;
  topClientes: Array<{
    id: string;
    nombre: string;
    email?: string;
    cantidadVentas: number;
    totalCompras: number;
  }>;
}

export interface TendenciasVentas {
  tendencias: Array<{
    fecha: Date;
    cantidad: number;
    ingresos: number;
    promedio: number;
  }>;
  periodo: string;
}

export interface AnalisisProductos {
  topProductosCantidad: Array<{
    id: string;
    nombre: string;
    codigo?: string;
    precio: number;
    categoria?: { nombre: string };
    cantidadVendida: number;
    ingresosTotales: number;
    numeroVentas: number;
    promedioVenta: number;
  }>;
  topProductosIngresos: Array<any>;
  ventasPorCategoria: Array<{
    categoria: string;
    cantidad: number;
    ingresos: number;
    productos: number;
    promedioTicket: number;
  }>;
}

export interface AnalisisVendedores {
  vendedores: Array<{
    id: string;
    nombre: string;
    email?: string;
    totalVentas: number;
    ingresosTotales: number;
    ticketPromedio: number;
    ventasCompletadas: number;
    tasaConversion: number;
  }>;
}

export interface AnalisisMetodosPago {
  metodosPago: Array<{
    metodo: string;
    cantidad: number;
    ingresos: number;
    ticketPromedio: number;
    porcentajeVentas: string;
    porcentajeIngresos: string;
  }>;
}

export interface AnalisisComparativo {
  comparativo: {
    ventasActuales: number;
    ventasAnteriores: number;
    crecimientoVentas: number;
    ingresosActuales: number;
    ingresosAnteriores: number;
    crecimientoIngresos: number;
    ticketPromedioActual: number;
    ticketPromedioAnterior: number;
    crecimientoTicketPromedio: number;
  };
  periodo: string;
}

export type DatosAnalisis = EstadisticasGenerales | TendenciasVentas | AnalisisProductos | 
                   AnalisisVendedores | AnalisisMetodosPago | AnalisisComparativo;

export interface UseAnalisisVentasReturn {
  datos: DatosAnalisis | null;
  loading: boolean;
  error: string | null;
  cargarAnalisis: (filtros: FiltrosAnalisis) => Promise<void>;
  actualizarFiltros: (nuevosFiltros: Partial<FiltrosAnalisis>) => void;
  filtrosActuales: FiltrosAnalisis;
  exportarDatos: (formato: 'json' | 'csv') => void;
}

export const esTendenciasVentas = (datos: any): datos is TendenciasVentas => {
  return datos && "tendencias" in datos && Array.isArray(datos.tendencias);
};

export const esEstadisticasGenerales = (datos: any): datos is EstadisticasGenerales => {
  return datos && "resumen" in datos && "ventasPorEstado" in datos;
};

export const esAnalisisComparativo = (datos: any): datos is AnalisisComparativo => {
  return datos && "comparativo" in datos;
};

export function useAnalisisVentas(): UseAnalisisVentasReturn {
  const { data: session } = useSession();
  const [datos, setDatos] = useState<DatosAnalisis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtrosActuales, setFiltrosActuales] = useState<FiltrosAnalisis>({
    tipo: 'general',
    periodo: 'mes',
  });

  const cargarAnalisis = useCallback(async (filtros: FiltrosAnalisis) => {
    if (!session?.user?.empresaId) {
      setError("No hay sesión válida");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tipo: filtros.tipo,
        periodo: filtros.periodo,
      });

      if (filtros.fechaInicio) {
        params.append('fechaInicio', filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        params.append('fechaFin', filtros.fechaFin);
      }

      const response = await fetch(`/api/ventas/analytics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No tienes autorización para ver estos datos");
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const datosAnalisis = await response.json();
      setDatos(datosAnalisis);
      setFiltrosActuales(filtros);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('Error al cargar análisis:', err);
      toast.error("Error al cargar los análisis de ventas");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.empresaId]);

  const actualizarFiltros = useCallback((nuevosFiltros: Partial<FiltrosAnalisis>) => {
    const filtrosActualizados = { ...filtrosActuales, ...nuevosFiltros };
    cargarAnalisis(filtrosActualizados);
  }, [cargarAnalisis, filtrosActuales]);

  const exportarDatos = useCallback((formato: 'json' | 'csv') => {
    if (!datos) {
      toast.error("No hay datos para exportar");
      return;
    }

    try {
      let contenido: string;
      let tipoMime: string;
      let extension: string;

      if (formato === 'json') {
        contenido = JSON.stringify(datos, null, 2);
        tipoMime = 'application/json';
        extension = 'json';
      } else {
        contenido = convertirACSV(datos);
        tipoMime = 'text/csv';
        extension = 'csv';
      }

      const blob = new Blob([contenido], { type: tipoMime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `analisis-ventas-${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Datos exportados en formato ${formato.toUpperCase()}`);
    } catch (err) {
      console.error('Error al exportar datos:', err);
      toast.error("Error al exportar los datos");
    }
  }, [datos]);

  useEffect(() => {
    if (session?.user?.empresaId) {
      cargarAnalisis(filtrosActuales);
    }
  }, [session?.user?.empresaId]);

  return {
    datos,
    loading,
    error,
    cargarAnalisis,
    actualizarFiltros,
    filtrosActuales,
    exportarDatos,
  };
}

function convertirACSV(datos: DatosAnalisis): string {
  const lineas: string[] = [];

  if (esEstadisticasGenerales(datos)) {
    lineas.push(`Total Ventas,${datos.resumen.totalVentas}`);
  } else if (esTendenciasVentas(datos)) {
    datos.tendencias.forEach(item => lineas.push(`${item.fecha},${item.cantidad}`));
  } else if (esAnalisisComparativo(datos)) {
    lineas.push(`Ventas actuales,${datos.comparativo.ventasActuales}`);
  }

  return lineas.join("\n");
}

export function useEstadisticasRapidas() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargarEstadisticasRapidas = useCallback(async () => {
    if (!session?.user?.empresaId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/ventas/analytics?tipo=general&quick=true');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas rápidas:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.empresaId]);

  useEffect(() => {
    cargarEstadisticasRapidas();
    const interval = setInterval(cargarEstadisticasRapidas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cargarEstadisticasRapidas]);

  return {
    stats,
    loading,
    refresh: cargarEstadisticasRapidas,
  };
}

export function useNotificacionesVentas() {
  const [notificaciones, setNotificaciones] = useState<Array<{
    id: string;
    tipo: 'nueva_venta' | 'meta_alcanzada' | 'venta_pendiente' | 'alerta_inventario';
    mensaje: string;
    timestamp: Date;
    leida: boolean;
  }>>([]);

  const agregarNotificacion = useCallback((notificacion: any) => {
    setNotificaciones(prev => [
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        leida: false,
        ...notificacion,
      },
      ...prev.slice(0, 9)
    ]);
  }, []);

  const marcarComoLeida = useCallback((id: string) => {
    setNotificaciones(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, leida: true } : notif
      )
    );
  }, []);

  const limpiarNotificaciones = useCallback(() => {
    setNotificaciones([]);
  }, []);

  return {
    notificaciones,
    agregarNotificacion,
    marcarComoLeida,
    limpiarNotificaciones,
    sinLeer: notificaciones.filter(n => !n.leida).length,
  };
}

export function useMetricasComparativas(periodo: 'dia' | 'semana' | 'mes' = 'mes') {
  const { data: session } = useSession();
  const [metricas, setMetricas] = useState<{
    actual: any;
    anterior: any;
    comparacion: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const cargarMetricas = useCallback(async () => {
    if (!session?.user?.empresaId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/ventas/analytics?tipo=comparativo&periodo=${periodo}`);
      
      if (response.ok) {
        const data = await response.json();
        setMetricas(data);
      }
    } catch (error) {
      console.error('Error al cargar métricas comparativas:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.empresaId, periodo]);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  return {
    metricas,
    loading,
    refresh: cargarMetricas,
  };
}

export function usePronosticoVentas() {
  const { data: session } = useSession();
  const [predicciones, setPredicciones] = useState<{
    ventasProyectadas: number;
    ingresosProyectados: number;
    tendencia: 'ascendente' | 'descendente' | 'estable';
    confianza: number;
    factores: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const calcularPredicciones = useCallback(async () => {
    if (!session?.user?.empresaId) return;

    try {
      setLoading(true);
      const response = await fetch('/api/ventas/analytics?tipo=tendencias&periodo=mes');
      
      if (response.ok) {
        const data = await response.json();
        const tendencias = data.tendencias || [];
        
        if (tendencias.length >= 3) {
          const ultimosTresMeses = tendencias.slice(-3);
          const promedioVentas = ultimosTresMeses.reduce((acc: number, item: any) => acc + item.cantidad, 0) / 3;
          const promedioIngresos = ultimosTresMeses.reduce((acc: number, item: any) => acc + item.ingresos, 0) / 3;
          
          const primerMes = ultimosTresMeses[0];
          const ultimoMes = ultimosTresMeses[ultimosTresMeses.length - 1];
          const cambio = ((ultimoMes.ingresos - primerMes.ingresos) / primerMes.ingresos) * 100;
          
          let tendencia: 'ascendente' | 'descendente' | 'estable' = 'estable';
          if (cambio > 5) tendencia = 'ascendente';
          else if (cambio < -5) tendencia = 'descendente';
          
          const factor = tendencia === 'ascendente' ? 1.1 : tendencia === 'descendente' ? 0.9 : 1;
          
          setPredicciones({
            ventasProyectadas: Math.round(promedioVentas * factor),
            ingresosProyectados: promedioIngresos * factor,
            tendencia,
            confianza: Math.min(90, Math.max(60, 90 - Math.abs(cambio))),
            factores: [
              `Tendencia ${tendencia} basada en últimos 3 meses`,
              `Cambio promedio: ${cambio.toFixed(1)}%`,
              tendencias.length > 6 ? 'Suficientes datos históricos' : 'Datos históricos limitados'
            ]
          });
        }
      }
    } catch (error) {
      console.error('Error al calcular predicciones:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.empresaId]);

  useEffect(() => {
    calcularPredicciones();
  }, [calcularPredicciones]);

  return {
    predicciones,
    loading,
    recalcular: calcularPredicciones,
  };
}

export function useAlertasVentas() {
  const [alertas, setAlertas] = useState<Array<{
    id: string;
    tipo: 'critica' | 'advertencia' | 'info';
    titulo: string;
    descripcion: string;
    timestamp: Date;
    accion?: string;
  }>>([]);

  const verificarAlertas = useCallback(async () => {
    try {
      const response = await fetch('/api/ventas/alertas');
      if (response.ok) {
        const alertasNuevas = await response.json();
        setAlertas(alertasNuevas);
      }
    } catch (error) {
      console.error('Error al verificar alertas:', error);
    }
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlertas(prev => prev.filter(alerta => alerta.id !== id));
  }, []);

  useEffect(() => {
    verificarAlertas();
    const interval = setInterval(verificarAlertas, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [verificarAlertas]);

  return {
    alertas,
    alertasCriticas: alertas.filter(a => a.tipo === 'critica'),
    alertasAdvertencia: alertas.filter(a => a.tipo === 'advertencia'),
    dismissAlert,
    refresh: verificarAlertas,
  };
}

export const useMetasDeVentas = () => {
  const [metas, setMetas] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarMetas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await servicioMetas.obtenerMetas();
      
      if (response.success && response.metas) {
        const metasFormateadas = response.metas.reduce((acc: any, meta: any) => {
          acc[meta.periodo] = {
            objetivo: meta.objetivo,
            actual: meta.actual || 0,
            progreso: meta.progreso || 0,
            estado: meta.estado || 'PENDIENTE',
            falta: meta.falta || 0
          };
          return acc;
        }, {});
        
        setMetas(metasFormateadas);
      } else {
        setMetas({});
      }
    } catch (error) {
      console.error('Error al cargar metas:', error);
      setError('Error al cargar las metas de ventas');
      setMetas({});
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    cargarMetas();
  };

  useEffect(() => {
    cargarMetas();
  }, []);

  return {
    metas,
    loading,
    error,
    refresh
  };
};

export const useConfiguracionMetasRapida = () => {
  const [configurando, setConfigurando] = useState(false);

  const configurarMetasRapidas = async (metasData: {
    diaria?: number;
    semanal?: number;
    mensual?: number;
  }) => {
    try {
      setConfigurando(true);
      
      const configuraciones = Object.entries(metasData)
        .filter(([_, valor]) => valor && valor > 0)
        .map(([periodo, objetivo]) => ({
          periodo: periodo as 'diaria' | 'semanal' | 'mensual',
          objetivo: objetivo as number,
          tipo: 'ingresos' as const,
          activa: true
        }));

      if (configuraciones.length > 0) {
        const response = await servicioMetas.configurarMetasMultiples(configuraciones);
        return response;
      } else {
        throw new Error('No se proporcionaron metas válidas');
      }
    } catch (error) {
      console.error('Error al configurar metas rápidas:', error);
      throw error;
    } finally {
      setConfigurando(false);
    }
  };

  return {
    configurarMetasRapidas,
    configurando
  };
};

export const useAlertasMetas = () => {
  const [alertas, setAlertas] = useState<Array<{
    id: string;
    tipo: 'critica' | 'advertencia' | 'info';
    titulo: string;
    descripcion: string;
    periodo: string;
    progreso: number;
  }>>([]);

  const evaluarAlertas = (metas: any) => {
    const nuevasAlertas: any[] = [];

    Object.entries(metas || {}).forEach(([periodo, meta]: [string, any]) => {
      const progreso = meta.progreso || 0;

      if (progreso < 30 && esFinalDePeriodo(periodo)) {
        nuevasAlertas.push({
          id: `${periodo}_critica`,
          tipo: 'critica',
          titulo: `Meta ${periodo} en riesgo`,
          descripcion: `Solo tienes ${progreso.toFixed(1)}% de progreso en tu meta ${periodo}`,
          periodo,
          progreso
        });
      } else if (progreso < 50 && esMitadDePeriodo(periodo)) {
        nuevasAlertas.push({
          id: `${periodo}_advertencia`,
          tipo: 'advertencia',
          titulo: `Progreso lento en meta ${periodo}`,
          descripcion: `Llevas ${progreso.toFixed(1)}% de tu objetivo, considera revisar tu estrategia`,
          periodo,
          progreso
        });
      } else if (progreso >= 100) {
        nuevasAlertas.push({
          id: `${periodo}_completada`,
          tipo: 'info',
          titulo: `¡Meta ${periodo} completada!`,
          descripcion: `Has alcanzado el ${progreso.toFixed(1)}% de tu objetivo`,
          periodo,
          progreso
        });
      } else if (progreso >= 80) {
        nuevasAlertas.push({
          id: `${periodo}_buen_progreso`,
          tipo: 'info',
          titulo: `Excelente progreso en meta ${periodo}`,
          descripcion: `Vas por el ${progreso.toFixed(1)}% de tu objetivo`,
          periodo,
          progreso
        });
      }
    });

    setAlertas(nuevasAlertas);
    return nuevasAlertas;
  };

  return {
    alertas,
    evaluarAlertas
  };
};

function esFinalDePeriodo(periodo: string): boolean {
  const ahora = new Date();
  const dia = ahora.getDate();
  const diaSemana = ahora.getDay();
  
  switch (periodo) {
    case 'diaria':
      return ahora.getHours() >= 18;
    case 'semanal':
      return diaSemana >= 5;
    case 'mensual':
      return dia >= 25;
    default:
      return false;
  }
}

function esMitadDePeriodo(periodo: string): boolean {
  const ahora = new Date();
  const dia = ahora.getDate();
  const diaSemana = ahora.getDay();
  
  switch (periodo) {
    case 'diaria':
      return ahora.getHours() >= 12;
    case 'semanal':
      return diaSemana >= 3;
    case 'mensual':
      return dia >= 15;
    default:
      return false;
  }
}

export const useGestionMetas = () => {
  const { metas, loading: loadingMetas, refresh: refreshMetas } = useMetasDeVentas();
  const { configurarMetasRapidas, configurando } = useConfiguracionMetasRapida();
  const { alertas, evaluarAlertas } = useAlertasMetas();

  useEffect(() => {
    if (metas) {
      evaluarAlertas(metas);
    }
  }, [metas]);

  return {
    metas,
    alertas,
    loading: loadingMetas || configurando,
    refreshMetas,
    configurarMetasRapidas,
    tieneMetas: metas && Object.keys(metas).length > 0,
    metasCompletadas: metas ? Object.values(metas).filter((meta: any) => meta.progreso >= 100).length : 0,
    progresoPromedio: metas ? 
      Object.values(metas).reduce((acc: number, meta: any) => acc + (meta.progreso || 0), 0) / 
      Object.keys(metas).length : 0
  };
};