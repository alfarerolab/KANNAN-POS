import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { pedidoRestauranteInclude } from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/restaurante/pedidos/[id]/cancelar
// Cancela un pedido sin ítems y libera todas sus mesas (estado LIBRE)
export async function POST(req: NextRequest, context: ContextoRuta) {
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

    if (pedido.items.length > 0) {
      return NextResponse.json(
        { error: "No se puede cancelar un pedido que ya tiene productos. Factura o elimina los ítems primero." },
        { status: 400 }
      );
    }

    await db.$transaction(
      async (tx: import("@prisma/client").Prisma.TransactionClient) => {
        // Liberar todas las mesas del pedido
        const mesaIds = pedido.mesas.map(
          (mp: { mesa: { id: string } }) => mp.mesa.id
        );

        if (mesaIds.length > 0) {
          await tx.mesaRestaurante.updateMany({
            where: { id: { in: mesaIds } },
            data: { estado: "LIBRE" },
          });
        }

        // Eliminar relaciones mesa-pedido
        await tx.pedidoMesaRestaurante.deleteMany({
          where: { pedidoId: id },
        });

        // Eliminar el pedido
        await tx.pedidoRestaurante.delete({
          where: { id },
        });
      }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al cancelar pedido:", error);
    return NextResponse.json(
      { error: "No se pudo cancelar el pedido" },
      { status: 500 }
    );
  }
}