import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateCajaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  activa: z.boolean().optional(),
});

// GET - Obtener una caja específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const caja = await db.caja.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!caja) {
      return NextResponse.json(
        { error: 'Caja no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(caja);
  } catch (error) {
    console.error('Error al obtener caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar caja
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cajaExistente = await db.caja.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!cajaExistente) {
      return NextResponse.json(
        { error: 'Caja no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateCajaSchema.parse(body);

    const cajaActualizada = await db.caja.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    });

    return NextResponse.json(cajaActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar caja
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si la caja existe y contar relaciones
    const caja = await db.caja.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: {
          select: {
            turnos: true,
            ventas: true,
            gastos: true,
          },
        },
      },
    });

    if (!caja) {
      return NextResponse.json(
        { error: 'Caja no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si tiene relaciones
    const totalRelaciones = caja._count.turnos + caja._count.ventas + caja._count.gastos;
    if (totalRelaciones > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una caja con turnos, ventas o gastos asociados. Por favor desactívela en su lugar.' },
        { status: 400 }
      );
    }

    await db.caja.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ mensaje: 'Caja eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
