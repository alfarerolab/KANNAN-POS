import { EstadoMesaRestaurante, EstadoPedidoRestaurante } from "../../../../../../lib/prisma-types";
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
    const mesaIds = Array.isArray(body.mesaIds)
      ? body.mesaIds.filter((mesaId: any): mesaId is string => typeof mesaId === "string")
      : [];

    if (mesaIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos una mesa para unir" },
        { status: 400 }
      );
    }

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

    const mesas = await db.mesaRestaurante.findMany({
      where: {
        id: {
          in: mesaIds,
        },
        empresaId: token.empresaId as string,
        activa: true,
      },
      select: {
        id: true,
        nombre: true,
        estado: true,
      },
    });

    if (mesas.length !== mesaIds.length) {
      return NextResponse.json(
        { error: "Una o más mesas seleccionadas no son válidas" },
        { status: 400 }
      );
    }

    const pedidoActualizado = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      const mesasEnPedido = new Set(pedido.mesas.map((mesa: import("@prisma/client").PedidoMesaRestaurante & { mesa: { id: string } }) => mesa.mesa.id));

      for (const mesa of mesas) {
        if (mesasEnPedido.has(mesa.id)) {
          continue;
        }

        const cuentaExistente = await tx.pedidoMesaRestaurante.findFirst({
          where: {
            mesaId: mesa.id,
            pedido: {
              estado: "ABIERTO",
            },
          },
          select: {
            pedidoId: true,
          },
        });

        if (cuentaExistente && cuentaExistente.pedidoId !== pedido.id) {
          const pedidoOrigen = await tx.pedidoRestaurante.findUnique({
            where: {
              id: cuentaExistente.pedidoId,
            },
            include: {
              mesas: true,
              items: true,
            },
          });

          if (pedidoOrigen) {
            if (!pedido.clienteId && pedidoOrigen.clienteId) {
              await tx.pedidoRestaurante.update({
                where: { id: pedido.id },
                data: {
                  clienteId: pedidoOrigen.clienteId,
                },
              });
            }

            await tx.pedidoRestauranteItem.updateMany({
              where: {
                pedidoId: pedidoOrigen.id,
              },
              data: {
                pedidoId: pedido.id,
              },
            });

            for (const mesaOrigen of pedidoOrigen.mesas) {
              if (!mesasEnPedido.has(mesaOrigen.mesaId)) {
                await tx.pedidoMesaRestaurante.create({
                  data: {
                    pedidoId: pedido.id,
                    mesaId: mesaOrigen.mesaId,
                    esPrincipal: false,
                  },
                });
                mesasEnPedido.add(mesaOrigen.mesaId);
              }

              await tx.mesaRestaurante.update({
                where: { id: mesaOrigen.mesaId },
                data: {
                  estado: "OCUPADA",
                },
              });
            }

            await tx.pedidoMesaRestaurante.deleteMany({
              where: {
                pedidoId: pedidoOrigen.id,
              },
            });

            await tx.pedidoRestaurante.delete({
              where: {
                id: pedidoOrigen.id,
              },
            });
          }

          continue;
        }

        if (
          mesa.estado === "INACTIVA" ||
          mesa.estado === "LIMPIEZA"
        ) {
          throw new Error(`MESA_NO_DISPONIBLE:${mesa.nombre}`);
        }

        await tx.pedidoMesaRestaurante.create({
          data: {
            pedidoId: pedido.id,
            mesaId: mesa.id,
            esPrincipal: false,
          },
        });

        await tx.mesaRestaurante.update({
          where: { id: mesa.id },
          data: {
            estado: "OCUPADA",
          },
        });

        mesasEnPedido.add(mesa.id);
      }

      return recalcularTotalesPedido(tx, pedido.id);
    });

    return NextResponse.json(serializarPedidoRestaurante(pedidoActualizado));
  } catch (error) {
    console.error("Error al unir mesas del restaurante:", error);

    if (error instanceof Error && error.message.startsWith("MESA_NO_DISPONIBLE:")) {
      return NextResponse.json(
        {
          error: `La mesa ${error.message.split(":")[1]} no está disponible para unir`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudieron unir las mesas" },
      { status: 500 }
    );
  }
}