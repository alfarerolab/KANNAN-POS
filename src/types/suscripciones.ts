export interface SuscripcionInfo {
  id: string;
  nombre: string;
  email: string;
  tipoNegocio: string;
  fechaVencimiento: string | null;
  activa: boolean;
  diasRestantes: number;
  estado: 'activa' | 'por_vencer' | 'vencida' | 'suspendida';
  ultimoPago?: string;
  montoMensual: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EstadisticasSuscripciones {
  totalSuscripciones: number;
  suscripcionesActivas: number;
  porVencer: number;
  vencidas: number;
  ingresosMensuales: number;
}

export interface DatosSuscripciones {
  suscripciones: SuscripcionInfo[];
  estadisticas: EstadisticasSuscripciones;
}

export interface MetricasCalculadas extends EstadisticasSuscripciones {
  mrr: number;  // Monthly Recurring Revenue
  arr: number;  // Annual Recurring Revenue
  churnRate: number;  // Tasa de cancelación
  tasaCrecimiento: number;  // Tasa de crecimiento mensual
}

export interface RenovacionRequest {
  meses: number;
}

export interface RenovacionResponse {
  mensaje: string;
  empresa: SuscripcionInfo;
  nuevaFechaVencimiento: string;
}

export interface DatosGrafico {
  name: string;
  value: number;
  color?: string;
}

export interface DatosGraficoIngresos {
  name: string;
  ingresos: number;
}

// Enums para mejor tipado
export enum EstadoSuscripcion {
  ACTIVA = 'activa',
  POR_VENCER = 'por_vencer',
  VENCIDA = 'vencida',
  SUSPENDIDA = 'suspendida'
}

export enum TipoFiltro {
  TODOS = 'todos',
  ESTADO = 'estado',
  TIPO_NEGOCIO = 'tipo_negocio'
}

// Configuración de planes
export const PLANES_RENOVACION = [
  { meses: 1, precio: 30000, etiqueta: '1 mes' },
  { meses: 3, precio: 90000, etiqueta: '3 meses' },
  { meses: 6, precio: 180000, etiqueta: '6 meses' },
  { meses: 12, precio: 360000, etiqueta: '12 meses' }
] as const;

export type PlanRenovacion = typeof PLANES_RENOVACION[number];