import { EstadoPedidoRestaurante, EstadoPreparacionRestaurante, EstacionPreparacionRestaurante } from "../../../../../../lib/prisma-types";
import { Decimal } from "@prisma/client/runtime/library";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { resolverPrecio, calcularStockCombo } from "@/lib/precio-dinamico";
import {
  determinarEstacionPreparacion,
  recalcularTotalesPedido,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const productoId = typeof body.productoId === "string" ? body.productoId : "";
    const cantidad = Number(body.cantidad || 1);
    const notas =
      typeof body.notas === "string" && body.notas.trim()
        ? body.notas.trim()
        : null;
    const esCortesia = typeof body.esCortesia === "boolean" ? body.esCortesia : false;
    const estacionBody = body.estacion as EstacionPreparacionRestaurante | undefined;
    const estadoPreparacionBody = body.estadoPreparacion as EstadoPreparacionRestaurante | undefined;

    if (!productoId) {
      return NextResponse.json(
        { error: "Debes seleccionar un producto" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser un entero mayor a cero" },
        { status: 400 }
      );
    }

    if (
      estacionBody !== undefined &&
      !Object.values(EstacionPreparacionRestaurante).includes(estacionBody)
    ) {
      return NextResponse.json(
        { error: "La estación de preparación no es válida" },
        { status: 400 }
      );
    }

    if (
      estadoPreparacionBody !== undefined &&
      !Object.values(EstadoPreparacionRestaurante).includes(estadoPreparacionBody)
    ) {
      return NextResponse.json(
        { error: "El estado de preparación no es válido" },
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
        { error: "Solo puedes agregar productos a pedidos abiertos" },
        { status: 400 }
      );
    }

    const producto = await db.producto.findFirst({
      where: {
        id: productoId,
        empresaId: token.empresaId as string,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        enStock: true,
        esCombo: true,
        componentes: { include: { componente: true } },
        precio: true,
        precioEspecial: true,
        diasPrecioEspecial: true,
        categoria: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!producto || producto.precio == null) {
      return NextResponse.json(
        { error: "El producto seleccionado no es válido para vender" },
        { status: 400 }
      );
    }

    let stockDisponible = Number(producto.enStock || 0);

    if (producto.esCombo && producto.componentes) {
      stockDisponible = calcularStockCombo(producto.componentes);
    }

    if (stockDisponible < cantidad) {
      return NextResponse.json(
        { error: `${producto.nombre} no tiene stock suficiente para agregar ${cantidad} unidad(es)` },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      const estacion =
        estacionBody ||
        determinarEstacionPreparacion({
          categoria: producto.categoria?.nombre,
          nombreProducto: producto.nombre,
        });

      const itemExistente = await tx.pedidoRestauranteItem.findFirst({
        where: {
          pedidoId: pedido.id,
          productoId,
          notas,
          estacion,
          esCortesia,
          estadoPreparacion: {
            not: "ENTREGADO",
          },
        },
      });

      const precioUnitario = esCortesia
        ? new Decimal(0)
        : new Decimal(resolverPrecio({
            precio: Number(producto.precio),
            precioEspecial: producto.precioEspecial ? Number(producto.precioEspecial) : null,
            diasPrecioEspecial: producto.diasPrecioEspecial,
          }));

      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cantidad;
        await tx.pedidoRestauranteItem.update({
          where: { id: itemExistente.id },
          data: {
            cantidad: nuevaCantidad,
            subtotal: precioUnitario.mul(nuevaCantidad),
            estadoPreparacion: estadoPreparacionBody || "PENDIENTE",
            fechaListo: null,
            fechaEntrega: null,
          },
        });
      } else {
        await tx.pedidoRestauranteItem.create({
          data: {
            pedidoId: pedido.id,
            productoId: producto.id,
            nombreProducto: producto.nombre,
            cantidad,
            precioUnitario,
            subtotal: precioUnitario.mul(cantidad),
            notas,
            estacion,
            esCortesia,
            estadoPreparacion: estadoPreparacionBody || "PENDIENTE",
          },
        });
      }

      return recalcularTotalesPedido(tx, pedido.id);
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al agregar item al pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo agregar el producto al pedido" },
      { status: 500 }
    );
  }
}
