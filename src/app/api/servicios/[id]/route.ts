// src/app/api/servicios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const servicioUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  precio: z.coerce.number().min(0, 'El precio debe ser mayor a 0').optional(),
  duracion: z.coerce.number().min(1, 'La duración debe ser mayor a 0').optional(),
  color: z.string().optional(),
  requiereEmpleado: z.boolean().optional(),
  categoriaId: z.string().optional(),
  activo: z.boolean().optional(),
  empleadosIds: z.array(z.string()).optional(),
  porcentajeNegocio: z.coerce.number().min(0).max(100).optional().nullable(),
  porcentajeEmpleado: z.coerce.number().min(0).max(100).optional().nullable(),
});

// GET - Obtener servicio específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const servicio = await db.servicio.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        categoria: true,
        // ✅ CORRECTO: "empleadoservicio" coincide con el schema
        empleadoservicio: {
          where: { activo: true },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
          },
        },
        _count: {
          select: {
            // ✅ CORRECTO: "cita" coincide con el schema
            cita: true,
            itemsVenta: true,
          },
        },
      },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(servicio);
  } catch (error) {
    console.error('Error al obtener servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar servicio
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { empleadosIds, ...servicioData } = servicioUpdateSchema.parse(body);

    const servicioExistente = await db.servicio.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!servicioExistente) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    const servicio = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      const servicioActualizado = await tx.servicio.update({
        where: { id: resolvedParams.id },
        data: servicioData,
      });

      if (empleadosIds !== undefined) {
        // Desactivar todas las asignaciones actuales
        await tx.empleadoServicio.updateMany({
          where: { servicioId: resolvedParams.id },
          data: { activo: false },
        });

        if (empleadosIds.length > 0) {
          // Crear nuevas asignaciones (skipDuplicates para no romper el unique)
          await tx.empleadoServicio.createMany({
            data: empleadosIds.map((empleadoId) => ({
              usuarioId: empleadoId,
              servicioId: resolvedParams.id,
            })),
            skipDuplicates: true,
          });

          // Reactivar las que ya existían y se acaban de reinsertar/mantener
          await tx.empleadoServicio.updateMany({
            where: {
              servicioId: resolvedParams.id,
              usuarioId: { in: empleadosIds },
            },
            data: { activo: true },
          });
        }
      }

      return servicioActualizado;
    });

    const servicioCompleto = await db.servicio.findUnique({
      where: { id: resolvedParams.id },
      include: {
        categoria: true,
        // ✅ CORRECTO: "empleadoservicio"
        empleadoservicio: {
          where: { activo: true },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                imagen: true,
              },
            },
          },
        },
        _count: {
          select: {
            cita: true,
            itemsVenta: true,
          },
        },
      },
    });

    return NextResponse.json(servicioCompleto);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar servicio
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const servicio = await db.servicio.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: {
          select: {
            // ✅ CORRECTO: "cita"
            cita: true,
            itemsVenta: true,
          },
        },
      },
    });

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    // Si tiene citas o ventas asociadas, solo desactivar
    if (servicio._count.cita > 0 || servicio._count.itemsVenta > 0) {
      const servicioDesactivado = await db.servicio.update({
        where: { id: resolvedParams.id },
        data: { activo: false },
      });

      return NextResponse.json({
        message: 'Servicio desactivado (tiene registros asociados)',
        servicio: servicioDesactivado,
      });
    }

    // Sin registros asociados → eliminar completamente
    await db.servicio.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({
      message: 'Servicio eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
