// hooks/use-suscripciones.ts

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { 
  DatosSuscripciones, 
  SuscripcionInfo, 
  MetricasCalculadas,
  RenovacionRequest,
  EstadisticasSuscripciones 
} from '../types/suscripciones';

interface FiltrosSuscripciones {
  searchTerm: string;
  filtroEstado: string;
  filtroTipoNegocio: string;
}

interface UseSuscripcionesReturn {
  datos: DatosSuscripciones;
  isLoading: boolean;
  error: string | null;
  filtros: FiltrosSuscripciones;
  suscripcionesFiltradas: SuscripcionInfo[];
  metricas: MetricasCalculadas;
  tiposNegocio: string[];
  cargarSuscripciones: () => Promise<void>;
  renovarSuscripcion: (id: string, meses: number) => Promise<boolean>;
  setSearchTerm: (term: string) => void;
  setFiltroEstado: (estado: string) => void;
  setFiltroTipoNegocio: (tipo: string) => void;
  limpiarFiltros: () => void;
}

const DATOS_INICIALES: DatosSuscripciones = {
  suscripciones: [],
  estadisticas: {
    totalSuscripciones: 0,
    suscripcionesActivas: 0,
    porVencer: 0,
    vencidas: 0,
    ingresosMensuales: 0
  }
};

const FILTROS_INICIALES: FiltrosSuscripciones = {
  searchTerm: '',
  filtroEstado: 'todos',
  filtroTipoNegocio: 'todos'
};

