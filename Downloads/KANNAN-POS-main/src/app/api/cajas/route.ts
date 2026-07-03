import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const cajaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  activa: z.boolean().default(true),
});

// GET - Obtener cajas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Buscar cajas de la empresa
    let cajas = await db.caja.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' },
    });

    // Si no existe ninguna caja, crear "Caja Principal" por defecto
    if (cajas.length === 0) {
      const cajaPrincipal = await db.caja.create({
        data: {
          nombre: 'Caja Principal',
          empresaId,
          activa: true,
        },
      });
      cajas = [cajaPrincipal];
    }

    return NextResponse.json(cajas);
  } catch (error) {
    console.error('Error al obtener cajas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear caja
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = cajaSchema.parse(body);

    const nuevaCaja = await db.caja.create({
      data: {
        nombre: validatedData.nombre,
        activa: validatedData.activa,
        empresaId: session.user.empresaId,
      },
    });

    return NextResponse.json(nuevaCaja, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear caja:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
