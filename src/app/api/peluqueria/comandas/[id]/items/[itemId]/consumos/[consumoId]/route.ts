import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * DELETE /api/peluqueria/comandas/[id]/items/[itemId]/consumos/[consumoId]
 * Elimina un consumo de inventario de un ítem de comanda.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string; consumoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id, itemId, consumoId } = await params;
    const empresaId = session.user.empresaId;

    // Verificar comanda y su estado
    const comanda = await db.comanda.findFirst({
      where: { id, empresaId },
    });
    if (!comanda) return NextResponse.json({ error: "Comanda no encontrada" }, { status: 404 });
    if (comanda.estado !== "ABIERTA") return NextResponse.json({ error: "La comanda no está abierta" }, { status: 400 });

    const consumo = await db.consumoInventarioServicio.findFirst({
      where: { id: consumoId, comandaItemId: itemId },
    });

    if (!consumo) {
      return NextResponse.json({ error: "Consumo no encontrado" }, { status: 404 });
    }

    await db.consumoInventarioServicio.delete({
      where: { id: consumoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar consumo:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
