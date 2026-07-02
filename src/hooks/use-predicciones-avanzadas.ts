// hooks/use-predicciones-avanzadas.ts
import { useState, useEffect, useCallback } from 'react';
import { PredictorVentas, DatoHistorico, PrediccionVentas } from '@/utils/predicciones';

interface EventoExterno {
  fecha: string;
  impacto: number;
  descripcion: string;
}

interface ConfiguracionPredicciones {
  diasPrediccion: number;
  incluirEventos: boolean;
  factorConfianza: number;
  modeloTipo: 'estadistico' | 'ml' | 'hibrido';
}

interface EstadisticasPrediccion {
  precisonPromedio: number;
  errorPromedio: number;
  tendencia: 'ascendente' | 'descendente' | 'estable';
  confiabilidad: number;
  ultimaActualizacion: Date;
}

export interface UsePrediccionesAvanzadasReturn {
  // Estado principal
  predicciones: PrediccionVentas[];
  predictor: PredictorVentas | null;
  insights: any;
  estadisticas: EstadisticasPrediccion | null;
  
  // Estados de carga y error
  loading: boolean;
  error: string | null;
  
  // Configuración
  configuracion: ConfiguracionPredicciones;
  eventos: EventoExterno[];
  
  // Funciones
  generarPredicciones: (datosHistoricos?: DatoHistorico[], config?: Partial<ConfiguracionPredicciones>) => Promise<void>;
  actualizarConfiguracion: (nuevaConfig: Partial<ConfiguracionPredicciones>) => void;
  agregarEvento: (evento: EventoExterno) => void;
  eliminarEvento: (index: number) => void;
  validarPredicciones: (ventasReales: { fecha: string; ventas: number }[]) => any;
  exportarPredicciones: (formato: 'json' | 'csv') => void;
  
  // Funciones de análisis
  obtenerPrediccionDia: (fecha: string) => PrediccionVentas | null;
  obtenerTendenciasPeriodo: (dias: number) => { promedio: number; tendencia: number; confianza: number };
  calcularImpactoEvento: (evento: EventoExterno) => number;
}

