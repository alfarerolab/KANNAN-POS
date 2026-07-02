// Importaciones originales de Prisma comentadas por seguridad en el cliente
// import { EstadoPreparacionRestaurante, EstacionPreparacionRestaurante } from "@prisma/client";

import type { RestaurantePedido } from "@/types/restaurante";

interface EstacionInput {
  categoria?: string | null;
  nombreProducto?: string | null;
}

export const ESTACIONES_PREPARACION = [
  "COCINA",
  "BARRA",
  "GENERAL",
] as const;

export const ESTADOS_PREPARACION = [
  "PENDIENTE",
  "EN_PREPARACION",
  "LISTO",
  "ENTREGADO",
] as const;

export function inferirEstacionPreparacion({
  categoria,
  nombreProducto,
}: EstacionInput) {
  const referencia = `${categoria || ""} ${nombreProducto || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    /(bar|bebida|coctel|cocktail|cerveza|vino|licor|refresco|gaseosa|jugo|cafe|te|smoothie|malteada)/.test(
      referencia
    )
  ) {
    return "BARRA";
  }

  if (/(propina|servicio|cover|cubierto|extra)/.test(referencia)) {
    return "GENERAL";
  }

  return "COCINA";
}

export function getEstacionPreparacionLabel(
  estacion: string
) {
  switch (estacion) {
    case "BARRA":
      return "Barra";
    case "GENERAL":
      return "General";
    default:
      return "Cocina";
  }
}

export function getEstadoPreparacionLabel(
  estado: string
) {
  switch (estado) {
    case "EN_PREPARACION":
      return "En preparación";
    case "LISTO":
      return "Listo";
    case "ENTREGADO":
      return "Entregado";
    default:
      return "Pendiente";
  }
}

export function getEstadoPreparacionTone(
  estado: string
) {
  switch (estado) {
    case "EN_PREPARACION":
      return "bg-amber-100 text-amber-800";
    case "LISTO":
      return "bg-emerald-100 text-emerald-700";
    case "ENTREGADO":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-orange-100 text-orange-700";
  }
}

export function construirTicketRestaurante(args: {
  pedido: RestaurantePedido;
  venta: {
    id: string;
    subtotal: number;
    impuesto: number;
    total: number;
    createdAt: string;
    metodoPago: string;
  };
  empresa?: {
    nombre?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    nit?: string | null;
  } | null;
  cliente?: {
    nombre?: string | null;
    telefono?: string | null;
  } | null;
  usuario?: {
    nombre?: string | null;
  } | null;
}) {
  const { pedido, venta, empresa, cliente, usuario } = args;

  return {
    venta: {
      ...venta,
      fechaCreacion: venta.createdAt,  // alias para TicketPrinter
    },
    empresa: {
      nombre: empresa?.nombre || "Mi Empresa",
      direccion: empresa?.direccion || undefined,
      telefono: empresa?.telefono || undefined,
      email: empresa?.email || undefined,
      nit: empresa?.nit || undefined,
    },
    cliente:
      cliente?.nombre || pedido.cliente?.nombre
        ? {
            nombre: cliente?.nombre || pedido.cliente?.nombre || "Consumidor final",
            telefono: cliente?.telefono || pedido.cliente?.telefono || undefined,
          }
        : undefined,
    items: pedido.items.map((item) => ({
      id: item.id,
      cantidad: item.cantidad,
      subtotal: item.subtotal,
      producto: {
        id: item.producto.id,
        nombre: item.nombreProducto,
        precio: item.precioUnitario,
        tipoVenta: item.producto.tipoVenta,
        esExentoIva: item.producto.esExentoIva ?? true,
        tarifaIva: item.producto.tarifaIva ?? 0,
        incluyeIva: item.producto.incluyeIva ?? false,
        empresaId: item.producto.empresaId,
      },
    })),
    subtotal: venta.subtotal,
    impuesto: venta.impuesto,
    total: venta.total,
    metodoPago: venta.metodoPago,
    terminal: {
      nombre: "Restaurante",
    },
    usuario: {
      nombre: usuario?.nombre || pedido.usuario.nombre,
    },
  };
}

export function calcularDivisionIgual(total: number, personas: number) {
  const cantidadPersonas = Math.max(1, Math.floor(personas || 1));
  return {
    personas: cantidadPersonas,
    valorPorPersona: total / cantidadPersonas,
  };
}

export function calcularDivisionPorItems(
  pedido: RestaurantePedido,
  cantidades: Record<string, number>
) {
  const seleccionado = pedido.items
    .map((item) => {
      const cantidadSeleccionada = Math.max(
        0,
        Math.min(item.cantidad, cantidades[item.id] || 0)
      );

      return {
        item,
        cantidadSeleccionada,
        subtotalSeleccionado: cantidadSeleccionada * item.precioUnitario,
      };
    })
    .filter((item) => item.cantidadSeleccionada > 0);

  const totalSeleccionado = seleccionado.reduce(
    (acumulado, item) => acumulado + item.subtotalSeleccionado,
    0
  );

  return {
    items: seleccionado,
    totalSeleccionado,
    totalRestante: Math.max(0, pedido.total - totalSeleccionado),
  };
}
