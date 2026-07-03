export interface Categoria {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  precio: number;
  categoria?: { nombre: string };
  cantidadVendida: number;
  ingresosTotales: number;
  numeroVentas: number;
  promedioVenta: number;
}

export interface Vendedor {
  id: string;
  nombre: string;
  email?: string;
  totalVentas: number;
  ingresosTotales: number;
  ticketPromedio: number;
  ventasCompletadas: number;
  tasaConversion: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  cantidadVentas: number;
  totalCompras: number;
}

// Interfaces principales que coinciden con el hook
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

// Tipo unión que coincide exactamente con el hook
export type DatosAnalisis = EstadisticasGenerales | TendenciasVentas | AnalisisProductos | 
                           AnalisisVendedores | AnalisisMetodosPago | AnalisisComparativo;

// Alias para compatibilidad - ahora DatosVentas es lo mismo que DatosAnalisis
export type DatosVentas = DatosAnalisis;

// Type guards que coinciden con el hook
export const esTendenciasVentas = (datos: any): datos is TendenciasVentas => {
  return datos && "tendencias" in datos && Array.isArray(datos.tendencias);
};

export const esEstadisticasGenerales = (datos: any): datos is EstadisticasGenerales => {
  return datos && "resumen" in datos && "ventasPorEstado" in datos;
};

export const esAnalisisProductos = (datos: any): datos is AnalisisProductos => {
  return datos && "topProductosCantidad" in datos;
};

export const esAnalisisVendedores = (datos: any): datos is AnalisisVendedores => {
  return datos && "vendedores" in datos && !("resumen" in datos);
};

export const esAnalisisComparativo = (datos: any): datos is AnalisisComparativo => {
  return datos && "comparativo" in datos;
};

export const esAnalisisMetodosPago = (datos: any): datos is AnalisisMetodosPago => {
  return datos && "metodosPago" in datos;
};

// Tipos para hooks específicos
export interface Alerta {
  id: string;
  tipo: 'critica' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  timestamp: Date;
  accion?: string;
}

export interface Meta {
  objetivo: number;
  actual: number;
  progreso: number;
}

export interface Metas {
  diaria: Meta;
  semanal: Meta;
  mensual: Meta;
}

// Interfaces para notificaciones
export interface Notificacion {
  id: string;
  tipo: 'nueva_venta' | 'meta_alcanzada' | 'venta_pendiente' | 'alerta_inventario';
  mensaje: string;
  timestamp: Date;
  leida: boolean;
}

// Interfaces para métricas comparativas
export interface MetricasComparativas {
  actual: any;
  anterior: any;
  comparacion: any;
}

// Interfaces para predicciones
export interface PronosticoVentas {
  ventasProyectadas: number;
  ingresosProyectados: number;
  tendencia: 'ascendente' | 'descendente' | 'estable';
  confianza: number;
  factores: string[];
}

// Tipos de interfaz para componentes específicos
export interface VentaPorEstado {
  estado: string;
  cantidad: number;
  ingresos: number;
}

export interface TendenciaVenta {
  fecha: Date;
  cantidad: number;
  ingresos: number;
  promedio: number;
}

// Re-exportar algunos tipos con nombres alternativos para compatibilidad
export type DatosTendencias = TendenciasVentas;
export type DatosEstadisticasGenerales = EstadisticasGenerales;
export type DatosAnalisisComparativo = AnalisisComparativo;