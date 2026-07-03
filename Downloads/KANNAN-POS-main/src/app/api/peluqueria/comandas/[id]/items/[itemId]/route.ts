import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function DELETE(
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

    // Verificar que la comanda pertenece a la empresa
    const comanda = await db.comanda.findFirst({
      where: {
        id,
        empresaId,
      },
    });

    if (!comanda) {
      return NextResponse.json(
        { error: "Comanda no encontrada" },
        { status: 404 }
      );
    }

    if (comanda.estado !== "ABIERTA") {
      return NextResponse.json(
        { error: "No se pueden modificar items de una comanda que no esté abierta" },
        { status: 400 }
      );
    }

    // Usar transacción para borrar el item y actualizar el total
    await db.$transaction(async (tx: any) => {
      // 1. Obtener el item para saber el precio a restar
      const item = await tx.comandaItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error("El item especificado no existe en la comanda");
      }

      // 2. Eliminar el item
      await tx.comandaItem.delete({
        where: { id: itemId },
      });

      // 3. Contar cuántos ítems quedan en la comanda
      const itemsRestantes = await tx.comandaItem.count({
        where: { comandaId: id },
      });

      // 4. Actualizar el total y, si no quedan ítems, cancelar la comanda
      await tx.comanda.update({
        where: { id },
        data: {
          total: {
            decrement: item.precio
          },
          // Si no quedan ítems, cancelar automáticamente
          ...(itemsRestantes === 0 ? { estado: "CANCELADA" } : {}),
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE COMANDA ITEM]", error);
    return NextResponse.json(
      { error: error.message || "Error al eliminar el item" },
      { status: 500 }
    );
  }
}