export function useSuscripciones(): UseSuscripcionesReturn {
  const { toast } = useToast();
  const [datos, setDatos] = useState<DatosSuscripciones>(DATOS_INICIALES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosSuscripciones>(FILTROS_INICIALES);

  // Cargar suscripciones desde la API
  const cargarSuscripciones = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/superadmin/suscripciones');
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: DatosSuscripciones = await response.json();
      setDatos(data);
      
      toast({
        title: "✅ Datos actualizados",
        description: "Las suscripciones han sido cargadas exitosamente",
      });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      setError(mensaje);
      
      console.error('Error al cargar suscripciones:', err);
      toast({
        title: "❌ Error al cargar datos",
        description: mensaje,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Renovar suscripción
  const renovarSuscripcion = useCallback(async (id: string, meses: number): Promise<boolean> => {
    try {
      const request: RenovacionRequest = { meses };
      
      const response = await fetch(`/api/superadmin/suscripciones/${id}/renovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al renovar suscripción');
      }

      const resultado = await response.json();
      
      toast({
        title: "✅ Suscripción renovada",
        description: `La suscripción ha sido renovada por ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
      });

      // Recargar datos después de renovar
      await cargarSuscripciones();
      return true;

    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      
      console.error('Error al renovar suscripción:', err);
      toast({
        title: "❌ Error al renovar",
        description: mensaje,
        variant: "destructive"
      });
      
      return false;
    }
  }, [toast, cargarSuscripciones]);

  // Filtrar suscripciones
  const suscripcionesFiltradas = useMemo(() => {
    return datos.suscripciones.filter(suscripcion => {
      const matchesSearch = suscripcion.nombre.toLowerCase().includes(filtros.searchTerm.toLowerCase()) ||
                           suscripcion.email.toLowerCase().includes(filtros.searchTerm.toLowerCase());
      
      const matchesEstado = filtros.filtroEstado === 'todos' || suscripcion.estado === filtros.filtroEstado;
      
      const matchesTipoNegocio = filtros.filtroTipoNegocio === 'todos' || 
                                suscripcion.tipoNegocio === filtros.filtroTipoNegocio;

      return matchesSearch && matchesEstado && matchesTipoNegocio;
    });
  }, [datos.suscripciones, filtros]);

  // Calcular métricas
  const metricas = useMemo((): MetricasCalculadas => {
    const { estadisticas } = datos;
    const mrr = estadisticas.ingresosMensuales;
    const arr = mrr * 12;
    const churnRate = estadisticas.totalSuscripciones > 0 
      ? Math.round((estadisticas.vencidas / estadisticas.totalSuscripciones) * 100 * 100) / 100 
      : 0;
    
    // Calcular tasa de crecimiento (esto podría ser más sofisticado con datos históricos)
    const tasaCrecimiento = estadisticas.suscripcionesActivas > 0 ? 
      Math.round((estadisticas.suscripcionesActivas / estadisticas.totalSuscripciones) * 100 * 100) / 100 : 0;
    
    return {
      ...estadisticas,
      mrr,
      arr,
      churnRate,
      tasaCrecimiento
    };
  }, [datos.estadisticas]);

  // Obtener tipos de negocio únicos
  const tiposNegocio = useMemo(() => 
    [...new Set(datos.suscripciones.map(s => s.tipoNegocio).filter(Boolean))], 
    [datos.suscripciones]
  );

  // Funciones para actualizar filtros
  const setSearchTerm = useCallback((term: string) => {
    setFiltros(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setFiltroEstado = useCallback((estado: string) => {
    setFiltros(prev => ({ ...prev, filtroEstado: estado }));
  }, []);

  const setFiltroTipoNegocio = useCallback((tipo: string) => {
    setFiltros(prev => ({ ...prev, filtroTipoNegocio: tipo }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
  }, []);

  return {
    datos,
    isLoading,
    error,
    filtros,
    suscripcionesFiltradas,
    metricas,
    tiposNegocio,
    cargarSuscripciones,
    renovarSuscripcion,
    setSearchTerm,
    setFiltroEstado,
    setFiltroTipoNegocio,
    limpiarFiltros
  };
}

// Hook adicional para estadísticas y gráficos
export function useEstadisticasSuscripciones(suscripciones: SuscripcionInfo[]) {
  return useMemo(() => {
    // Datos para gráfico de estados
    const datosGraficoEstados = [
      { 
        name: 'Activas', 
        value: suscripciones.filter(s => s.estado === 'activa').length, 
        color: '#10b981' 
      },
      { 
        name: 'Por Vencer', 
        value: suscripciones.filter(s => s.estado === 'por_vencer').length, 
        color: '#f59e0b' 
      },
      { 
        name: 'Vencidas', 
        value: suscripciones.filter(s => s.estado === 'vencida' || s.estado === 'suspendida').length, 
        color: '#ef4444' 
      }
    ];

    // Datos para gráfico de tipos de negocio
    const gruposPorTipo = suscripciones.reduce((acc, s) => {
      if (s.activa) {
        acc[s.tipoNegocio] = (acc[s.tipoNegocio] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const datosGraficoTipoNegocio = Object.entries(gruposPorTipo).map(([tipo, cantidad]) => ({
      name: tipo || 'Sin especificar',
      value: cantidad
    }));

    // Datos para gráfico de ingresos
    const ingresosPorTipo = suscripciones.reduce((acc, s) => {
      if (s.activa) {
        const tipo = s.tipoNegocio || 'Sin especificar';
        acc[tipo] = (acc[tipo] || 0) + s.montoMensual;
      }
      return acc;
    }, {} as Record<string, number>);

    const datosGraficoIngresos = Object.entries(ingresosPorTipo).map(([tipo, ingresos]) => ({
      name: tipo,
      ingresos: Math.round(ingresos * 100) / 100
    }));

    // Tendencia de vencimientos (próximos 6 meses)
    const proximosVencimientos = [];
    for (let i = 0; i < 6; i++) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() + i);
      const mesAnio = fecha.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      
      const vencenEseMes = suscripciones.filter(s => {
        if (!s.fechaVencimiento) return false;
        const vencimiento = new Date(s.fechaVencimiento);
        return vencimiento.getMonth() === fecha.getMonth() && 
               vencimiento.getFullYear() === fecha.getFullYear();
      }).length;

      proximosVencimientos.push({
        mes: mesAnio,
        vencimientos: vencenEseMes
      });
    }

    return {
      datosGraficoEstados,
      datosGraficoTipoNegocio,
      datosGraficoIngresos,
      proximosVencimientos
    };
  }, [suscripciones]);
}