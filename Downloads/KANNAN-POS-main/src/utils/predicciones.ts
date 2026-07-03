// utils/predicciones.ts
export interface DatoHistorico {
  fecha: string;
  ventas: number;
  ingresos: number;
  productos: number;
  clientes: number;
  diaSemana: number;
  semanaAño: number;
  mesAño: number;
  esFinSemana: boolean;
  esFeriado: boolean;
}

export interface PrediccionVentas {
  fecha: string;
  ventasPredichas: number;
  ingresosPredichos: number;
  confianza: number;
  rangoConfianza: {
    minimo: number;
    maximo: number;
  };
  factoresInfluencia: {
    tendenciaHistorica: number;
    estacionalidad: number;
    diaSemana: number;
    eventosEspeciales: number;
  };
}

export interface InsightsPredicciones {
  tendenciaCrecimiento: 'ascendente' | 'descendente' | 'estable';
  tasaCrecimientoDiaria: number;
  mejorDiaSemana: number;
  peorDiaSemana: number;
  volatilidad: number;
  confiabilidadModelo: number;
  recomendaciones: string[];
}

export class PredictorVentas {
  private datosHistoricos: DatoHistorico[];
  private promedioMovil: number[] = [];
  private tendencia: number = 0;
  private estacionalidad: number[] = [];
  private modeloEntrenado: boolean = false;

  constructor(datosHistoricos: DatoHistorico[]) {
    this.datosHistoricos = datosHistoricos;
    this.validarDatos();
    this.entrenarModelo();
  }

  private validarDatos(): void {
    if (!this.datosHistoricos || this.datosHistoricos.length === 0) {
      throw new Error('No se proporcionaron datos históricos');
    }

    if (this.datosHistoricos.length < 7) {
      throw new Error('Se necesitan al menos 7 días de datos históricos para predicciones básicas');
    }

    // Para predicciones más precisas, recomendamos 30 días, pero permitimos menos con advertencia
    if (this.datosHistoricos.length < 30) {
    }
  }

  private entrenarModelo(): void {
    this.calcularAnalisisEstadistico();
    this.calcularEstacionalidad();
    this.modeloEntrenado = true;
  }

