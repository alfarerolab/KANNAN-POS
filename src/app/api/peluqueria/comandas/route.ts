import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * GET /api/peluqueria/comandas
 * Obtiene todas las comandas (cuentas abiertas) activas de la empresa.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") || "ABIERTA";

    const comandas = await db.comanda.findMany({
      where: {
        empresaId,
        estado: estado as any, // "ABIERTA" | "COMPLETADA" | "CANCELADA"
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
            empleado: {
              select: {
                id: true,
                nombre: true,
                imagen: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(comandas);
  } catch (error) {
    console.error("Error al obtener cuentas abiertas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
