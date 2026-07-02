// app/api/terminales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const terminalSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  ubicacion: z.string().optional(),
  numeracion: z.string().optional(),
  activo: z.boolean().default(true),
  esTerminalPrincipal: z.boolean().default(false),
});

// GET - Obtener terminales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Construir filtros
    const whereClause: any = {
      empresaId: session.user.empresaId,
    };

    // Filtro por búsqueda
    const search = searchParams.get('search');
    if (search) {
      whereClause.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { ubicacion: { contains: search, mode: 'insensitive' } },
        { numeracion: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro por estado activo
    const activo = searchParams.get('activo');
    if (activo !== null) {
      whereClause.activo = activo === 'true';
    }

    // Obtener terminales con todas las relaciones necesarias
    const terminales = await db.terminal.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(terminales);
  } catch (error) {
    console.error('Error al obtener terminales:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear terminal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = terminalSchema.parse(body);

    // Si es terminal principal, desactivar otros terminales principales
    if (validatedData.esTerminalPrincipal) {
      await db.terminal.updateMany({
        where: {
          empresaId: session.user.empresaId,
          esTerminalPrincipal: true,
        },
        data: {
          esTerminalPrincipal: false,
        },
      });
    }

    const terminal = await db.terminal.create({
      data: {
        ...validatedData,
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

    return NextResponse.json(terminal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear terminal:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}