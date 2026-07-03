import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const walkInSchema = z.object({
  servicioId: z.string().min(1, "El servicio es requerido"),
  empleadoId: z.string().optional().nullable(),
  clienteId: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

/**
 * POST /api/peluqueria/walk-in
 * Crea una comanda walk-in (servicio sin cita previa).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { servicioId, empleadoId, clienteId, notas } = walkInSchema.parse(body);
    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id;

    // Verificar que el servicio existe y pertenece a la empresa
    const servicio = await db.servicio.findFirst({
      where: { id: servicioId, empresaId, activo: true },
    });

    if (!servicio) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
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

    // Crear la comanda con el item en una sola transacción
    const comanda = await db.$transaction(async (tx: any) => {
      const nuevaComanda = await tx.comanda.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: clienteId || null,
          estado: "ABIERTA",
          notas: notas || null,
          total: servicio.precio,
        },
      });

      await tx.comandaItem.create({
        data: {
          comandaId: nuevaComanda.id,
          servicioId: servicio.id,
          empleadoId: empleadoId || null,
          precio: servicio.precio,
          notas: null,
        },
      });

      return nuevaComanda;
    });

    // Retornar la comanda completa
    const comandaCompleta = await db.comanda.findUnique({
      where: { id: comanda.id },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true } },
        items: {
          include: {
            servicio: { select: { id: true, nombre: true, precio: true, duracion: true, color: true } },
            empleado: { select: { id: true, nombre: true } },
          },
        },
      },
    });

    return NextResponse.json(comandaCompleta, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error al crear walk-in:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
