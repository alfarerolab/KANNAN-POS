import type { EstadoPreparacionRestaurante, EstadoMesaRestaurante, EstadoPedidoRestaurante, EstacionPreparacionRestaurante, MetodoPago } from "../lib/prisma-types";
export type MetodoPagoRestaurante = Exclude<MetodoPago, "FIADO" | "MIXTO">;

export interface RestauranteMesaResumen {
  id: string;
  nombre: string;
}

export interface RestauranteClienteResumen {
  id: string;
  nombre: string;
  telefono?: string | null;
}

export interface RestaurantePedidoItem {
  id: string;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas?: string | null;
  esCortesia: boolean;
  estacion: EstacionPreparacionRestaurante;
  estadoPreparacion: EstadoPreparacionRestaurante;
  fechaSolicitud: string;
  fechaListo?: string | null;
  fechaEntrega?: string | null;
  producto: {
    id: string;
    nombre: string;
    enStock: number;
    precio: number | null;
    tipoVenta: string;
    empresaId: string;
    esExentoIva?: boolean | null;
    tarifaIva?: number | null;
    incluyeIva?: boolean | null;
    categoria?: {
      id: string;
      nombre: string;
    } | null;
  };
}

export interface RestaurantePedido {
  id: string;
  estado: EstadoPedidoRestaurante;
  nombreCuenta?: string | null;
  notas?: string | null;
  comensales: number;
  subtotal: number;
  impuesto: number;
  total: number;
  ventaId?: string | null;
  fechaFacturacion?: string | null;
  createdAt: string;
  updatedAt: string;
  cliente?: RestauranteClienteResumen | null;
  usuario: {
    id: string;
    nombre: string;
  };
  mesas: Array<{
    id: string;
    esPrincipal: boolean;
    mesa: RestauranteMesaResumen;
  }>;
  items: RestaurantePedidoItem[];
}

export interface RestauranteMesa {
  id: string;
  nombre: string;
  capacidad: number;
  ubicacion?: string | null;
  activa: boolean;
  estado: EstadoMesaRestaurante;
  createdAt: string;
  updatedAt: string;
  pedidoAbierto?: RestaurantePedido | null;
}

export interface RestauranteMesaPayload {
  nombre: string;
  capacidad: number;
  ubicacion?: string;
  estado?: EstadoMesaRestaurante;
  activa?: boolean;
}

export interface RestaurantePedidoPayload {
  mesaId: string;
  clienteId?: string;
  nombreCuenta?: string;
  notas?: string;
  comensales?: number;
}

export interface RestauranteAddItemPayload {
  productoId: string;
  cantidad?: number;
  notas?: string;
  estacion?: EstacionPreparacionRestaurante;
  esCortesia?: boolean;
  estadoPreparacion?: EstadoPreparacionRestaurante;
}

export interface RestauranteUpdateItemPayload {
  cantidad?: number;
  notas?: string;
  estacion?: EstacionPreparacionRestaurante;
  estadoPreparacion?: EstadoPreparacionRestaurante;
  esCortesia?: boolean;
}

export interface RestauranteFacturarPayload {
  metodoPago: MetodoPagoRestaurante;
  clienteId?: string;
  notas?: string;
}

export interface RestauranteMoverMesaPayload {
  mesaOrigenId: string;
  mesaDestinoId: string;
}

export interface RestaurantePreparacionItem {
  id: string;
  pedidoId: string;
  mesaPrincipal: string;
  mesas: string[];
  nombreCuenta?: string | null;
  cliente?: string | null;
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  subtotal: number;
  notas?: string | null;
  esCortesia: boolean;
  estacion: EstacionPreparacionRestaurante;
  estadoPreparacion: EstadoPreparacionRestaurante;
  fechaSolicitud: string;
  createdAt: string;
}

export interface RestauranteReporteTopProducto {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  total: number;
}

export interface RestauranteReporteResumen {
  fecha: string;
  mesas: {
    total: number;
    activas: number;
    libres: number;
    ocupadas: number;
    reservadas: number;
    limpieza: number;
    inactivas: number;
  };
  pedidosAbiertos: number;
  consumoAbierto: number;
  ventasHoy: {
    cantidad: number;
    total: number;
    ticketPromedio: number;
  };
  preparacion: {
    cocina: number;
    barra: number;
    general: number;
    listos: number;
  };
  topProductos: RestauranteReporteTopProducto[];
}
