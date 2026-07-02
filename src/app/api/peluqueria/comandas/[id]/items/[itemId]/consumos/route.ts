import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const consumoSchema = z.object({
  productoId: z.string().min(1, "El producto es requerido"),
  cantidad: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
});

/**
 * POST /api/peluqueria/comandas/[id]/items/[itemId]/consumos
 * Añade un consumo de inventario a un ítem de comanda.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, itemId } = await params;
    const empresaId = session.user.empresaId;

    const body = await request.json();
    const { productoId, cantidad } = consumoSchema.parse(body);

    // Verificar comanda y su estado
    const comanda = await db.comanda.findFirst({
      where: { id, empresaId },
    });
    if (!comanda) return NextResponse.json({ error: "Comanda no encontrada" }, { status: 404 });
    if (comanda.estado !== "ABIERTA") return NextResponse.json({ error: "La comanda no está abierta" }, { status: 400 });

    // Verificar el item
    const item = await db.comandaItem.findFirst({
      where: { id: itemId, comandaId: id },
    });
    if (!item) return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });

    // Verificar el producto a consumir
    const producto = await db.producto.findFirst({
      where: { id: productoId, empresaId, activo: true },
    });
    if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    // Crear el consumo
    await db.consumoInventarioServicio.create({
      data: {
        comandaItemId: itemId,
        productoId,
        cantidad,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.errors }, { status: 400 });
    }
    console.error("Error al añadir consumo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
