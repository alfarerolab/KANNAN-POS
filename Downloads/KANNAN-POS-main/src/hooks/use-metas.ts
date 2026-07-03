import { useState, useEffect } from 'react';
import { servicioMetas } from '@/lib/api-service';
import { toast } from 'sonner';

interface Meta {
  id: string;
  empresaId: string;
  periodo: 'diaria' | 'semanal' | 'mensual';
  objetivo: number;
  actual?: number;
  progreso?: number;
  falta?: number;
  estado?: 'COMPLETADA' | 'EN_PROGRESO' | 'PENDIENTE';
  createdAt: string;
  updatedAt: string;
  detalles?: {
    cantidadVentas?: number;
    fechaInicio?: string;
    fechaFin?: string;
  };
}

interface ConfiguracionMeta {
  periodo: 'diaria' | 'semanal' | 'mensual';
  objetivo: number;
  tipo?: 'ingresos' | 'ventas';
  activa?: boolean;
}

export const useMetas = () => {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar todas las metas
  const cargarMetas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await servicioMetas.obtenerMetas();
      
      if (response.success && Array.isArray(response.metas)) {
        setMetas(response.metas);
      } else {
        setMetas([]);
      }
    } catch (error) {
      console.error('Error al cargar metas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al cargar las metas');
      setMetas([]);
    } finally {
      setLoading(false);
    }
  };

  // Configurar nueva meta o actualizar existente
  const configurarMeta = async (configuracion: ConfiguracionMeta) => {
    try {
      setLoading(true);
      
      const response = await servicioMetas.configurarMeta(configuracion);
      
      if (response.success) {
        toast.success('Meta configurada correctamente');
        await cargarMetas(); // Recargar las metas
        return response.meta;
      } else {
        throw new Error('Error al configurar la meta');
      }
    } catch (error) {
      console.error('Error al configurar meta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al configurar la meta');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar meta existente
  const actualizarMeta = async (periodo: string, datos: Partial<ConfiguracionMeta>) => {
    try {
      setLoading(true);
      
      const response = await servicioMetas.actualizarMeta(periodo, datos);
      
      if (response.success) {
        toast.success('Meta actualizada correctamente');
        await cargarMetas();
        return response.meta;
      } else {
        throw new Error('Error al actualizar la meta');
      }
    } catch (error) {
      console.error('Error al actualizar meta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al actualizar la meta');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Eliminar meta
  const eliminarMeta = async (periodo: string) => {
    try {
      setLoading(true);
      
      const response = await servicioMetas.eliminarMeta(periodo);
      
      if (response.success) {
        toast.success('Meta eliminada correctamente');
        await cargarMetas();
        return true;
      } else {
        throw new Error('Error al eliminar la meta');
      }
    } catch (error) {
      console.error('Error al eliminar meta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al eliminar la meta');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Obtener meta por período
  const obtenerMetaPorPeriodo = async (periodo: 'diaria' | 'semanal' | 'mensual') => {
    try {
      const response = await servicioMetas.obtenerMetaPorPeriodo(periodo);
      
      if (response.success) {
        return response.meta;
      } else {
        throw new Error('Error al obtener la meta');
      }
    } catch (error) {
      console.error('Error al obtener meta por período:', error);
      return null;
    }
  };

  // Configurar múltiples metas a la vez
  const configurarMetasMultiples = async (configuraciones: ConfiguracionMeta[]) => {
    try {
      setLoading(true);
      
      const response = await servicioMetas.configurarMetasMultiples(configuraciones);
      
      if (response.success) {
        toast.success('Metas configuradas correctamente');
        await cargarMetas();
        return response.metas;
      } else {
        throw new Error('Error al configurar las metas');
      }
    } catch (error) {
      console.error('Error al configurar metas múltiples:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error('Error al configurar las metas');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Obtener progreso de metas
  const obtenerProgreso = async (fechaInicio?: string, fechaFin?: string) => {
    try {
      const response = await servicioMetas.obtenerProgresoMetas(fechaInicio, fechaFin);
      
      if (response.success) {
        return response.progreso;
      } else {
        throw new Error('Error al obtener el progreso');
      }
    } catch (error) {
      console.error('Error al obtener progreso:', error);
      return null;
    }
  };

  // Cargar metas al montar el componente
  useEffect(() => {
    cargarMetas();
  }, []);

  // Funciones de utilidad
  const obtenerMetaPorTipo = (periodo: 'diaria' | 'semanal' | 'mensual') => {
    return metas.find(meta => meta.periodo === periodo);
  };

  const obtenerEstadisticasGenerales = () => {
    if (metas.length === 0) {
      return {
        total: 0,
        completadas: 0,
        enProgreso: 0,
        pendientes: 0,
        progresoPromedio: 0
      };
    }

    const completadas = metas.filter(meta => meta.estado === 'COMPLETADA').length;
    const enProgreso = metas.filter(meta => meta.estado === 'EN_PROGRESO').length;
    const pendientes = metas.filter(meta => meta.estado === 'PENDIENTE').length;
    const progresoPromedio = metas.reduce((acc, meta) => acc + (meta.progreso || 0), 0) / metas.length;

    return {
      total: metas.length,
      completadas,
      enProgreso,
      pendientes,
      progresoPromedio: Math.round(progresoPromedio * 100) / 100
    };
  };

  // Función para obtener el color del progreso
  const obtenerColorProgreso = (progreso: number) => {
    if (progreso >= 100) return 'green';
    if (progreso >= 80) return 'blue';
    if (progreso >= 60) return 'yellow';
    return 'red';
  };

  // Función para formatear fechas
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cantidad);
  };

  // Validar si una meta está cerca del vencimiento
  const validarVencimiento = (meta: Meta) => {
    if (!meta.detalles?.fechaFin) return false;
    
    const fechaFin = new Date(meta.detalles.fechaFin);
    const ahora = new Date();
    const diasRestantes = Math.ceil((fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      venceSoon: diasRestantes <= 2 && diasRestantes > 0,
      vencido: diasRestantes <= 0,
      diasRestantes
    };
  };

  // Obtener alertas de metas
  const obtenerAlertas = () => {
    const alertas: Array<{
      id: string;
      tipo: 'warning' | 'error' | 'info';
      mensaje: string;
      meta: Meta;
    }> = [];

    metas.forEach(meta => {
      const vencimiento = validarVencimiento(meta);
      
      // @ts-expect-error Mismatch de tipos Prisma u obj temporal
      if (vencimiento.vencido && meta.progreso && meta.progreso < 100) {
        alertas.push({
          id: `vencido-${meta.id}`,
          tipo: 'error',
          mensaje: `Meta ${meta.periodo} venció sin completarse (${meta.progreso?.toFixed(1)}%)`,
          meta
        });
      // @ts-expect-error Mismatch de tipos Prisma u obj temporal
      } else if (vencimiento.venceSoon && meta.progreso && meta.progreso < 80) {
        alertas.push({
          id: `vence-pronto-${meta.id}`,
          tipo: 'warning',
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          mensaje: `Meta ${meta.periodo} vence en ${vencimiento.diasRestantes} días y está al ${meta.progreso?.toFixed(1)}%`,
          meta
        });
      } else if (meta.progreso && meta.progreso >= 100) {
        alertas.push({
          id: `completada-${meta.id}`,
          tipo: 'info',
          mensaje: `¡Meta ${meta.periodo} completada! (${meta.progreso?.toFixed(1)}%)`,
          meta
        });
      }
    });

    return alertas;
  };

  // Limpiar errores
  const limpiarError = () => setError(null);

  // Refresh manual
  const refresh = () => {
    cargarMetas();
  };

  return {
    // Estado
    metas,
    loading,
    error,
    
    // Acciones principales
    cargarMetas,
    configurarMeta,
    actualizarMeta,
    eliminarMeta,
    configurarMetasMultiples,
    refresh,
    
    // Consultas específicas
    obtenerMetaPorPeriodo,
    obtenerProgreso,
    
    // Utilidades
    obtenerMetaPorTipo,
    obtenerEstadisticasGenerales,
    obtenerColorProgreso,
    obtenerAlertas,
    formatearMoneda,
    formatearFecha,
    validarVencimiento,
    limpiarError
  };
};

export default useMetas;