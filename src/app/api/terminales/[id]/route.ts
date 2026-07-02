// app/api/terminales/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateTerminalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  ubicacion: z.string().optional(),
  numeracion: z.string().optional(),
  activo: z.boolean().optional(),
  esTerminalPrincipal: z.boolean().optional(),
});

// GET - Obtener un terminal específico
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const terminal = await db.terminal.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        usuariosAsignados: {
          where: {
            activo: true,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: { 
            ventas: true,
            usuariosAsignados: true,
          },
        },
      },
    });

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(terminal);
  } catch (error) {
    console.error('Error al obtener terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar terminal
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el terminal existe y pertenece a la empresa
    const terminalExistente = await db.terminal.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
    });

    if (!terminalExistente) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = updateTerminalSchema.parse(body);

    // Si se está marcando como terminal principal, desactivar otros
    if (validatedData.esTerminalPrincipal && !terminalExistente.esTerminalPrincipal) {
      await db.terminal.updateMany({
        where: {
          empresaId: session.user.empresaId,
          esTerminalPrincipal: true,
          id: { not: resolvedParams.id },
        },
        data: {
          esTerminalPrincipal: false,
        },
      });
    }

    // Actualizar terminal
    const terminalActualizado = await db.terminal.update({
      where: {
        id: resolvedParams.id,
      },
      data: validatedData,
      include: {
        usuariosAsignados: {
          where: {
            activo: true,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: { 
            ventas: true,
            usuariosAsignados: true,
          },
        },
      },
    });

    return NextResponse.json(terminalActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar terminal
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el terminal existe y pertenece a la empresa
    const terminal = await db.terminal.findFirst({
      where: {
        id: resolvedParams.id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: {
          select: {
            ventas: true,
          },
        },
      },
    });

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene ventas asociadas
    if (terminal._count.ventas > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un terminal que tiene ventas asociadas' },
        { status: 400 }
      );
    }

    // Eliminar terminal
    await db.terminal.delete({
      where: {
        id: resolvedParams.id,
      },
    });

    return NextResponse.json({ mensaje: 'Terminal eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}