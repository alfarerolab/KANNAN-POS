// src/app/api/citas/actualizar-estado-venta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const actualizarEstadoVentaSchema = z.object({
  citaId: z.string().min(1, 'ID de cita es requerido'),
  ventaId: z.string().min(1, 'ID de venta es requerido'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = actualizarEstadoVentaSchema.parse(body);

    // Verificar que la cita existe y pertenece a la empresa
    const cita = await db.cita.findFirst({
      where: {
        id: validatedData.citaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Verificar que la venta existe, pertenece a la empresa y está completada
    const venta = await db.venta.findFirst({
      where: {
        id: validatedData.ventaId,
        empresaId: session.user.empresaId,
        estado: 'COMPLETADA',
      },
    });

    if (!venta) {
      return NextResponse.json(
        { error: 'Venta no encontrada o no completada' },
        { status: 404 }
      );
    }

    // Actualizar la cita: vincular venta y cambiar estado a FACTURADA
    const citaActualizada = await db.cita.update({
      where: { id: validatedData.citaId },
      data: {
        ventaId: validatedData.ventaId,
        estado: 'FACTURADA',
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
          },
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            duracion: true,
            color: true,
          },
        },
        // ✅ CORREGIDO: era "empleado", el nombre correcto según el schema es "usuario"
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
        venta: {
          select: {
            id: true,
            total: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json({
      mensaje: 'Cita actualizada a facturada exitosamente',
      cita: citaActualizada,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar estado de cita después de venta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}