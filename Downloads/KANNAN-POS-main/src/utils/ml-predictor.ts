// utils/ml-predictor.ts
import * as tf from '@tensorflow/tfjs';
import { DatoHistorico, PrediccionVentas } from './predicciones';

interface ModeloML {
  modelo: tf.LayersModel;
  escaladores: {
    entradas: { mean: number[]; std: number[] };
    salidas: { mean: number; std: number };
  };
  metricas: {
    loss: number;
    mae: number;
    r2: number;
  };
}

export class MLPredictorVentas {
  private modelo: tf.LayersModel | null = null;
  private escaladores: any = null;
  private caracteristicasImportantes: string[] = [];
  private historialEntrenamiento: number[] = [];

  constructor() {
    // Configurar TensorFlow.js para usar CPU o GPU según disponibilidad
    this.configurarTensorFlow();
  }

  private async configurarTensorFlow() {
    try {
      // Intentar usar WebGL si está disponible
      await tf.setBackend('webgl');
    } catch (error) {
      // Fallback a CPU
      await tf.setBackend('cpu');
    }
  }

  // Preparar datos para entrenamiento
  private prepararDatos(datosHistoricos: DatoHistorico[]) {
    // Crear características (features) a partir de los datos históricos
    const caracteristicas = datosHistoricos.map(dato => {
      const fecha = new Date(dato.fecha);
      return [
        // Características temporales
        fecha.getDay(), // Día de la semana (0-6)
        fecha.getDate(), // Día del mes (1-31)
        fecha.getMonth(), // Mes (0-11)
        Math.floor(fecha.getTime() / (1000 * 60 * 60 * 24)), // Días desde epoch (tendencia temporal)
        
        // Características de ventas históricas (lag features)
        dato.ventas,
        dato.ingresos,
        dato.productos,
        dato.clientes,
        
        // Características categóricas
        dato.esFinSemana ? 1 : 0,
        dato.esFeriado ? 1 : 0,
        
        // Media móvil de los últimos 7 días (si hay datos suficientes)
        this.calcularMediaMovil(datosHistoricos, dato.fecha, 7),
        this.calcularMediaMovil(datosHistoricos, dato.fecha, 30),
        
        // Volatilidad reciente
        this.calcularVolatilidad(datosHistoricos, dato.fecha, 14),
        
        // Crecimiento reciente
        this.calcularCrecimiento(datosHistoricos, dato.fecha, 7)
      ];
    });

    // Objetivos (targets) - ventas del día siguiente
    const objetivos = datosHistoricos.slice(1).map(dato => dato.ventas);
    
    // Remover el último elemento de características para alinear con objetivos
    const caracteristicasAlineadas = caracteristicas.slice(0, -1);

    return { caracteristicas: caracteristicasAlineadas, objetivos };
  }

  private calcularMediaMovil(datos: DatoHistorico[], fechaActual: string, dias: number): number {
    const fechaRef = new Date(fechaActual);
    const fechaInicio = new Date(fechaRef.getTime() - (dias * 24 * 60 * 60 * 1000));
    
    const datosRango = datos.filter(d => {
      const fecha = new Date(d.fecha);
      return fecha >= fechaInicio && fecha < fechaRef;
    });
    
    if (datosRango.length === 0) return 0;
    return datosRango.reduce((acc, d) => acc + d.ventas, 0) / datosRango.length;
  }

  private calcularVolatilidad(datos: DatoHistorico[], fechaActual: string, dias: number): number {
    const fechaRef = new Date(fechaActual);
    const fechaInicio = new Date(fechaRef.getTime() - (dias * 24 * 60 * 60 * 1000));
    
    const ventasRango = datos
      .filter(d => {
        const fecha = new Date(d.fecha);
        return fecha >= fechaInicio && fecha < fechaRef;
      })
      .map(d => d.ventas);
    
    if (ventasRango.length < 2) return 0;
    
    const media = ventasRango.reduce((a, b) => a + b, 0) / ventasRango.length;
    const varianza = ventasRango.reduce((acc, venta) => acc + Math.pow(venta - media, 2), 0) / ventasRango.length;
    
    return Math.sqrt(varianza);
  }

