// src/app/api/ventas/[id]/auditoria/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const ventaId = resolvedParams.id;

    // Verificar que la venta pertenezca a la empresa
    const venta = await db.venta.findFirst({
      where: { id: ventaId, empresaId },
      select: { id: true },
    });

    if (!venta) {
      return NextResponse.json(
        { error: "Venta no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Obtener los logs de auditoría de esta venta
    const logs = await db.auditoriaLog.findMany({
      where: {
        tabla: "venta",
        registroId: ventaId,
        empresaId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error al obtener auditoría de venta:", error);
    return NextResponse.json(
      { error: "Error al obtener historial de auditoría" },
      { status: 500 }
    );
  }
}
