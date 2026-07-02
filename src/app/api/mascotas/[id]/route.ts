import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema de validación para actualizar mascota
const actualizarMascotaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").optional(),
  especie: z.string().min(1, "La especie es requerida").optional(),
  raza: z.string().optional(),
  edad: z.number().min(0).optional(),
  peso: z.number().min(0).optional(),
  sexo: z.enum(["MACHO", "HEMBRA"]).optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  historialMedico: z.string().optional(),
  alergias: z.string().optional(),
  medicamentos: z.string().optional(),
  observaciones: z.string().optional(),
  activo: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obtener mascota específica
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const mascota = await db.mascota.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            direccion: true,
          },
        },
        itemsVenta: {
          include: {
            itemventa: {
              include: {
                venta: {
                  select: {
                    id: true,
                    total: true,
                    createdAt: true,
                  },
                },
                producto: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        citas: {
          include: {
            cita: {
              include: {
                servicio: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
                usuario: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!mascota) {
      return NextResponse.json(
        { error: "Mascota no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ datos: mascota });
  } catch (error) {
    console.error("Error al obtener mascota:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar mascota
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const datosValidados = actualizarMascotaSchema.parse(body);

    const resolvedParams = await params;
    // Verificar que la mascota existe y pertenece a la empresa
    const mascotaExistente = await db.mascota.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!mascotaExistente) {
      return NextResponse.json(
        { error: "Mascota no encontrada" },
        { status: 404 }
      );
    }

    // Verificar microchip único si se está actualizando
    if (datosValidados.microchip && datosValidados.microchip !== mascotaExistente.microchip) {
      const microchipExistente = await db.mascota.findFirst({
        where: {
          microchip: datosValidados.microchip,
          empresaId: session.user.empresaId,
          id: { not: resolvedParams.id },
        },
      });

      if (microchipExistente) {
        return NextResponse.json(
          { error: "Ya existe una mascota con ese microchip" },
          { status: 400 }
        );
      }
    }

    const mascotaActualizada = await db.mascota.update({
      where: { id: resolvedParams.id },
      data: datosValidados,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
      },
    });

    return NextResponse.json({
      datos: mascotaActualizada,
      mensaje: "Mascota actualizada exitosamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.errors },
        { status: 400 }
      );
    }

    console.error("Error al actualizar mascota:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar (desactivar) mascota
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    // Verificar que la mascota existe y pertenece a la empresa
    const mascotaExistente = await db.mascota.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!mascotaExistente) {
      return NextResponse.json(
        { error: "Mascota no encontrada" },
        { status: 404 }
      );
    }

    // Desactivar en lugar de eliminar permanentemente
    const mascotaDesactivada = await db.mascota.update({
      where: { id: resolvedParams.id },
      data: { activo: false },
    });

    return NextResponse.json({
      datos: mascotaDesactivada,
      mensaje: "Mascota desactivada exitosamente",
    });
  } catch (error) {
    console.error("Error al eliminar mascota:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
