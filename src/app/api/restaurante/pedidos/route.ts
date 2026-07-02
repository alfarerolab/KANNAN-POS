import { EstadoMesaRestaurante, EstadoPedidoRestaurante } from "../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  obtenerPedidoAbiertoPorMesa,
  pedidoRestauranteInclude,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const pedidos = await db.pedidoRestaurante.findMany({
      where: {
        empresaId: token.empresaId as string,
        estado: "ABIERTO",
      },
      include: pedidoRestauranteInclude,
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(pedidos.map(serializarPedidoRestaurante));
  } catch (error) {
    console.error("Error al obtener pedidos del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los pedidos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId || !token.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const mesaId = typeof body.mesaId === "string" ? body.mesaId : "";
    const nombreCuenta =
      typeof body.nombreCuenta === "string" && body.nombreCuenta.trim()
        ? body.nombreCuenta.trim()
        : null;
    const notas =
      typeof body.notas === "string" && body.notas.trim()
        ? body.notas.trim()
        : null;
    const clienteId =
      typeof body.clienteId === "string" && body.clienteId.trim()
        ? body.clienteId
        : null;
    const comensales = Number(body.comensales || 1);

    if (!Number.isInteger(comensales) || comensales <= 0) {
      return NextResponse.json(
        { error: "La cantidad de comensales debe ser un entero mayor a cero" },
        { status: 400 }
      );
    }

    if (mesaId) {
      const mesa = await db.mesaRestaurante.findFirst({
        where: {
          id: mesaId,
          empresaId: token.empresaId as string,
          activa: true,
        },
      });

      if (!mesa) {
        return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
      }

      const pedidoExistente = await obtenerPedidoAbiertoPorMesa(db, mesaId);
      if (pedidoExistente) {
        return NextResponse.json(serializarPedidoRestaurante(pedidoExistente));
      }
    }

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

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const pedido = await db.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedidoRestaurante.create({
        data: {
          empresaId: token.empresaId as string,
          usuarioId: token.id as string,
          clienteId,
          nombreCuenta: nombreCuenta || (mesaId ? "Cuenta de Mesa" : "Cuenta Abierta"),
          notas,
          comensales,
          ...(mesaId && {
            mesas: {
              create: {
                mesaId,
                esPrincipal: true,
              },
            },
          }),
        },
        include: pedidoRestauranteInclude,
      });

      if (mesaId) {
        await tx.mesaRestaurante.update({
          where: { id: mesaId },
          data: {
            estado: "OCUPADA",
          },
        });
      }

      return nuevoPedido;
    });

    return NextResponse.json(serializarPedidoRestaurante(pedido), {
      status: 201,
    });
  } catch (error) {
    console.error("Error al abrir pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo abrir la cuenta de la mesa" },
      { status: 500 }
    );
  }
}
