import { Prisma } from "@prisma/client";
import { EstadoPedidoRestaurante, EstadoPreparacionRestaurante, EstacionPreparacionRestaurante } from "../../../../../../../lib/prisma-types";
import { Decimal } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  recalcularTotalesPedido,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";
import { resolverPrecio } from "@/lib/precio-dinamico";

interface ContextoRuta {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, itemId } = await context.params;
    const body = await req.json();
    const cantidad =
      body.cantidad === undefined ? undefined : Number(body.cantidad);
    const notas =
      body.notas === undefined
        ? undefined
        : typeof body.notas === "string" && body.notas.trim()
          ? body.notas.trim()
          : null;
    const estacion =
      body.estacion === undefined
        ? undefined
        : (body.estacion as EstacionPreparacionRestaurante);
    const estadoPreparacion =
      body.estadoPreparacion === undefined
        ? undefined
        : (body.estadoPreparacion as EstadoPreparacionRestaurante);
    const esCortesia = body.esCortesia === undefined ? undefined : Boolean(body.esCortesia);

    if (
      cantidad !== undefined &&
      (!Number.isInteger(cantidad) || cantidad <= 0)
    ) {
      return NextResponse.json(
        { error: "La cantidad debe ser un entero mayor a cero" },
        { status: 400 }
      );
    }

    if (
      estacion !== undefined &&
      !Object.values(EstacionPreparacionRestaurante).includes(estacion)
    ) {
      return NextResponse.json(
        { error: "La estación de preparación no es válida" },
        { status: 400 }
      );
    }

    if (
      estadoPreparacion !== undefined &&
      !Object.values(EstadoPreparacionRestaurante).includes(estadoPreparacion)
    ) {
      return NextResponse.json(
        { error: "El estado de preparación no es válido" },
        { status: 400 }
      );
    }

    if (
      cantidad === undefined &&
      notas === undefined &&
      estacion === undefined &&
      estadoPreparacion === undefined &&
      esCortesia === undefined
    ) {
      return NextResponse.json(
        { error: "No hay cambios para actualizar" },
        { status: 400 }
      );
    }

    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
      },
      select: {
        id: true,
        estado: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (pedido.estado !== "ABIERTO") {
      return NextResponse.json(
        { error: "Solo puedes editar pedidos abiertos" },
        { status: 400 }
      );
    }

    const item = await db.pedidoRestauranteItem.findFirst({
      where: {
        id: itemId,
        pedidoId: pedido.id,
      },
      select: {
        id: true,
        precioUnitario: true,
        estadoPreparacion: true,
        esCortesia: true,
        producto: {
          select: {
            nombre: true,
            enStock: true,
            precio: true,
            precioEspecial: true,
            diasPrecioEspecial: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Producto del pedido no encontrado" },
        { status: 404 }
      );
    }

    if (cantidad !== undefined && Number(item.producto.enStock || 0) < cantidad) {
      return NextResponse.json(
        { error: `${item.producto.nombre} no tiene stock suficiente para actualizar a ${cantidad} unidad(es)` },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      let precio = new Decimal(item.precioUnitario);
      const data: Prisma.PedidoRestauranteItemUpdateInput = {};

      // Handle esCortesia toggle — must update price accordingly
      if (esCortesia !== undefined) {
        data.esCortesia = esCortesia;
        if (esCortesia) {
          // Marking as courtesy: price goes to $0
          precio = new Decimal(0);
          data.precioUnitario = new Decimal(0);
          data.subtotal = new Decimal(0);
        } else {
          // Removing courtesy: restore product's real price
          const precioReal = new Decimal(resolverPrecio({
            precio: Number(item.producto.precio),
            precioEspecial: item.producto.precioEspecial ? Number(item.producto.precioEspecial) : null,
            diasPrecioEspecial: item.producto.diasPrecioEspecial,
          }));
          precio = precioReal;
          data.precioUnitario = precioReal;
          const itemActual = await tx.pedidoRestauranteItem.findUnique({ where: { id: item.id }, select: { cantidad: true } });
          data.subtotal = precioReal.mul(itemActual?.cantidad ?? 1);
        }
      }

      if (cantidad !== undefined) {
        data.cantidad = cantidad;
        data.subtotal = precio.mul(cantidad);
      }

      if (notas !== undefined) {
        data.notas = notas;
      }

      if (estacion !== undefined) {
        data.estacion = estacion;
      }

      const debeResetearPreparacion =
        estadoPreparacion === undefined &&
        (cantidad !== undefined || notas !== undefined || estacion !== undefined) &&
        item.estadoPreparacion !== "ENTREGADO";

      if (debeResetearPreparacion) {
        data.estadoPreparacion = "PENDIENTE";
        data.fechaListo = null;
        data.fechaEntrega = null;
      }

      if (estadoPreparacion !== undefined) {
        data.estadoPreparacion = estadoPreparacion;
        data.fechaListo =
          estadoPreparacion === "LISTO"
            ? new Date()
            : estadoPreparacion === "PENDIENTE" ||
                estadoPreparacion === "EN_PREPARACION"
              ? null
              : undefined;
        data.fechaEntrega =
          estadoPreparacion === "ENTREGADO"
            ? new Date()
            : null;
      }

      await tx.pedidoRestauranteItem.update({
        where: { id: item.id },
        data,
      });

      return recalcularTotalesPedido(tx, pedido.id);
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al actualizar item del pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto del pedido" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, itemId } = await context.params;
    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
      },
      select: {
        id: true,
        estado: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    if (pedido.estado !== "ABIERTO") {
      return NextResponse.json(
        { error: "Solo puedes editar pedidos abiertos" },
        { status: 400 }
      );
    }

    const item = await db.pedidoRestauranteItem.findFirst({
      where: {
        id: itemId,
        pedidoId: pedido.id,
      },
      select: { id: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Producto del pedido no encontrado" },
        { status: 404 }
      );
    }

    const pedidoActualizado = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      await tx.pedidoRestauranteItem.delete({
        where: { id: item.id },
      });

      return recalcularTotalesPedido(tx, pedido.id);
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al eliminar item del pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el producto del pedido" },
      { status: 500 }
    );
  }
}
