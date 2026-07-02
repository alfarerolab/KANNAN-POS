// app/api/terminales/[id]/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';

// GET - Obtener usuarios asignados a un terminal
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    });

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    // Obtener usuarios asignados
    const usuariosAsignados = await db.usuarioTerminal.findMany({
      where: {
        terminalId: resolvedParams.id,
        activo: true,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
      orderBy: {
        fechaAsignacion: 'desc',
      },
    });

    return NextResponse.json(usuariosAsignados);
  } catch (error) {
    console.error('Error al obtener usuarios del terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Asignar un usuario a un terminal
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    });

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { usuarioId } = body;

    if (!usuarioId) {
      return NextResponse.json(
        { error: 'El ID del usuario es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y pertenece a la misma empresa
    const usuario = await db.usuario.findFirst({
      where: {
        id: usuarioId,
        empresaId: session.user.empresaId,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en esta empresa' },
        { status: 404 }
      );
    }

    // Verificar si ya existe la asignación
    const asignacionExistente = await db.usuarioTerminal.findUnique({
      where: {
        usuarioId_terminalId: {
          usuarioId,
          terminalId: resolvedParams.id,
        },
      },
    });

    if (asignacionExistente) {
      if (asignacionExistente.activo) {
        return NextResponse.json(
          { error: 'El usuario ya está asignado a este terminal' },
          { status: 400 }
        );
      }

      // Reactivar asignación existente
      const asignacionReactivada = await db.usuarioTerminal.update({
        where: {
          id: asignacionExistente.id,
        },
        data: {
          activo: true,
          fechaAsignacion: new Date(),
        },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              rol: true,
            },
          },
        },
      });

      return NextResponse.json(asignacionReactivada, { status: 200 });
    }

    // Crear nueva asignación
    const nuevaAsignacion = await db.usuarioTerminal.create({
      data: {
        usuarioId,
        terminalId: resolvedParams.id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return NextResponse.json(nuevaAsignacion, { status: 201 });
  } catch (error) {
    console.error('Error al asignar usuario al terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Desasignar un usuario de un terminal
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
    });

    if (!terminal) {
      return NextResponse.json(
        { error: 'Terminal no encontrado' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) {
      return NextResponse.json(
        { error: 'El ID del usuario es requerido' },
        { status: 400 }
      );
    }

    // Buscar la asignación activa
    const asignacion = await db.usuarioTerminal.findUnique({
      where: {
        usuarioId_terminalId: {
          usuarioId,
          terminalId: resolvedParams.id,
        },
      },
    });

    if (!asignacion || !asignacion.activo) {
      return NextResponse.json(
        { error: 'El usuario no está asignado a este terminal' },
        { status: 404 }
      );
    }

    // Desactivar la asignación (soft delete)
    await db.usuarioTerminal.update({
      where: {
        id: asignacion.id,
      },
      data: {
        activo: false,
      },
    });

    return NextResponse.json({ mensaje: 'Usuario desasignado exitosamente' });
  } catch (error) {
    console.error('Error al desasignar usuario del terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