export const usePrediccionesAvanzadas = (): UsePrediccionesAvanzadasReturn => {
  // Estados principales
  const [predicciones, setPredicciones] = useState<PrediccionVentas[]>([]);
  const [predictor, setPredictor] = useState<PredictorVentas | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPrediccion | null>(null);
  
  // Estados de control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuración
  const [configuracion, setConfiguracion] = useState<ConfiguracionPredicciones>({
    diasPrediccion: 30,
    incluirEventos: true,
    factorConfianza: 0.8,
    modeloTipo: 'hibrido'
  });
  
  const [eventos, setEventos] = useState<EventoExterno[]>([]);

  // Función principal para generar predicciones
  const generarPredicciones = useCallback(async (
    datosHistoricos?: DatoHistorico[], 
    config?: Partial<ConfiguracionPredicciones>
  ) => {
    if (!datosHistoricos || datosHistoricos.length < 30) {
      setError('Se necesitan al menos 30 días de datos históricos para generar predicciones precisas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const configFinal = { ...configuracion, ...config };
      
      // Crear predictor
      const nuevoPredictor = new PredictorVentas(datosHistoricos);
      
      // Generar predicciones con eventos si están habilitados
      const eventosAUsar = configFinal.incluirEventos ? eventos : [];
      const nuevasPredicciones = nuevoPredictor.predecirVentas(
        configFinal.diasPrediccion, 
        eventosAUsar
      );
      
      // Obtener insights
      const nuevosInsights = nuevoPredictor.obtenerInsights();
      
      // Calcular estadísticas
      const nuevasEstadisticas = calcularEstadisticasPrediccion(nuevasPredicciones, nuevosInsights);
      
      // Aplicar filtros de confianza
      const prediccionesFiltradas = nuevasPredicciones.filter(
        pred => pred.confianza >= (configFinal.factorConfianza * 100)
      );
      
      setPredicciones(prediccionesFiltradas);
      setPredictor(nuevoPredictor);
      setInsights(nuevosInsights);
      setEstadisticas(nuevasEstadisticas);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al generar predicciones';
      setError(errorMsg);
      console.error('Error en predicciones:', err);
    } finally {
      setLoading(false);
    }
  }, [configuracion, eventos]);

  // Función para calcular estadísticas de predicción
  const calcularEstadisticasPrediccion = (
    predicciones: PrediccionVentas[], 
    insights: any
  ): EstadisticasPrediccion => {
    const confianzaPromedio = predicciones.reduce((acc, pred) => acc + pred.confianza, 0) / predicciones.length;
    
    // Calcular tendencia basada en las predicciones
    const ventasIniciales = predicciones.slice(0, 7).reduce((acc, pred) => acc + pred.ventasPredichas, 0) / 7;
    const ventasFinales = predicciones.slice(-7).reduce((acc, pred) => acc + pred.ventasPredichas, 0) / 7;
    const cambioTendencia = ((ventasFinales - ventasIniciales) / ventasIniciales) * 100;
    
    let tendencia: 'ascendente' | 'descendente' | 'estable';
    if (cambioTendencia > 5) tendencia = 'ascendente';
    else if (cambioTendencia < -5) tendencia = 'descendente';
    else tendencia = 'estable';
    
    return {
      precisonPromedio: confianzaPromedio,
      errorPromedio: 100 - confianzaPromedio,
      tendencia,
      confiabilidad: insights?.confiabilidadModelo || 0,
      ultimaActualizacion: new Date()
    };
  };

  // Actualizar configuración
  const actualizarConfiguracion = useCallback((nuevaConfig: Partial<ConfiguracionPredicciones>) => {
    setConfiguracion(prev => ({ ...prev, ...nuevaConfig }));
  }, []);

  // Gestión de eventos
  const agregarEvento = useCallback((evento: EventoExterno) => {
    if (!evento.fecha || !evento.descripcion) {
      setError('Fecha y descripción son obligatorios para agregar un evento');
      return;
    }
    
    // Validar que la fecha no esté duplicada
    const fechaExiste = eventos.some(e => e.fecha === evento.fecha);
    if (fechaExiste) {
      setError('Ya existe un evento para esta fecha');
      return;
    }
    
    setEventos(prev => [...prev, evento].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    ));
    setError(null);
  }, [eventos]);

  const eliminarEvento = useCallback((index: number) => {
    setEventos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Validación de predicciones con datos reales
  const validarPredicciones = useCallback((ventasReales: { fecha: string; ventas: number }[]) => {
    if (!predictor) {
      throw new Error('No hay predictor disponible para validación');
    }
    
    const prediccionesAValidar = predicciones.filter(pred => 
      ventasReales.some(real => real.fecha === pred.fecha)
    );
    
    if (prediccionesAValidar.length === 0) {
      return { error: 'No hay predicciones que coincidan con las fechas de ventas reales' };
    }
    
    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
    return predictor.validarPredicciones(prediccionesAValidar, ventasReales);
  }, [predictor, predicciones]);

  // Exportar predicciones
  const exportarPredicciones = useCallback((formato: 'json' | 'csv') => {
    if (predicciones.length === 0) {
      setError('No hay predicciones para exportar');
      return;
    }

    try {
      let contenido: string;
      let nombreArchivo: string;
      let tipoMime: string;

      if (formato === 'json') {
        contenido = JSON.stringify({
          predicciones,
          insights,
          estadisticas,
          configuracion,
          eventos,
          fechaExportacion: new Date().toISOString()
        }, null, 2);
        nombreArchivo = `predicciones_${new Date().toISOString().split('T')[0]}.json`;
        tipoMime = 'application/json';
      } else {
        // Formato CSV
        const headers = [
          'Fecha', 'Ventas Predichas', 'Ingresos Predichos', 'Confianza %',
          'Rango Mínimo', 'Rango Máximo', 'Factor Tendencia', 'Factor Estacionalidad'
        ];
        
        const filas = predicciones.map(pred => [
          pred.fecha,
          pred.ventasPredichas,
          pred.ingresosPredichos,
          pred.confianza.toFixed(1),
          pred.rangoConfianza.minimo,
          pred.rangoConfianza.maximo,
          pred.factoresInfluencia.tendenciaHistorica.toFixed(2),
          pred.factoresInfluencia.estacionalidad.toFixed(2)
        ]);
        
        contenido = [headers, ...filas].map(fila => fila.join(',')).join('\n');
        nombreArchivo = `predicciones_${new Date().toISOString().split('T')[0]}.csv`;
        tipoMime = 'text/csv';
      }

      // Crear y descargar archivo
      const blob = new Blob([contenido], { type: tipoMime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      setError('Error al exportar predicciones');
      console.error('Error en exportación:', err);
    }
  }, [predicciones, insights, estadisticas, configuracion, eventos]);

  // Funciones de análisis adicionales
  const obtenerPrediccionDia = useCallback((fecha: string): PrediccionVentas | null => {
    return predicciones.find(pred => pred.fecha === fecha) || null;
  }, [predicciones]);

  const obtenerTendenciasPeriodo = useCallback((dias: number) => {
    const prediccionesPeriodo = predicciones.slice(0, dias);
    if (prediccionesPeriodo.length === 0) {
      return { promedio: 0, tendencia: 0, confianza: 0 };
    }

    const promedio = prediccionesPeriodo.reduce((acc, pred) => acc + pred.ventasPredichas, 0) / prediccionesPeriodo.length;
    const confianza = prediccionesPeriodo.reduce((acc, pred) => acc + pred.confianza, 0) / prediccionesPeriodo.length;
    
    // Calcular tendencia (regresión lineal simple)
    const n = prediccionesPeriodo.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prediccionesPeriodo.map(pred => pred.ventasPredichas);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    
    const tendencia = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return { promedio, tendencia, confianza };
  }, [predicciones]);

  const calcularImpactoEvento = useCallback((evento: EventoExterno): number => {
    // Simulación del impacto basado en el porcentaje y tipo de evento
    const impactoBase = Math.abs(evento.impacto);
    
    // Factores adicionales (estos podrían ser más sofisticados)
    let factor = 1;
    
    if (evento.descripcion.toLowerCase().includes('black friday') || 
        evento.descripcion.toLowerCase().includes('cyber')) {
      factor = 1.5;
    } else if (evento.descripcion.toLowerCase().includes('navidad') || 
               evento.descripcion.toLowerCase().includes('día de la madre')) {
      factor = 1.3;
    } else if (evento.descripcion.toLowerCase().includes('promoción') ||
               evento.descripcion.toLowerCase().includes('descuento')) {
      factor = 1.2;
    }
    
    return impactoBase * factor;
  }, []);

  // Efecto para regenerar predicciones cuando cambie la configuración
  useEffect(() => {
    if (predictor && predicciones.length > 0) {
      // Regenerar solo si hay cambios significativos en la configuración
      const configuracionCambiada = 
        configuracion.diasPrediccion !== predicciones.length ||
        configuracion.incluirEventos !== (eventos.length > 0);
        
      if (configuracionCambiada) {
        // Nota: Aquí necesitarías los datos históricos originales
        // En una implementación real, los almacenarías en el estado
      }
    }
  }, [configuracion, eventos, predictor, predicciones.length]);

  // Limpiar error después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // Estado principal
    predicciones,
    predictor,
    insights,
    estadisticas,
    
    // Estados de control
    loading,
    error,
    
    // Configuración
    configuracion,
    eventos,
    
    // Funciones principales
    generarPredicciones,
    actualizarConfiguracion,
    agregarEvento,
    eliminarEvento,
    validarPredicciones,
    exportarPredicciones,
    
    // Funciones de análisis
    obtenerPrediccionDia,
    obtenerTendenciasPeriodo,
    calcularImpactoEvento
  };
};