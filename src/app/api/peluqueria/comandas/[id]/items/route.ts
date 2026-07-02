import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const addItemSchema = z.object({
  servicioId: z.string().optional().nullable(),
  productoId: z.string().optional().nullable(),
  empleadoId: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
}).refine(data => data.servicioId || data.productoId, {
  message: "Debe especificar un servicio o un producto",
});

/**
 * POST /api/peluqueria/comandas/[id]/items
 * Añade un servicio o producto a una cuenta abierta.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const empresaId = session.user.empresaId;

    const body = await request.json();
    const { servicioId, productoId, empleadoId, notas } = addItemSchema.parse(body);

    // Verificar que la comanda existe y está ABIERTA
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
        { error: "Solo se pueden añadir items a cuentas ABIERTAS" },
        { status: 400 }
      );
    }

    let precio = 0;

    // Verificar que el servicio o producto existe
    if (servicioId) {
      const servicio = await db.servicio.findFirst({
        where: { id: servicioId, empresaId, activo: true },
      });
      if (!servicio) {
        return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
      }
      precio = Number(servicio.precio);
    } else if (productoId) {
      const producto = await db.producto.findFirst({
        where: { id: productoId, empresaId, activo: true },
      });
      if (!producto) {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      }
      precio = Number(producto.precio || 0);
    }

    // Verificar empleado si se especificó
    if (empleadoId) {
      const empleado = await db.usuario.findFirst({
        where: { id: empleadoId, empresaId, activo: true },
      });
      if (!empleado) {
        return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
      }
    }

    // Crear el item y actualizar el total de la comanda
    await db.$transaction(async (tx: any) => {
      await tx.comandaItem.create({
        data: {
          comandaId: id,
          servicioId: servicioId || null,
          productoId: productoId || null,
          empleadoId: empleadoId || null,
          precio: precio,
          notas: notas || null,
        },
      });

      // Actualizar el total de la comanda
      await tx.comanda.update({
        where: { id },
        data: {
          total: {
            increment: precio,
          },
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error al añadir servicio a cuenta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