  private calcularCrecimiento(datos: DatoHistorico[], fechaActual: string, dias: number): number {
    const fechaRef = new Date(fechaActual);
    const fechaInicio = new Date(fechaRef.getTime() - (dias * 24 * 60 * 60 * 1000));
    
    const datosRango = datos
      .filter(d => {
        const fecha = new Date(d.fecha);
        return fecha >= fechaInicio && fecha < fechaRef;
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    
    if (datosRango.length < 2) return 0;
    
    const ventaInicial = datosRango[0].ventas;
    const ventaFinal = datosRango[datosRango.length - 1].ventas;
    
    return ventaInicial > 0 ? ((ventaFinal - ventaInicial) / ventaInicial) * 100 : 0;
  }

  // Normalizar datos
  private normalizarDatos(datos: number[][]) {
    const numCaracteristicas = datos[0].length;
    const medias = new Array(numCaracteristicas).fill(0);
    const desviaciones = new Array(numCaracteristicas).fill(0);
    
    // Calcular medias
    for (let i = 0; i < numCaracteristicas; i++) {
      medias[i] = datos.reduce((acc, fila) => acc + fila[i], 0) / datos.length;
    }
    
    // Calcular desviaciones estándar
    for (let i = 0; i < numCaracteristicas; i++) {
      const varianza = datos.reduce((acc, fila) => acc + Math.pow(fila[i] - medias[i], 2), 0) / datos.length;
      desviaciones[i] = Math.sqrt(varianza) || 1; // Evitar división por cero
    }
    
    // Normalizar datos
    const datosNormalizados = datos.map(fila => 
      fila.map((valor, i) => (valor - medias[i]) / desviaciones[i])
    );
    
    return {
      datos: datosNormalizados,
      escaladores: { mean: medias, std: desviaciones }
    };
  }

  // Crear y entrenar el modelo
  public async entrenarModelo(datosHistoricos: DatoHistorico[]): Promise<ModeloML> {
    try {
      if (datosHistoricos.length < 60) {
        throw new Error('Se necesitan al menos 60 días de datos para entrenar el modelo ML');
      }

      const { caracteristicas, objetivos } = this.prepararDatos(datosHistoricos);
      
      // Normalizar características
      const { datos: caracteristicasNorm, escaladores: escaladoresX } = this.normalizarDatos(caracteristicas);
      
      // Normalizar objetivos
      const mediaY = objetivos.reduce((a, b) => a + b, 0) / objetivos.length;
      const stdY = Math.sqrt(objetivos.reduce((acc, y) => acc + Math.pow(y - mediaY, 2), 0) / objetivos.length) || 1;
      const objetivosNorm = objetivos.map(y => (y - mediaY) / stdY);

      // Dividir en conjuntos de entrenamiento y validación
      const indiceCorte = Math.floor(caracteristicasNorm.length * 0.8);
      const xTrain = caracteristicasNorm.slice(0, indiceCorte);
      const yTrain = objetivosNorm.slice(0, indiceCorte);
      const xVal = caracteristicasNorm.slice(indiceCorte);
      const yVal = objetivosNorm.slice(indiceCorte);

      // Convertir a tensores
      const xTrainTensor = tf.tensor2d(xTrain);
      const yTrainTensor = tf.tensor2d(yTrain, [yTrain.length, 1]);
      const xValTensor = tf.tensor2d(xVal);
      const yValTensor = tf.tensor2d(yVal, [yVal.length, 1]);

      // Crear modelo de red neuronal
      const modelo = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [caracteristicas[0].length],
            units: 64,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu',
            kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
          }),
          tf.layers.dropout({ rate: 0.1 }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'linear'
          })
        ]
      });

      // Compilar modelo
      modelo.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Entrenar modelo
      const historial = await modelo.fit(xTrainTensor, yTrainTensor, {
        epochs: 100,
        batchSize: 32,
        validationData: [xValTensor, yValTensor],
        verbose: 0,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
            }
          }
        }
      });

      // Calcular métricas finales
      const prediccionesVal = modelo.predict(xValTensor) as tf.Tensor;
      const prediccionesArray = await prediccionesVal.data();
      const prediccionesDenorm = Array.from(prediccionesArray).map(p => p * stdY + mediaY);
      const yValDenorm = yVal.map(y => y * stdY + mediaY);

      // Calcular R²
      const mediaYVal = yValDenorm.reduce((a, b) => a + b, 0) / yValDenorm.length;
      const ssTotal = yValDenorm.reduce((acc, y) => acc + Math.pow(y - mediaYVal, 2), 0);
      const ssRes = yValDenorm.reduce((acc, y, i) => acc + Math.pow(y - prediccionesDenorm[i], 2), 0);
      const r2 = 1 - (ssRes / ssTotal);

      // MAE
      const mae = yValDenorm.reduce((acc, y, i) => acc + Math.abs(y - prediccionesDenorm[i]), 0) / yValDenorm.length;

      this.modelo = modelo;
      this.escaladores = {
        entradas: escaladoresX,
        salidas: { mean: mediaY, std: stdY }
      };
      
      this.historialEntrenamiento = historial.history.loss as number[];

      // Limpiar memoria
      xTrainTensor.dispose();
      yTrainTensor.dispose();
      xValTensor.dispose();
      yValTensor.dispose();
      prediccionesVal.dispose();

      return {
        modelo,
        escaladores: {
          entradas: escaladoresX,
          salidas: { mean: mediaY, std: stdY }
        },
        metricas: {
          loss: historial.history.loss[historial.history.loss.length - 1] as number,
          mae,
          r2
        }
      };

    } catch (error) {
      console.error('Error entrenando modelo ML:', error);
      throw new Error(`Error en entrenamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Hacer predicciones con el modelo entrenado
  public async predecirConML(
    datosHistoricos: DatoHistorico[],
    diasFuturos: number = 30
  ): Promise<PrediccionVentas[]> {
    if (!this.modelo || !this.escaladores) {
      throw new Error('Modelo no entrenado. Ejecuta entrenarModelo() primero.');
    }

    const predicciones: PrediccionVentas[] = [];
    let datosActuales = [...datosHistoricos];

    for (let i = 0; i < diasFuturos; i++) {
      // Crear fecha futura
      const ultimaFecha = new Date(datosActuales[datosActuales.length - 1].fecha);
      const fechaPrediccion = new Date(ultimaFecha.getTime() + (24 * 60 * 60 * 1000));
      const fechaStr = fechaPrediccion.toISOString().split('T')[0];

      // Preparar características para predicción
      const caracteristicas = this.prepararCaracteristicasPrediccion(datosActuales, fechaPrediccion);
      
      // Normalizar características
      const caracteristicasNorm = caracteristicas.map((valor, j) => 
        (valor - this.escaladores.entradas.mean[j]) / this.escaladores.entradas.std[j]
      );

      // Hacer predicción
      const entrada = tf.tensor2d([caracteristicasNorm]);
      const prediccionNorm = this.modelo.predict(entrada) as tf.Tensor;
      const prediccionArray = await prediccionNorm.data();
      
      // Desnormalizar predicción
      const ventasPredichas = Math.max(0, 
        prediccionArray[0] * this.escaladores.salidas.std + this.escaladores.salidas.mean
      );

      // Calcular ingresos basado en ratio histórico
      const ratioIngresoVenta = this.calcularRatioIngresoVenta(datosHistoricos);
      const ingresosPredichos = ventasPredichas * ratioIngresoVenta;

      // Calcular confianza basada en la distancia del promedio
      const promedioVentas = datosHistoricos.slice(-30).reduce((acc, d) => acc + d.ventas, 0) / 30;
      const desviacionVentas = Math.sqrt(
        datosHistoricos.slice(-30).reduce((acc, d) => acc + Math.pow(d.ventas - promedioVentas, 2), 0) / 30
      );
      
      const distanciaNormalizada = Math.abs(ventasPredichas - promedioVentas) / desviacionVentas;
      const confianza = Math.max(50, 95 - (distanciaNormalizada * 15));

      // Calcular rango de confianza
      const errorEstandar = desviacionVentas * 0.5;
      const margenError = errorEstandar * (2 - confianza / 100);

      const prediccion: PrediccionVentas = {
        fecha: fechaStr,
        ventasPredichas: Math.round(ventasPredichas),
        ingresosPredichos: Math.round(ingresosPredichos),
        confianza: Math.round(confianza * 100) / 100,
        factoresInfluencia: {
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          tendencia: this.calcularFactorTendencia(datosActuales),
          estacionalidad: this.calcularFactorEstacionalidad(fechaPrediccion),
          diasSemana: this.calcularFactorDiaSemana(fechaPrediccion.getDay()),
          eventos: 0 // Los eventos se manejarían externamente
        },
        rangoConfianza: {
          minimo: Math.max(0, Math.round(ventasPredichas - margenError)),
          maximo: Math.round(ventasPredichas + margenError)
        }
      };

      predicciones.push(prediccion);

      // Agregar predicción a datos actuales para próxima iteración
      datosActuales.push({
        fecha: fechaStr,
        ventas: Math.round(ventasPredichas),
        ingresos: Math.round(ingresosPredichos),
        productos: Math.round(ventasPredichas * 1.2), // Estimación
        clientes: Math.round(ventasPredichas * 0.8), // Estimación
        diaSemana: fechaPrediccion.getDay(),
        semanaAño: Math.floor((fechaPrediccion.getTime() - new Date(fechaPrediccion.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        mesAño: fechaPrediccion.getMonth(),
        esFinSemana: fechaPrediccion.getDay() === 0 || fechaPrediccion.getDay() === 6,
        esFeriado: false
      });

      // Limpiar memoria
      entrada.dispose();
      prediccionNorm.dispose();
    }

    return predicciones;
  }

  private prepararCaracteristicasPrediccion(datosHistoricos: DatoHistorico[], fechaPrediccion: Date): number[] {
    const ultimoDato = datosHistoricos[datosHistoricos.length - 1];
    const fechaStr = fechaPrediccion.toISOString().split('T')[0];
    
    return [
      // Características temporales
      fechaPrediccion.getDay(),
      fechaPrediccion.getDate(),
      fechaPrediccion.getMonth(),
      Math.floor(fechaPrediccion.getTime() / (1000 * 60 * 60 * 24)),
      
      // Características del último día conocido
      ultimoDato.ventas,
      ultimoDato.ingresos,
      ultimoDato.productos,
      ultimoDato.clientes,
      
      // Características categóricas
      (fechaPrediccion.getDay() === 0 || fechaPrediccion.getDay() === 6) ? 1 : 0,
      0, // esFeriado (esto se podría mejorar)
      
      // Medias móviles
      this.calcularMediaMovil(datosHistoricos, ultimoDato.fecha, 7),
      this.calcularMediaMovil(datosHistoricos, ultimoDato.fecha, 30),
      
      // Volatilidad y crecimiento recientes
      this.calcularVolatilidad(datosHistoricos, ultimoDato.fecha, 14),
      this.calcularCrecimiento(datosHistoricos, ultimoDato.fecha, 7)
    ];
  }

  private calcularRatioIngresoVenta(datosHistoricos: DatoHistorico[]): number {
    const ventasTotal = datosHistoricos.reduce((acc, d) => acc + d.ventas, 0);
    const ingresosTotal = datosHistoricos.reduce((acc, d) => acc + d.ingresos, 0);
    return ventasTotal > 0 ? ingresosTotal / ventasTotal : 50000; // Valor por defecto
  }

  private calcularFactorTendencia(datosHistoricos: DatoHistorico[]): number {
    const ultimosMes = datosHistoricos.slice(-30);
    if (ultimosMes.length < 15) return 0;
    
    const primeraMitad = ultimosMes.slice(0, 15).reduce((acc, d) => acc + d.ventas, 0) / 15;
    const segundaMitad = ultimosMes.slice(15).reduce((acc, d) => acc + d.ventas, 0) / 15;
    
    return primeraMitad > 0 ? ((segundaMitad - primeraMitad) / primeraMitad) * 100 : 0;
  }

  private calcularFactorEstacionalidad(fecha: Date): number {
    const mes = fecha.getMonth();
    // Factores estacionales típicos para retail (esto se podría personalizar)
    const factoresMensuales = [
      0.85, // Enero - post-navidad
      0.90, // Febrero
      0.95, // Marzo
      1.00, // Abril
      1.05, // Mayo - Día de la Madre
      1.00, // Junio
      0.95, // Julio
      0.90, // Agosto
      1.05, // Septiembre - regreso a clases
      1.10, // Octubre
      1.15, // Noviembre - Black Friday
      1.25  // Diciembre - Navidad
    ];
    
    return (factoresMensuales[mes] - 1) * 100;
  }

  private calcularFactorDiaSemana(diaSemana: number): number {
    // Factores típicos por día de la semana (0 = Domingo)
    const factoresDiarios = [0.8, 0.9, 0.95, 1.0, 1.1, 1.2, 1.15]; // Dom-Sáb
    return (factoresDiarios[diaSemana] - 1) * 100;
  }

  // Obtener información del modelo
  public obtenerInfoModelo() {
    if (!this.modelo) return null;
    
    return {
      arquitectura: {
        capas: this.modelo.layers.length,
        parametros: this.modelo.countParams(),
        optimizador: 'Adam',
        funcionPerdida: 'Mean Squared Error'
      },
      rendimiento: {
        historialEntrenamiento: this.historialEntrenamiento,
        ultimaPerdida: this.historialEntrenamiento[this.historialEntrenamiento.length - 1]
      },
      estado: 'Entrenado y listo para predicciones'
    };
  }

  // Guardar modelo entrenado
  public async guardarModelo(nombre: string = 'modelo-ventas') {
    if (!this.modelo) throw new Error('No hay modelo para guardar');
    
    try {
      // Guardar en localStorage del navegador
      await this.modelo.save(`localstorage://${nombre}`);
      
      // Guardar escaladores y metadatos
      const metadatos = {
        escaladores: this.escaladores,
        caracteristicasImportantes: this.caracteristicasImportantes,
        fechaEntrenamiento: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(`${nombre}-metadatos`, JSON.stringify(metadatos));
      
      return { exito: true, mensaje: 'Modelo guardado exitosamente' };
    } catch (error) {
      console.error('Error guardando modelo:', error);
      return { exito: false, mensaje: 'Error al guardar el modelo' };
    }
  }

  // Cargar modelo guardado
  public async cargarModelo(nombre: string = 'modelo-ventas') {
    try {
      // Cargar modelo
      this.modelo = await tf.loadLayersModel(`localstorage://${nombre}`);
      
      // Cargar metadatos
      const metadatosStr = localStorage.getItem(`${nombre}-metadatos`);
      if (metadatosStr) {
        const metadatos = JSON.parse(metadatosStr);
        this.escaladores = metadatos.escaladores;
        this.caracteristicasImportantes = metadatos.caracteristicasImportantes || [];
      }
      
      return { exito: true, mensaje: 'Modelo cargado exitosamente' };
    } catch (error) {
      console.error('Error cargando modelo:', error);
      return { exito: false, mensaje: 'Error al cargar el modelo' };
    }
  }

  // Limpiar recursos
  public dispose() {
    if (this.modelo) {
      this.modelo.dispose();
      this.modelo = null;
    }
    this.escaladores = null;
    this.caracteristicasImportantes = [];
    this.historialEntrenamiento = [];
  }

  // Análisis de importancia de características (simplificado)
  public analizarImportanciaCaracteristicas(datosHistoricos: DatoHistorico[]): { [key: string]: number } {
    const nombreCaracteristicas = [
      'Día Semana', 'Día Mes', 'Mes', 'Tendencia Temporal',
      'Ventas Anterior', 'Ingresos Anterior', 'Productos Anterior', 'Clientes Anterior',
      'Es Fin Semana', 'Es Feriado',
      'Media 7 días', 'Media 30 días',
      'Volatilidad 14 días', 'Crecimiento 7 días'
    ];

    // Esto es una implementación simplificada
    // En un caso real, usarías técnicas como SHAP o permutation importance
    const importancias: { [key: string]: number } = {};
    
    // Simulación de importancias basada en conocimiento del dominio
    const importanciasBase = [
      0.15, // Día Semana - muy importante
      0.05, // Día Mes
      0.12, // Mes - estacionalidad importante
      0.20, // Tendencia Temporal - muy importante
      0.25, // Ventas Anterior - más importante
      0.08, // Ingresos Anterior
      0.03, // Productos Anterior
      0.02, // Clientes Anterior
      0.10, // Es Fin Semana - importante
      0.05, // Es Feriado
      0.18, // Media 7 días - muy importante
      0.12, // Media 30 días
      0.07, // Volatilidad
      0.08  // Crecimiento
    ];

    nombreCaracteristicas.forEach((nombre, i) => {
      importancias[nombre] = importanciasBase[i] || 0;
    });

    return importancias;
  }
}

