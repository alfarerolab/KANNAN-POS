import { Prisma } from "@prisma/client";
import { MetodoPago } from "../../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { facturarPedidoRestaurante } from "@/lib/restaurante-venta";
import { serializarPedidoRestaurante } from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

const METODOS_PERMITIDOS: MetodoPago[] = [
  "EFECTIVO",
  "TARJETA_CREDITO",
  "TARJETA_DEBITO",
  "TRANSFERENCIA",
  "FIADO",
  "MIXTO",
  "OTRO",
];

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
    const notas =
      typeof body.notas === "string" && body.notas.trim()
        ? body.notas.trim()
        : undefined;

    if (!METODOS_PERMITIDOS.includes(metodoPago)) {
      return NextResponse.json(
        { error: "Selecciona un método de pago válido" },
        { status: 400 }
      );
    }

    const resultado = await db.$transaction(
      (tx: Prisma.TransactionClient) =>
        facturarPedidoRestaurante({
          db: tx,
          pedidoId: id,
          empresaId: token.empresaId as string,
          usuarioId: token.id as string,
          metodoPago,
          clienteId,
          notas,
        }),
      {
        timeout: 15000, // 15 segundos
        maxWait: 5000,  // espera máxima para obtener conexión
      }
    );

    return NextResponse.json({
      pedido: serializarPedidoRestaurante(resultado.pedido),
      venta: resultado.venta,
    });
  } catch (error) {
    console.error("Error al facturar pedido del restaurante:", error);

    if (error instanceof Error) {
      if (error.message === "PEDIDO_NO_ENCONTRADO") {
        return NextResponse.json(
          { error: "La cuenta no está disponible para facturar" },
          { status: 404 }
        );
      }

      if (error.message === "PEDIDO_VACIO") {
        return NextResponse.json(
          { error: "La cuenta no tiene productos para facturar" },
          { status: 400 }
        );
      }

      if (error.message === "CLIENTE_INVALIDO") {
        return NextResponse.json(
          { error: "El cliente seleccionado no es válido" },
          { status: 400 }
        );
      }

      if (error.message === "PRODUCTOS_INVALIDOS") {
        return NextResponse.json(
          { error: "Hay productos del pedido que ya no están disponibles" },
          { status: 400 }
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
      { error: "No se pudo facturar la cuenta" },
      { status: 500 }
    );
  }
}