// app/api/proveedores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const proveedorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  empresa: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contacto: z.string().optional(),
  notas: z.string().optional(),
  activo: z.boolean().default(true),
});

// GET - Obtener proveedores
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
        { empresa: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contacto: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro por estado activo
    const activo = searchParams.get('activo');
    if (activo !== null) {
      whereClause.activo = activo === 'true';
    }

    // Obtener proveedores con todas las relaciones necesarias
    const proveedores = await db.proveedor.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(proveedores);
  } catch (error) {
    console.error('Error al obtener proveedores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = proveedorSchema.parse(body);

    const proveedor = await db.proveedor.create({
      data: {
        ...validatedData,
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

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear proveedor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}