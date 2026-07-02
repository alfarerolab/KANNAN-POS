import { EstadoPedidoRestaurante, EstadoPreparacionRestaurante, EstacionPreparacionRestaurante } from "../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { serializarPreparacionItem } from "@/lib/restaurante";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estacion = searchParams.get("estacion") as
      | EstacionPreparacionRestaurante
      | null;
    const estado = searchParams.get("estado") as
      | EstadoPreparacionRestaurante
      | null;

    if (
      estacion &&
      !Object.values(EstacionPreparacionRestaurante).includes(estacion)
    ) {
      return NextResponse.json(
        { error: "La estación indicada no es válida" },
        { status: 400 }
      );
    }

    if (
      estado &&
      !Object.values(EstadoPreparacionRestaurante).includes(estado)
    ) {
      return NextResponse.json(
        { error: "El estado indicado no es válido" },
        { status: 400 }
      );
    }

    const items = await db.pedidoRestauranteItem.findMany({
      where: {
        ...(estacion ? { estacion } : {}),
        ...(estado ? { estadoPreparacion: estado } : {}),
        pedido: {
          empresaId: token.empresaId as string,
          estado: "ABIERTO",
        },
      },
      include: {
        pedido: {
          include: {
            cliente: {
              select: {
                nombre: true,
              },
            },
            mesas: {
              include: {
                mesa: {
                  select: {
                    nombre: true,
                  },
                },
              },
              orderBy: [{ esPrincipal: "desc" }, { createdAt: "asc" }],
            },
          },
        },
      },
      orderBy: [
        { estadoPreparacion: "asc" },
        { fechaSolicitud: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json(items.map(serializarPreparacionItem));
  } catch (error) {
    console.error("Error al obtener la preparación del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las comandas en preparación" },
      { status: 500 }
    );
  }
}
