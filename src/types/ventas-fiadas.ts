// src/types/ventas-fiadas.ts
// Tipos para el sistema de ventas fiadas y pagos parciales

export interface VentaFiada {
  id: string;
  total: number;
  subtotal: number;
  montoPagado: number;
  saldoPendiente: number;
  esVentaFiada: boolean;
  estadoPago: EstadoPagoFiado;
  fechaVencimiento?: Date | string;
  diasCredito?: number;
  fechaUltimoPago?: Date | string;
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
  };
  usuario?: {
    id: string;
    nombre: string;
  };
  pagos?: PagoVentaFiada[];
  recordatorios?: RecordatorioVentaFiada[];
  createdAt: Date | string;
}

export interface PagoVentaFiada {
  id: string;
  ventaId: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  notas?: string;
  usuarioId?: string;
  fechaPago: Date | string;
  createdAt: Date | string;
}

export interface RecordatorioVentaFiada {
  id: string;
  ventaId: string;
  tipo: TipoRecordatorio;
  mensaje: string;
  fechaRecordatorio: Date | string;
  enviado: boolean;
  fechaEnvio?: Date | string;
}

export enum EstadoPagoFiado {
  PENDIENTE = 'PENDIENTE',
  PAGO_PARCIAL = 'PAGO_PARCIAL',
  PAGADO = 'PAGADO',
  VENCIDO = 'VENCIDO'
}

export enum TipoRecordatorio {
  PROXIMO_VENCIMIENTO = 'PROXIMO_VENCIMIENTO',
  DIA_VENCIMIENTO = 'DIA_VENCIMIENTO',
  VENCIDO = 'VENCIDO',
  PAGO_PARCIAL = 'PAGO_PARCIAL'
}

// Interfaces para peticiones API
export interface CrearPagoRequest {
  ventaId: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  notas?: string;
}

export interface CrearVentaFiadaRequest {
  items: any[];
  clienteId: string; // Obligatorio para ventas fiadas
  metodoPago: 'FIADO';
  montoPagado?: number; // Pago inicial opcional
  diasCredito?: number;
  fechaVencimiento?: string;
  notas?: string;
}

// Interfaces para respuestas
export interface EstadisticasVentasFiadas {
  totalVentasFiadas: number;
  montoTotalFiado: number;
  saldoPendienteTotal: number;
  ventasVencidas: number;
  montoVencido: number;
  ventasPorVencer: number; // Próximos 7 días
  montoPorVencer: number;
  ventasConPagoParcial: number;
  promedioSaldoPendiente: number;
  tasaRecuperacion: number; // Porcentaje de dinero recuperado
}

export interface VentaFiadaConDetalles extends VentaFiada {
  items: any[];
  historialPagos: PagoVentaFiada[];
  porcentajePagado: number;
  diasVencidos?: number;
  diasParaVencer?: number;
}

// Type guards
export const esVentaFiada = (venta: any): venta is VentaFiada => {
  return venta && venta.esVentaFiada === true;
};

export const tieneVencimiento = (venta: VentaFiada): boolean => {
  return !!venta.fechaVencimiento;
};

export const estaVencida = (venta: VentaFiada): boolean => {
  if (!venta.fechaVencimiento) return false;
  const fechaVenc = new Date(venta.fechaVencimiento);
  return fechaVenc < new Date() && venta.estadoPago !== EstadoPagoFiado.PAGADO;
};

export const calcularDiasVencidos = (venta: VentaFiada): number => {
  if (!venta.fechaVencimiento || !estaVencida(venta)) return 0;
  const fechaVenc = new Date(venta.fechaVencimiento);
  const hoy = new Date();
  const diff = hoy.getTime() - fechaVenc.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const calcularDiasParaVencer = (venta: VentaFiada): number => {
  if (!venta.fechaVencimiento || estaVencida(venta)) return 0;
  const fechaVenc = new Date(venta.fechaVencimiento);
  const hoy = new Date();
  const diff = fechaVenc.getTime() - hoy.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

export const calcularPorcentajePagado = (venta: VentaFiada): number => {
  if (venta.total === 0) return 0;
  return (venta.montoPagado / venta.total) * 100;
};

// Utilidades para notificaciones
export interface NotificacionVentaFiada {
  id: string;
  tipo: 'vencimiento_proximo' | 'vencida' | 'pago_registrado' | 'pago_parcial_registrado';
  ventaId: string;
  clienteNombre: string;
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  timestamp: Date;
  leida: boolean;
  accion?: {
    texto: string;
    url: string;
  };
}

export const generarMensajeNotificacion = (
  tipo: NotificacionVentaFiada['tipo'],
  venta: VentaFiada
): string => {
  const cliente = venta.cliente?.nombre || 'Cliente';
  const monto = venta.saldoPendiente.toFixed(2);
  
  switch (tipo) {
    case 'vencimiento_proximo':
      const dias = calcularDiasParaVencer(venta);
      return `La venta fiada de ${cliente} vence en ${dias} día${dias !== 1 ? 's' : ''}. Saldo: $${monto}`;
    case 'vencida':
      const diasVencidos = calcularDiasVencidos(venta);
      return `Venta fiada de ${cliente} vencida hace ${diasVencidos} día${diasVencidos !== 1 ? 's' : ''}. Saldo: $${monto}`;
    case 'pago_registrado':
      return `Pago completo recibido de ${cliente}. Venta saldada.`;
    case 'pago_parcial_registrado':
      return `Pago parcial recibido de ${cliente}. Saldo restante: $${monto}`;
    default:
      return `Actualización en venta fiada de ${cliente}`;
  }
};

// Exportar todo
export * from './ventas'; // Re-exportar tipos base de ventas