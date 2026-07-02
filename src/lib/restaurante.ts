import { Prisma, PrismaClient } from "@prisma/client";
import { EstadoPreparacionRestaurante, EstadoMesaRestaurante, EstadoPedidoRestaurante, EstacionPreparacionRestaurante } from "./prisma-types";
import { Decimal } from "@prisma/client/runtime/library";

import type {
  RestauranteMesa,
  RestaurantePreparacionItem,
  RestaurantePedido,
} from "@/types/restaurante";
import { inferirEstacionPreparacion } from "@/lib/restaurante-shared";

export const pedidoRestauranteInclude =
  Prisma.validator<Prisma.PedidoRestauranteInclude>()({
    cliente: {
      select: {
        id: true,
        nombre: true,
        telefono: true,
      },
    },
    usuario: {
      select: {
        id: true,
        nombre: true,
      },
    },
    mesas: {
      include: {
        mesa: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
    },
    items: {
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            enStock: true,
            precio: true,
            tipoVenta: true,
            empresaId: true,
            esExentoIva: true,
            tarifaIva: true,
            incluyeIva: true,
            categoria: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    },
  });

export const mesaRestauranteInclude =
  Prisma.validator<Prisma.MesaRestauranteInclude>()({
    pedidos: {
      where: {
        pedido: {
          estado: "ABIERTO",
        },
      },
      include: {
        pedido: {
          include: pedidoRestauranteInclude,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 1,
    },
  });

export type PedidoRestauranteConRelaciones = Prisma.PedidoRestauranteGetPayload<{
  include: typeof pedidoRestauranteInclude;
}>;

export type MesaRestauranteConPedido = Prisma.MesaRestauranteGetPayload<{
  include: typeof mesaRestauranteInclude;
}>;

type DbLike = Prisma.TransactionClient | PrismaClient;

export function decimalANumero(
  valor: Decimal | number | string | null | undefined
) {
  if (valor == null) {
    return 0;
  }

  if (typeof valor === "number") {
    return valor;
  }

  if (typeof valor === "string") {
    return Number(valor);
  }

  return Number(valor.toString());
}

export function serializarPedidoRestaurante(
  pedido: PedidoRestauranteConRelaciones
): RestaurantePedido {
  return {
    id: pedido.id,
    estado: pedido.estado,
    nombreCuenta: pedido.nombreCuenta,
    notas: pedido.notas,
    comensales: pedido.comensales,
    subtotal: decimalANumero(pedido.subtotal),
    impuesto: decimalANumero(pedido.impuesto),
    total: decimalANumero(pedido.total),
    ventaId: pedido.ventaId,
    fechaFacturacion: pedido.fechaFacturacion?.toISOString() ?? null,
    createdAt: pedido.createdAt.toISOString(),
    updatedAt: pedido.updatedAt.toISOString(),
    cliente: pedido.cliente
      ? {
          id: pedido.cliente.id,
          nombre: pedido.cliente.nombre,
          telefono: pedido.cliente.telefono,
        }
      : null,
    usuario: pedido.usuario,
    mesas: pedido.mesas.map((mesaPedido) => ({
      id: mesaPedido.id,
      esPrincipal: mesaPedido.esPrincipal,
      mesa: mesaPedido.mesa,
    })),
    items: pedido.items.map((item) => ({
      id: item.id,
      productoId: item.productoId,
      nombreProducto: item.nombreProducto,
      cantidad: item.cantidad,
      precioUnitario: decimalANumero(item.precioUnitario),
      subtotal: decimalANumero(item.subtotal),
      notas: item.notas,
      esCortesia: item.esCortesia,
      estacion: item.estacion,
      estadoPreparacion: item.estadoPreparacion,
      fechaSolicitud: item.fechaSolicitud.toISOString(),
      fechaListo: item.fechaListo?.toISOString() ?? null,
      fechaEntrega: item.fechaEntrega?.toISOString() ?? null,
      producto: {
        id: item.producto.id,
        nombre: item.producto.nombre,
        enStock: decimalANumero(item.producto.enStock),
        precio: item.producto.precio == null ? null : decimalANumero(item.producto.precio),
        tipoVenta: item.producto.tipoVenta,
        empresaId: item.producto.empresaId,
        esExentoIva: item.producto.esExentoIva,
        tarifaIva:
          item.producto.tarifaIva == null
            ? null
            : decimalANumero(item.producto.tarifaIva),
        incluyeIva: item.producto.incluyeIva,
        categoria: item.producto.categoria,
      },
    })),
  };
}

export function serializarMesaRestaurante(
  mesa: MesaRestauranteConPedido
): RestauranteMesa {
  const pedidoAbierto = mesa.pedidos[0]?.pedido ?? null;

  return {
    id: mesa.id,
    nombre: mesa.nombre,
    capacidad: mesa.capacidad,
    ubicacion: mesa.ubicacion,
    activa: mesa.activa,
    estado: mesa.estado,
    createdAt: mesa.createdAt.toISOString(),
    updatedAt: mesa.updatedAt.toISOString(),
    pedidoAbierto: pedidoAbierto
      ? serializarPedidoRestaurante(pedidoAbierto)
      : null,
  };
}

export async function obtenerPedidoAbiertoPorMesa(
  db: DbLike,
  mesaId: string
) {
  const mesaPedido = await db.pedidoMesaRestaurante.findFirst({
    where: {
      mesaId,
      pedido: {
        estado: "ABIERTO",
      },
    },
    include: {
      pedido: {
        include: pedidoRestauranteInclude,
      },
    },
  });

  return mesaPedido?.pedido ?? null;
}

export async function recalcularTotalesPedido(
  db: DbLike,
  pedidoId: string
) {
  const items = await db.pedidoRestauranteItem.findMany({
    where: { pedidoId },
    select: { subtotal: true },
  });

  const subtotal = items.reduce(
    (acumulado, item) => acumulado.plus(item.subtotal),
    new Decimal(0)
  );

  return db.pedidoRestaurante.update({
    where: { id: pedidoId },
    data: {
      subtotal,
      impuesto: new Decimal(0),
      total: subtotal,
    },
    include: pedidoRestauranteInclude,
  });
}

export function determinarEstacionPreparacion(input: {
  categoria?: string | null;
  nombreProducto?: string | null;
}) {
  return inferirEstacionPreparacion(input);
}

export function serializarPreparacionItem(
  item: Prisma.PedidoRestauranteItemGetPayload<{
    include: {
      pedido: {
        include: {
          cliente: {
            select: {
              nombre: true;
            };
          };
          mesas: {
            include: {
              mesa: {
                select: {
                  nombre: true;
                };
              };
            };
          };
        };
      };
    };
  }>
): RestaurantePreparacionItem {
  const mesas = item.pedido.mesas
    .map((mesaPedido) => mesaPedido.mesa.nombre)
    .filter(Boolean);

  return {
    id: item.id,
    pedidoId: item.pedidoId,
    mesaPrincipal: mesas[0] || "Sin mesa",
    mesas,
    nombreCuenta: item.pedido.nombreCuenta,
    cliente: item.pedido.cliente?.nombre ?? null,
    productoId: item.productoId,
    nombreProducto: item.nombreProducto,
    cantidad: item.cantidad,
    subtotal: decimalANumero(item.subtotal),
    notas: item.notas,
    esCortesia: item.esCortesia,
    estacion: item.estacion,
    estadoPreparacion: item.estadoPreparacion,
    fechaSolicitud: item.fechaSolicitud.toISOString(),
    createdAt: item.createdAt.toISOString(),
  };
}

export async function actualizarEstadoPreparacionItem(
  db: DbLike,
  itemId: string,
  estadoPreparacion: EstadoPreparacionRestaurante
) {
  const ahora = new Date();

  return db.pedidoRestauranteItem.update({
    where: { id: itemId },
    data: {
      estadoPreparacion,
      fechaListo:
        estadoPreparacion === "LISTO"
          ? ahora
          : estadoPreparacion === "ENTREGADO"
            ? undefined
            : null,
      fechaEntrega:
        estadoPreparacion === "ENTREGADO"
          ? ahora
          : null,
    },
  });
}

export async function actualizarEstadoMesasDePedido(
  db: DbLike,
  pedidoId: string,
  estado: EstadoMesaRestaurante
) {
  const mesas = await db.pedidoMesaRestaurante.findMany({
    where: { pedidoId },
    select: { mesaId: true },
  });

  if (mesas.length === 0) {
    return;
  }

  await db.mesaRestaurante.updateMany({
    where: {
      id: {
        in: mesas.map((mesa) => mesa.mesaId),
      },
    },
    data: { estado },
  });
}
