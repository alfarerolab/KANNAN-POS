import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

// PATCH — editar un gasto (solo ADMINISTRADOR)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede editar gastos (no GERENTE)
    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Solo administradores pueden editar gastos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { id } = await params;

    // Verificar que el gasto pertenece a la empresa
    const gastoExistente = await db.gasto.findFirst({
      where: { id, empresaId },
    });
    if (!gastoExistente) {
      return NextResponse.json({ mensaje: "Gasto no encontrado" }, { status: 404 });
    }

    const { concepto, monto, fecha, metodoPago, categoriaId } = await request.json();

    const data: any = {};
    if (concepto?.trim()) data.concepto = concepto.trim();
    if (monto && parseFloat(monto) > 0) data.monto = new Decimal(parseFloat(monto));
    if (fecha) data.fecha = new Date(fecha.includes("T") ? fecha : fecha + "T12:00:00");
    if (metodoPago) data.metodoPago = metodoPago;
    if (categoriaId) {
      const categoria = await db.categoriaGasto.findFirst({ where: { id: categoriaId, empresaId } });
      if (!categoria) {
        return NextResponse.json({ mensaje: "Categoría no válida" }, { status: 400 });
      }
      data.categoriaId = categoriaId;
    }

    const gasto = await db.gasto.update({
      where: { id },
      data,
      include: {
        categoria: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({
      id: gasto.id,
      concepto: gasto.concepto,
      monto: parseFloat(gasto.monto.toString()),
      fecha: gasto.fecha,
      metodoPago: gasto.metodoPago,
      categoria: gasto.categoria,
      registradoPor: gasto.usuario,
      mensaje: "Gasto actualizado correctamente",
    });
  } catch (error) {
    console.error("Error al actualizar gasto:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}

// DELETE — eliminar un gasto (solo ADMINISTRADOR)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Solo administradores pueden eliminar gastos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { id } = await params;

    const gasto = await db.gasto.findFirst({ where: { id, empresaId } });
    if (!gasto) {
      return NextResponse.json({ mensaje: "Gasto no encontrado" }, { status: 404 });
    }

    await db.gasto.delete({ where: { id } });

    return NextResponse.json({ mensaje: "Gasto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar gasto:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
