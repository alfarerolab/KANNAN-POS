import { EstadoPedidoRestaurante } from "../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  pedidoRestauranteInclude,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
      },
      include: pedidoRestauranteInclude,
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(serializarPedidoRestaurante(pedido));
  } catch (error) {
    console.error("Error al obtener pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el pedido" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
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

    const body = await req.json();
    const nombreCuenta =
      body.nombreCuenta === undefined
        ? undefined
        : typeof body.nombreCuenta === "string" && body.nombreCuenta.trim()
          ? body.nombreCuenta.trim()
          : null;
    const notas =
      body.notas === undefined
        ? undefined
        : typeof body.notas === "string" && body.notas.trim()
          ? body.notas.trim()
          : null;
    const comensales =
      body.comensales === undefined ? undefined : Number(body.comensales);

    let clienteId: string | null | undefined = undefined;
    if (body.clienteId !== undefined) {
      clienteId =
        typeof body.clienteId === "string" && body.clienteId.trim()
          ? body.clienteId
          : null;

      if (clienteId) {
        const cliente = await db.cliente.findFirst({
          where: {
            id: clienteId,
            empresaId: token.empresaId as string,
          },
          select: { id: true },
        });

        if (!cliente) {
          return NextResponse.json(
            { error: "El cliente seleccionado no es válido" },
            { status: 400 }
          );
        }
      }
    }

    if (
      comensales !== undefined &&
      (!Number.isInteger(comensales) || comensales <= 0)
    ) {
      return NextResponse.json(
        { error: "La cantidad de comensales debe ser un entero mayor a cero" },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.pedidoRestaurante.update({
      where: { id: pedido.id },
      data: {
        nombreCuenta,
        notas,
        comensales,
        clienteId,
      },
      include: pedidoRestauranteInclude,
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al actualizar pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el pedido" },
      { status: 500 }
    );
  }
}
