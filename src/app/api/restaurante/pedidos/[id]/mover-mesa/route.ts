import { EstadoMesaRestaurante, EstadoPedidoRestaurante } from "../../../../../../lib/prisma-types";
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

export async function POST(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const mesaOrigenId =
      typeof body.mesaOrigenId === "string" ? body.mesaOrigenId : "";
    const mesaDestinoId =
      typeof body.mesaDestinoId === "string" ? body.mesaDestinoId : "";

    if (!mesaOrigenId || !mesaDestinoId) {
      return NextResponse.json(
        { error: "Debes seleccionar una mesa origen y una mesa destino" },
        { status: 400 }
      );
    }

    if (mesaOrigenId === mesaDestinoId) {
      return NextResponse.json(
        { error: "La mesa destino debe ser diferente a la mesa origen" },
        { status: 400 }
      );
    }

    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
        estado: "ABIERTO",
      },
      include: {
        mesas: true,
      },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "La cuenta seleccionada no está disponible" },
        { status: 404 }
      );
    }

    const mesaAsignada = pedido.mesas.find(
      (mesaPedido: { mesaId: string }) => mesaPedido.mesaId === mesaOrigenId
    );

    if (!mesaAsignada) {
      return NextResponse.json(
        { error: "La mesa origen no pertenece a esta cuenta" },
        { status: 400 }
      );
    }

    const mesaDestino = await db.mesaRestaurante.findFirst({
      where: {
        id: mesaDestinoId,
        empresaId: token.empresaId as string,
        activa: true,
      },
      include: {
        pedidos: {
          where: {
            pedido: {
              estado: "ABIERTO",
            },
          },
          select: { id: true },
        },
      },
    });

    if (!mesaDestino) {
      return NextResponse.json(
        { error: "La mesa destino no está disponible" },
        { status: 404 }
      );
    }

    if (pedido.mesas.some((mesaPedido: import("@prisma/client").PedidoMesaRestaurante) => mesaPedido.mesaId === mesaDestino.id)) {
      return NextResponse.json(
        { error: "La mesa destino ya forma parte de esta cuenta" },
        { status: 400 }
      );
    }

    if (mesaDestino.pedidos.length > 0) {
      return NextResponse.json(
        { error: "La mesa destino ya tiene una cuenta abierta" },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      await tx.pedidoMesaRestaurante.update({
        where: {
          id: mesaAsignada.id,
        },
        data: {
          mesaId: mesaDestino.id,
        },
      });

      await tx.mesaRestaurante.update({
        where: { id: mesaOrigenId },
        data: {
          estado: "LIBRE",
        },
      });

      await tx.mesaRestaurante.update({
        where: { id: mesaDestino.id },
        data: {
          estado: "OCUPADA",
        },
      });

      return tx.pedidoRestaurante.findUniqueOrThrow({
        where: { id: pedido.id },
        include: pedidoRestauranteInclude,
      });
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al mover mesa del pedido del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo mover la cuenta a otra mesa" },
      { status: 500 }
    );
  }
}