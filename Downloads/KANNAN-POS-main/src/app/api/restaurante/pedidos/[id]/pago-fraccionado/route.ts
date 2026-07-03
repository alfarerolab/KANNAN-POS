import { MetodoPago } from "../../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { facturarPedidoRestaurante } from "@/lib/restaurante-venta";
import { serializarPedidoRestaurante } from "@/lib/restaurante";

const METODOS_PERMITIDOS: MetodoPago[] = [
  "EFECTIVO",
  "TARJETA_CREDITO",
  "TARJETA_DEBITO",
  "TRANSFERENCIA",
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
    const pagosMultiples = body.pagosMultiples as Array<{ metodoPago: MetodoPago; monto: number }>;
    const clienteId =
      typeof body.clienteId === "string" && body.clienteId.trim()
        ? body.clienteId
        : null;

    if (!Array.isArray(pagosMultiples) || pagosMultiples.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron pagos para registrar" },
        { status: 400 }
      );
    }

    for (const p of pagosMultiples) {
      if (!METODOS_PERMITIDOS.includes(p.metodoPago)) {
        return NextResponse.json(
          { error: `Método de pago inválido: ${p.metodoPago}` },
          { status: 400 }
        );
      }
    }

    // Facturar el pedido con pagos múltiples
    const resultado = await db.$transaction((tx: import("@prisma/client").Prisma.TransactionClient) =>
      facturarPedidoRestaurante({
        db: tx,
        pedidoId: id,
        empresaId: token.empresaId as string,
        usuarioId: token.id as string,
        metodoPago: pagosMultiples[0].metodoPago, // Fallback en caso de necesitarlo, pero se sustituirá por MIXTO en el método
        pagosMultiples,
        clienteId,
      })
    );

    return NextResponse.json({
      pedido: serializarPedidoRestaurante(resultado.pedido),
      venta: resultado.venta,
    });
  } catch (error) {
    console.error("Error al registrar pagos fraccionados:", error);

    if (error instanceof Error) {
      if (error.message === "PEDIDO_NO_ENCONTRADO") {
        return NextResponse.json(
          { error: "La cuenta no está disponible para facturar" },
          { status: 404 }
        );
      }

      if (error.message.startsWith("STOCK_INSUFICIENTE:")) {
        return NextResponse.json(
          {
            error: `No hay stock suficiente para ${error.message.split(":")[1]}`,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo facturar la cuenta con el pago fraccionado" },
      { status: 500 }
    );
  }
}
