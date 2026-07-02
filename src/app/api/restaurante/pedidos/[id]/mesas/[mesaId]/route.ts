import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  pedidoRestauranteInclude,
  recalcularTotalesPedido,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
    mesaId: string;
  }>;
}

// DELETE /api/restaurante/pedidos/[id]/mesas/[mesaId]
// Desune una mesa específica del pedido y la pone en estado LIBRE
export async function DELETE(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, mesaId } = await context.params;

    const pedido = await db.pedidoRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
        estado: "ABIERTO",
      },
      include: pedidoRestauranteInclude,
    });

    if (!pedido) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const mesaEnPedido = pedido.mesas.find(
      (mp: { mesa: { id: string } }) => mp.mesa.id === mesaId
    );

    if (!mesaEnPedido) {
      return NextResponse.json(
        { error: "La mesa no pertenece a este pedido" },
        { status: 404 }
      );
    }

    if (pedido.mesas.length <= 1) {
      return NextResponse.json(
        { error: "No se puede desunir la única mesa. Usa 'Liberar mesa' para cerrar la cuenta vacía." },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.$transaction(
      async (tx: import("@prisma/client").Prisma.TransactionClient) => {
        await tx.pedidoMesaRestaurante.deleteMany({
          where: { pedidoId: id, mesaId },
        });

        await tx.mesaRestaurante.update({
          where: { id: mesaId },
          data: { estado: "LIBRE" },
        });

        return recalcularTotalesPedido(tx, id);
      }
    );

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al desunir mesa:", error);
    return NextResponse.json(
      { error: "No se pudo desunir la mesa" },
      { status: 500 }
    );
  }
}