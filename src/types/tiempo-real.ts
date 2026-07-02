// src/types/tiempo-real.ts
export interface VentaReciente {
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

export interface MetricasTiempoReal {
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

export interface EstadoSistema {
  conectado: boolean;
  ultimaActualizacion: string;
  rendimiento: number;
}

export interface AlertaTiempoReal {
  id: string;
  tipo: 'critica' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  timestamp: string;
  datos?: any;
}

export interface DatosTiempoReal {
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

export interface ConfiguracionTiempoReal {
  intervaloActualizacion: number; // en milisegundos
  autoRefresh: boolean;
  mostrarNotificaciones: boolean;
  sonidosActivados: boolean;
}

export interface ActividadUsuario {
  id: string;
  usuarioId: string;
  empresaId: string;
  accion: string;
  detalles?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}