  private calcularAnalisisEstadistico(): void {
    // Modificación: permitir menos de 30 días pero con advertencia
    const minimoRecomendado = 30;
    const minimoAbsoluto = 7;

    if (this.datosHistoricos.length < minimoAbsoluto) {
      throw new Error(`Se necesitan al menos ${minimoAbsoluto} días de datos históricos para predicciones básicas`);
    }

    if (this.datosHistoricos.length < minimoRecomendado) {
    }

    const ventas = this.datosHistoricos.map(d => d.ventas);
    
    // Calcular promedio móvil con ventana adaptativa
    const ventanaMovil = Math.min(7, Math.floor(this.datosHistoricos.length / 4));
    
    for (let i = ventanaMovil - 1; i < ventas.length; i++) {
      const suma = ventas.slice(i - ventanaMovil + 1, i + 1).reduce((a, b) => a + b, 0);
      this.promedioMovil.push(suma / ventanaMovil);
    }

    // Calcular tendencia con regresión lineal simple
    if (this.promedioMovil.length >= 2) {
      const n = this.promedioMovil.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = this.promedioMovil.reduce((a, b) => a + b, 0);
      const sumXY = this.promedioMovil.reduce((acc, y, i) => acc + i * y, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

      this.tendencia = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }
  }

  private calcularEstacionalidad(): void {
    const diasSemana = Array(7).fill(0);
    const conteos = Array(7).fill(0);

    this.datosHistoricos.forEach(dato => {
      diasSemana[dato.diaSemana] += dato.ventas;
      conteos[dato.diaSemana]++;
    });

    // Calcular promedio por día de la semana
    this.estacionalidad = diasSemana.map((suma, i) => 
      conteos[i] > 0 ? suma / conteos[i] : 0
    );

    // Normalizar con respecto al promedio general
    const promedioGeneral = diasSemana.reduce((a, b) => a + b, 0) / 
                           conteos.reduce((a, b) => a + b, 0);
    
    this.estacionalidad = this.estacionalidad.map(promedio => 
      promedioGeneral > 0 ? promedio / promedioGeneral : 1
    );
  }

  public predecirVentas(dias: number, eventos: Array<{fecha: string; impacto: number; descripcion: string}> = []): PrediccionVentas[] {
    if (!this.modeloEntrenado) {
      throw new Error('El modelo no ha sido entrenado correctamente');
    }

    const predicciones: PrediccionVentas[] = [];
    const ultimoValor = this.datosHistoricos[this.datosHistoricos.length - 1].ventas;
    const promedioHistorico = this.datosHistoricos.reduce((acc, d) => acc + d.ventas, 0) / this.datosHistoricos.length;

    for (let i = 0; i < dias; i++) {
      const fechaPrediccion = new Date();
      fechaPrediccion.setDate(fechaPrediccion.getDate() + i + 1);
      
      const diaSemana = fechaPrediccion.getDay();
      const fechaStr = fechaPrediccion.toISOString().split('T')[0];

      // Calcular predicción base
      let prediccionBase = ultimoValor + (this.tendencia * (i + 1));
      
      // Aplicar estacionalidad
      const factorEstacional = this.estacionalidad[diaSemana] || 1;
      prediccionBase *= factorEstacional;

      // Aplicar eventos especiales
      const evento = eventos.find(e => e.fecha === fechaStr);
      const impactoEvento = evento ? (evento.impacto / 100) : 0;
      prediccionBase *= (1 + impactoEvento);

      // Aplicar variabilidad natural (reducida para datos limitados)
      const variabilidad = this.datosHistoricos.length >= 30 ? 0.1 : 0.05;
      const ruido = (Math.random() - 0.5) * variabilidad;
      prediccionBase *= (1 + ruido);

      // Asegurar que no sea negativo
      const ventasPredichas = Math.max(0, Math.round(prediccionBase));

      // Calcular ingresos predichos (basado en ticket promedio histórico)
      const ticketPromedio = this.datosHistoricos.reduce((acc, d) => acc + d.ingresos, 0) / 
                            this.datosHistoricos.reduce((acc, d) => acc + d.ventas, 0);
      const ingresosPredichos = ventasPredichas * (ticketPromedio || 50000); // Fallback a 50k

      // Calcular confianza (reducida para datos limitados)
      let confianzaBase = this.datosHistoricos.length >= 30 ? 85 : 70;
      const factorDistancia = Math.max(0.5, 1 - (i * 0.02)); // Decrece con la distancia
      const confianza = Math.round(confianzaBase * factorDistancia * factorEstacional);

      // Calcular rango de confianza
      const margenError = prediccionBase * 0.15; // 15% de margen
      const rangoConfianza = {
        minimo: Math.max(0, Math.round(ventasPredichas - margenError)),
        maximo: Math.round(ventasPredichas + margenError)
      };

      // Factores de influencia
      const factoresInfluencia = {
        tendenciaHistorica: this.tendencia > 0 ? 15 : this.tendencia < 0 ? -15 : 0,
        estacionalidad: (factorEstacional - 1) * 100,
        diaSemana: diaSemana === 0 || diaSemana === 6 ? -10 : 5, // Fines de semana típicamente bajan
        eventosEspeciales: impactoEvento * 100
      };

      predicciones.push({
        fecha: fechaStr,
        ventasPredichas,
        ingresosPredichos: Math.round(ingresosPredichos),
        confianza,
        rangoConfianza,
        factoresInfluencia
      });
    }

    return predicciones;
  }

  public obtenerInsights(): InsightsPredicciones {
    if (!this.modeloEntrenado) {
      throw new Error('El modelo no ha sido entrenado');
    }

    // Determinar tendencia
    let tendenciaCrecimiento: 'ascendente' | 'descendente' | 'estable';
    if (this.tendencia > 0.1) tendenciaCrecimiento = 'ascendente';
    else if (this.tendencia < -0.1) tendenciaCrecimiento = 'descendente';
    else tendenciaCrecimiento = 'estable';

    // Encontrar mejor y peor día
    const mejorDiaSemana = this.estacionalidad.indexOf(Math.max(...this.estacionalidad));
    const peorDiaSemana = this.estacionalidad.indexOf(Math.min(...this.estacionalidad));

    // Calcular volatilidad
    const ventas = this.datosHistoricos.map(d => d.ventas);
    const promedio = ventas.reduce((a, b) => a + b, 0) / ventas.length;
    const varianza = ventas.reduce((acc, v) => acc + Math.pow(v - promedio, 2), 0) / ventas.length;
    const volatilidad = Math.sqrt(varianza) / promedio;

    // Calcular confiabilidad del modelo (R²)
    const prediccionesSimples = ventas.slice(1).map((_, i) => ventas[i]); // Predicción naive
    const erroresCuadrados = ventas.slice(1).map((v, i) => Math.pow(v - prediccionesSimples[i], 2));
    const errorPromedio = erroresCuadrados.reduce((a, b) => a + b, 0) / erroresCuadrados.length;
    const varianzaTotal = varianza;
    const confiabilidadModelo = Math.max(0, 1 - (errorPromedio / varianzaTotal));

    // Generar recomendaciones
    const recomendaciones: string[] = [];
    
    if (tendenciaCrecimiento === 'ascendente') {
      recomendaciones.push("Tendencia positiva detectada. Considera incrementar inventario y personal.");
    } else if (tendenciaCrecimiento === 'descendente') {
      recomendaciones.push("Tendencia decreciente. Evalúa estrategias de marketing o promociones.");
    }

    if (volatilidad > 0.3) {
      recomendaciones.push("Alta volatilidad detectada. Implementa estrategias para estabilizar ventas.");
    }

    const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    recomendaciones.push(`${diasNombres[mejorDiaSemana]} es tu mejor día. Considera promociones especiales.`);
    
    if (this.datosHistoricos.length < 30) {
      recomendaciones.push("Continúa recopilando datos para mejorar la precisión de las predicciones.");
    }

    return {
      tendenciaCrecimiento,
      tasaCrecimientoDiaria: this.tendencia,
      mejorDiaSemana,
      peorDiaSemana,
      volatilidad,
      confiabilidadModelo,
      recomendaciones
    };
  }

  public obtenerEstadisticas() {
    const ventas = this.datosHistoricos.map(d => d.ventas);
    const ingresos = this.datosHistoricos.map(d => d.ingresos);
    
    return {
      totalDias: this.datosHistoricos.length,
      promedioVentasDiarias: ventas.reduce((a, b) => a + b, 0) / ventas.length,
      promedioIngresosDiarios: ingresos.reduce((a, b) => a + b, 0) / ingresos.length,
      ventasMaximas: Math.max(...ventas),
      ventasMinimas: Math.min(...ventas),
      tendenciaCalculada: this.tendencia,
      modeloEntrenado: this.modeloEntrenado
    };
  }
}