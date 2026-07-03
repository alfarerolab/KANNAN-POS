// app/api/proveedores/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateProveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  empresa: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  notas: z.string().optional(),
  activo: z.boolean().optional(),
});

// GET - Obtener un proveedor específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const proveedor = await db.proveedor.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        productos: {
          where: {
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
            precio: true,
          },
        },
        _count: {
          select: { 
            productos: true,
          },
        },
      },
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(proveedor);
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar proveedor
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el proveedor existe y pertenece a la empresa
    const proveedorExistente = await db.proveedor.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!proveedorExistente) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateProveedorSchema.parse(body);

    // Actualizar proveedor
    const proveedorActualizado = await db.proveedor.update({
      where: {
        id: resolvedParams.id,
      },
      data: validatedData,
      include: {
        productos: {
          where: {
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
            precio: true,
          },
        },
        _count: {
          select: { 
            productos: true,
          },
        },
      },
    });

    return NextResponse.json(proveedorActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proveedor
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el proveedor existe y pertenece a la empresa
    const proveedor = await db.proveedor.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: {
          select: {
            productos: true,
          },
        },
      },
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene productos asociados
    if (proveedor._count.productos > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un proveedor que tiene productos asociados' },
        { status: 400 }
      );
    }

    // Eliminar proveedor
    await db.proveedor.delete({
      where: {
        id: resolvedParams.id,
      },
    });

    return NextResponse.json({ mensaje: 'Proveedor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}