import { Prisma } from "@prisma/client";
import { MetodoPago } from "../../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { dividirPedidoPorItems, facturarPedidoRestaurante } from "@/lib/restaurante-venta";
import { serializarPedidoRestaurante } from "@/lib/restaurante";

const METODOS_PERMITIDOS: MetodoPago[] = [
  "EFECTIVO",
  "TARJETA_CREDITO",
  "TARJETA_DEBITO",
  "TRANSFERENCIA",
  "NEQUI",
  "DAVIPLATA",
  "BANCOLOMBIA",
  "OTRO",
];

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId || !token.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const metodoPago = body.metodoPago as MetodoPago;
    const clienteId =
      typeof body.clienteId === "string" && body.clienteId.trim()
        ? body.clienteId
        : null;
    const items = body.items as Array<{ itemId: string; cantidadAExtraer: number }>;

    if (!METODOS_PERMITIDOS.includes(metodoPago)) {
      return NextResponse.json(
        { error: "Selecciona un método de pago válido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No se han seleccionado productos para dividir" },
        { status: 400 }
      );
    }

    // Usar transaction para crear el sub-pedido y facturarlo atómicamente
    const resultado = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Extraer los items en un sub-pedido nuevo
      const subPedido = await dividirPedidoPorItems({
        db: tx,
        pedidoId: id,
        items,
        empresaId: token.empresaId as string,
        usuarioId: token.id as string,
      });

      // 2. Facturar ese sub-pedido inmediatamente
      return await facturarPedidoRestaurante({
        db: tx,
        pedidoId: subPedido.id,
        empresaId: token.empresaId as string,
        usuarioId: token.id as string,
        metodoPago,
        clienteId,
      });
    });

    return NextResponse.json({
      pedido: serializarPedidoRestaurante(resultado.pedido),
      venta: resultado.venta,
    });
  } catch (error) {
    console.error("Error al dividir y facturar pedido:", error);

    if (error instanceof Error) {
      if (error.message.startsWith("ITEM_NO_ENCONTRADO")) {
        return NextResponse.json(
          { error: "Uno o más productos seleccionados ya no están en la cuenta." },
          { status: 400 }
        );
      }
      if (error.message.startsWith("CANTIDAD_INVALIDA")) {
        return NextResponse.json(
          { error: "La cantidad a extraer supera lo que hay en la cuenta." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo realizar la división de la cuenta." },
      { status: 500 }
    );
  }
}
