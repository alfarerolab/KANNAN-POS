import { Prisma, PrismaClient } from "@prisma/client";
import { EstadoMesaRestaurante, MetodoPago } from "./prisma-types";
import { Decimal } from "@prisma/client/runtime/library";

import {
  pedidoRestauranteInclude,
  recalcularTotalesPedido,
} from "@/lib/restaurante";

type DbLike = Prisma.TransactionClient | PrismaClient;

export interface FraccionPago {
  metodoPago: MetodoPago;
  monto: number;
}

interface FacturarPedidoRestauranteInput {
  db: DbLike;
  pedidoId: string;
  empresaId: string;
  usuarioId: string;
  metodoPago: MetodoPago;
  pagosMultiples?: FraccionPago[];
  clienteId?: string | null;
  notas?: string;
}

export async function facturarPedidoRestaurante({
  db,
  pedidoId,
  empresaId,
  usuarioId,
  metodoPago,
  pagosMultiples,
  clienteId,
  notas,
}: FacturarPedidoRestauranteInput) {
  const pedidoBase = await db.pedidoRestaurante.findFirst({
    where: {
      id: pedidoId,
      empresaId,
      estado: "ABIERTO",
    },
    select: {
      id: true,
    },
  });

  if (!pedidoBase) {
    throw new Error("PEDIDO_NO_ENCONTRADO");
  }

  const pedidoActualizado = await recalcularTotalesPedido(db, pedidoBase.id);

  const pedido = await db.pedidoRestaurante.findFirst({
    where: {
      id: pedidoActualizado.id,
      empresaId,
      estado: "ABIERTO",
    },
    include: pedidoRestauranteInclude,
  });

  if (!pedido) {
    throw new Error("PEDIDO_NO_ENCONTRADO");
  }

  if (pedido.items.length === 0) {
    throw new Error("PEDIDO_VACIO");
  }

  const clienteFinalId = clienteId ?? pedido.clienteId ?? null;

  if (clienteFinalId) {
    const cliente = await db.cliente.findFirst({
      where: {
        id: clienteFinalId,
        empresaId,
      },
      select: { id: true },
    });

    if (!cliente) {
      throw new Error("CLIENTE_INVALIDO");
    }
  }

  // ─── Resolver stock ──────────────────────────────────────────────────────────
  const cantidadesPorProducto = new Map<string, number>();
  const productoIdsDelPedido = new Set<string>();

  for (const item of pedido.items) {
    productoIdsDelPedido.add(item.productoId);
  }

  const productosDelPedido = await db.producto.findMany({
    where: {
      id: { in: Array.from(productoIdsDelPedido) },
      empresaId,
    },
    select: {
      id: true,
      nombre: true,
      enStock: true,
      esCombo: true,
      componentes: {
        select: {
          componenteId: true,
          cantidad: true,
          esCortesia: true,
          componente: {
            select: {
              id: true,
              nombre: true,
              enStock: true,
            },
          },
        },
      },
    },
  });

  if (productosDelPedido.length !== productoIdsDelPedido.size) {
    throw new Error("PRODUCTOS_INVALIDOS");
  }

  const productoMap = new Map(productosDelPedido.map((p) => [p.id, p]));

  for (const item of pedido.items) {
    const prod = productoMap.get(item.productoId);
    if (!prod) continue;

    if (prod.esCombo && prod.componentes.length > 0) {
      for (const comp of prod.componentes) {
        const cantidadTotal = comp.cantidad * item.cantidad;
        cantidadesPorProducto.set(
          comp.componenteId,
          (cantidadesPorProducto.get(comp.componenteId) ?? 0) + cantidadTotal
        );
      }
    } else {
      cantidadesPorProducto.set(
        item.productoId,
        (cantidadesPorProducto.get(item.productoId) ?? 0) + item.cantidad
      );
    }
  }

  const idsADescontar = Array.from(cantidadesPorProducto.keys());
  const productosADescontar =
    idsADescontar.length > 0
      ? await db.producto.findMany({
          where: { id: { in: idsADescontar }, empresaId },
          select: { id: true, nombre: true, enStock: true },
        })
      : [];

  for (const producto of productosADescontar) {
    const cantidadSolicitada = cantidadesPorProducto.get(producto.id) ?? 0;
    const stockDisponible = new Decimal(producto.enStock);

    if (stockDisponible.lessThan(cantidadSolicitada)) {
      throw new Error(`STOCK_INSUFICIENTE:${producto.nombre}`);
    }
  }

  const esMultiple = pagosMultiples && pagosMultiples.length > 0;
  const metodoPagoFinal = esMultiple ? "MIXTO" : metodoPago;

  // ─── Todo dentro de la misma transacción ────────────────────────────────────
  const venta = await db.venta.create({
    data: {
      subtotal: pedido.subtotal,
      impuesto: pedido.impuesto,
      descuento: new Decimal(0),
      total: pedido.total,
      metodoPago: metodoPagoFinal as MetodoPago,
      estado: "COMPLETADA",
      empresaId,
      usuarioId,
      clienteId: clienteFinalId,
      notas: notas?.trim() || pedido.notas,
      items: {
        create: pedido.items.map((item) => ({
          cantidad: new Decimal(item.cantidad),
          cantidadEntera: item.cantidad,
          precio: item.esCortesia ? new Decimal(0) : item.precioUnitario,
          subtotal: item.esCortesia ? new Decimal(0) : item.subtotal,
          productoId: item.productoId,
        })),
      },
      pagos: esMultiple
        ? {
            create: pagosMultiples.map((p) => ({
              metodoPago: p.metodoPago,
              monto: new Decimal(p.monto),
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      subtotal: true,
      impuesto: true,
      total: true,
      createdAt: true,
      metodoPago: true,
      clienteId: true,
    },
  });

  // ─── Descontar stock ─────────────────────────────────────────────────────────
  for (const producto of productosADescontar) {
    const cantidadVendida = cantidadesPorProducto.get(producto.id) ?? 0;
    const stockActual = new Decimal(producto.enStock);
    const nuevoStock = stockActual.minus(cantidadVendida);

    await db.producto.update({
      where: { id: producto.id },
      data: { enStock: nuevoStock },
    });

    await db.movimientoInventario.create({
      data: {
        productoId: producto.id,
        usuarioId,
        cantidad: -cantidadVendida,
        tipo: "SALIDA",
        stockPrevio: stockActual.toNumber(),
        stockNuevo: nuevoStock.toNumber(),
        motivo: `Cuenta restaurante ${pedido.id} facturada como venta ${venta.id}`,
        fechaMovimiento: new Date(),
      },
    });
  }

  // ─── Actualizar pedido ───────────────────────────────────────────────────────
  const pedidoFacturado = await db.pedidoRestaurante.update({
    where: { id: pedido.id },
    data: {
      estado: "FACTURADO",
      ventaId: venta.id,
      clienteId: clienteFinalId,
      notas: notas?.trim() || pedido.notas,
      fechaFacturacion: new Date(),
    },
    include: pedidoRestauranteInclude,
  });

  // ─── Liberar mesas — dentro de la misma transacción ─────────────────────────
  const mesasDelPedido = await db.pedidoMesaRestaurante.findMany({
    where: { pedidoId: pedido.id },
    select: { mesaId: true },
  });

  if (mesasDelPedido.length > 0) {
    await db.mesaRestaurante.updateMany({
      where: {
        id: { in: mesasDelPedido.map((m) => m.mesaId) },
      },
      data: { estado: "LIBRE" },
    });
  }

  return {
    pedido: pedidoFacturado,
    venta: {
      ...venta,
      subtotal: Number(venta.subtotal),
      impuesto: Number(venta.impuesto),
      total: Number(venta.total),
    },
  };
}

export interface FraccionItemPedido {
  itemId: string;
  cantidadAExtraer: number;
}

export async function dividirPedidoPorItems({
  db,
  pedidoId,
  items,
  empresaId,
  usuarioId,
}: {
  db: DbLike;
  pedidoId: string;
  items: FraccionItemPedido[];
  empresaId: string;
  usuarioId: string;
}) {
  const pedidoOriginal = await db.pedidoRestaurante.findFirst({
    where: {
      id: pedidoId,
      empresaId,
      estado: "ABIERTO",
    },
    include: {
      items: true,
      mesas: true,
    },
  });

  if (!pedidoOriginal) {
    throw new Error("PEDIDO_NO_ENCONTRADO");
  }

  for (const fraction of items) {
    const itemEnPedido = pedidoOriginal.items.find((i) => i.id === fraction.itemId);
    if (!itemEnPedido) {
      throw new Error(`ITEM_NO_ENCONTRADO:${fraction.itemId}`);
    }
    if (fraction.cantidadAExtraer > itemEnPedido.cantidad) {
      throw new Error(`CANTIDAD_INVALIDA:${itemEnPedido.nombreProducto}`);
    }
  }

  const nuevoPedido = await db.pedidoRestaurante.create({
    data: {
      empresaId: pedidoOriginal.empresaId,
      usuarioId: usuarioId,
      clienteId: pedidoOriginal.clienteId,
      estado: "ABIERTO",
      nombreCuenta: pedidoOriginal.nombreCuenta
        ? `${pedidoOriginal.nombreCuenta} (Split)`
        : null,
      comensales: 1,
      mesas: {
        create: pedidoOriginal.mesas.map((m) => ({
          mesaId: m.mesaId,
          esPrincipal: m.esPrincipal,
        })),
      },
    },
  });

  for (const fraction of items) {
    const itemOriginal = pedidoOriginal.items.find((i) => i.id === fraction.itemId)!;
    const precio = Number(itemOriginal.precioUnitario);

    await db.pedidoRestauranteItem.create({
      data: {
        pedidoId: nuevoPedido.id,
        productoId: itemOriginal.productoId,
        nombreProducto: itemOriginal.nombreProducto,
        precioUnitario: itemOriginal.precioUnitario,
        cantidad: fraction.cantidadAExtraer,
        subtotal: new Decimal(fraction.cantidadAExtraer * precio),
        estacion: itemOriginal.estacion,
        estadoPreparacion: itemOriginal.estadoPreparacion,
        notas: itemOriginal.notas,
      },
    });

    const cantidadRestante = itemOriginal.cantidad - fraction.cantidadAExtraer;
    if (cantidadRestante <= 0) {
      await db.pedidoRestauranteItem.delete({
        where: { id: itemOriginal.id },
      });
    } else {
      await db.pedidoRestauranteItem.update({
        where: { id: itemOriginal.id },
        data: {
          cantidad: cantidadRestante,
          subtotal: new Decimal(cantidadRestante * precio),
        },
      });
    }
  }

  await recalcularTotalesPedido(db, pedidoOriginal.id);
  const pedidoFraccionadoFinal = await recalcularTotalesPedido(db, nuevoPedido.id);

  return pedidoFraccionadoFinal;
}