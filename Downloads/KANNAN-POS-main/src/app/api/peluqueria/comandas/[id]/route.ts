import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * GET /api/peluqueria/comandas/[id]
 * Obtiene los detalles de una comanda específica.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const comanda = await db.comanda.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
        items: {
          include: {
            servicio: {
              select: {
                id: true,
                nombre: true,
                precio: true,
                duracion: true,
                color: true,
              },
            },
            producto: {
              select: {
                id: true,
                nombre: true,
                precio: true,
              },
            },
            empleado: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
              },
            },
            consumosInternos: {
              include: {
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!comanda) {
      return NextResponse.json(
        { error: "Comanda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(comanda);
  } catch (error) {
    console.error("Error al obtener cuenta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/peluqueria/comandas/[id]
 * Cancela/Elimina una comanda abierta.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const comanda = await db.comanda.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
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
        { error: "Solo se pueden eliminar cuentas ABIERTAS" },
        { status: 400 }
      );
    }

    // Eliminamos (en realidad podríamos cambiar el estado a CANCELADA, pero borrar es más limpio si fue error)
    await db.comanda.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