// Función auxiliar para crear un predictor híbrido que combine estadísticas y ML
export class PredictorHibrido {
  private predictorEstadistico: any; // PredictorVentas de predicciones.ts
  private predictorML: MLPredictorVentas;
  private pesoML: number = 0.7; // Peso para predicciones ML vs estadísticas

  constructor() {
    this.predictorML = new MLPredictorVentas();
  }

  public async entrenarYConfigurar(datosHistoricos: DatoHistorico[]) {
    // Entrenar modelo ML
    const modeloML = await this.predictorML.entrenarModelo(datosHistoricos);
    
    // Crear predictor estadístico
    const { PredictorVentas } = await import('./predicciones');
    this.predictorEstadistico = new PredictorVentas(datosHistoricos);
    
    // Ajustar peso basado en la calidad del modelo ML
    this.pesoML = Math.min(0.8, Math.max(0.3, modeloML.metricas.r2));
    
    return {
      modeloML,
      pesoML: this.pesoML,
      predictorEstadistico: this.predictorEstadistico.obtenerInsights()
    };
  }

  public async predecirHibrido(
    datosHistoricos: DatoHistorico[],
    diasFuturos: number = 30,
    eventos?: { fecha: string; impacto: number; descripcion: string }[]
  ): Promise<PrediccionVentas[]> {
    // Obtener predicciones de ambos métodos
    const prediccionesML = await this.predictorML.predecirConML(datosHistoricos, diasFuturos);
    const prediccionesEst = this.predictorEstadistico.predecirVentas(diasFuturos, eventos);
    
    // Combinar predicciones
    const prediccionesHibridas: PrediccionVentas[] = [];
    
    for (let i = 0; i < diasFuturos; i++) {
      const predML = prediccionesML[i];
      const predEst = prediccionesEst[i];
      
      if (!predML || !predEst) continue;
      
      // Combinar ventas predichas
      const ventasHibridas = Math.round(
        (predML.ventasPredichas * this.pesoML) + 
        (predEst.ventasPredichas * (1 - this.pesoML))
      );
      
      // Combinar ingresos predichos
      const ingresosHibridos = Math.round(
        (predML.ingresosPredichos * this.pesoML) + 
        (predEst.ingresosPredichos * (1 - this.pesoML))
      );
      
      // Combinar confianza (usar la menor para ser conservadores)
      const confianzaHibrida = Math.min(predML.confianza, predEst.confianza) * 
        (0.9 + (this.pesoML * 0.2)); // Bonificación por usar ambos métodos
      
      // Combinar rangos de confianza
      const rangoMinimo = Math.min(predML.rangoConfianza.minimo, predEst.rangoConfianza.minimo);
      const rangoMaximo = Math.max(predML.rangoConfianza.maximo, predEst.rangoConfianza.maximo);
      
      prediccionesHibridas.push({
        fecha: predML.fecha,
        ventasPredichas: ventasHibridas,
        ingresosPredichos: ingresosHibridos,
        confianza: confianzaHibrida,
        factoresInfluencia: {
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          tendencia: (predML.factoresInfluencia.tendencia + predEst.factoresInfluencia.tendencia) / 2,
          estacionalidad: (predML.factoresInfluencia.estacionalidad + predEst.factoresInfluencia.estacionalidad) / 2,
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          diasSemana: (predML.factoresInfluencia.diasSemana + predEst.factoresInfluencia.diasSemana) / 2,
          eventos: predEst.factoresInfluencia.eventos // Solo estadístico maneja eventos
        },
        rangoConfianza: {
          minimo: rangoMinimo,
          maximo: rangoMaximo
        }
      });
    }
    
    return prediccionesHibridas;
  }

  public obtenerMetricasComparativas() {
    return {
      pesoML: this.pesoML,
      pesoEstadistico: 1 - this.pesoML,
      infoML: this.predictorML.obtenerInfoModelo(),
      infoEstadistico: this.predictorEstadistico?.obtenerInsights()
    };
  }

  public dispose() {
    this.predictorML.dispose();
  }
}