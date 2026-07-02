// src/app/api/servicios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const servicioCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  duracion: z.number().min(1, 'La duración debe ser mayor a 0'),
  color: z.string().optional(),
  requiereEmpleado: z.boolean().default(true),
  categoriaId: z.string().optional(),
  activo: z.boolean().default(true),
  empleadosIds: z.array(z.string()).optional(),
  porcentajeNegocio: z.number().min(0).max(100).optional().nullable(),
  porcentajeEmpleado: z.number().min(0).max(100).optional().nullable(),
});

// GET - Obtener todos los servicios de la empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const categoriaId = searchParams.get('categoriaId');

    const whereClause: any = {
      empresaId: session.user.empresaId,
    };

    if (!includeInactive) {
      whereClause.activo = true;
    }

    if (categoriaId && categoriaId !== 'TODOS') {
      whereClause.categoriaId = categoriaId;
    }

    const servicios = await db.servicio.findMany({
      where: whereClause,
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
        // ✅ CORREGIDO: era "empleadosServicios", el nombre correcto según el schema es "empleadoservicio"
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
            // ✅ CORREGIDO: era "citas", el nombre correcto según el schema es "cita"
            cita: true,
            itemsVenta: true,
          },
        },
      },
      orderBy: [
        { activo: 'desc' },
        { nombre: 'asc' },
      ],
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error('❌ Error al obtener servicios:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo servicio
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { empleadosIds, ...servicioData } = servicioCreateSchema.parse(body);

    const servicioExistente = await db.servicio.findFirst({
      where: {
        nombre: servicioData.nombre,
        empresaId: session.user.empresaId,
      },
    });

    if (servicioExistente) {
      return NextResponse.json(
        { error: 'Ya existe un servicio con ese nombre' },
        { status: 400 }
      );
    }

    if (servicioData.categoriaId) {
      const categoria = await db.categoria.findFirst({
        where: {
          id: servicioData.categoriaId,
          empresaId: session.user.empresaId,
        },
      });

      if (!categoria) {
        return NextResponse.json(
          { error: 'Categoría no encontrada o no pertenece a la empresa' },
          { status: 400 }
        );
      }
    }

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const servicio = await db.$transaction(async (tx) => {
      const nuevoServicio = await tx.servicio.create({
        data: {
          ...servicioData,
          empresaId: session.user.empresaId,
        },
      });

      if (empleadosIds && empleadosIds.length > 0) {
        const empleados = await tx.usuario.findMany({
          where: {
            id: { in: empleadosIds },
            empresaId: session.user.empresaId,
            rol: { in: ['EMPLEADO', 'ADMINISTRADOR'] },
          },
        });

        if (empleados.length !== empleadosIds.length) {
          throw new Error('Algunos empleados no son válidos o no pertenecen a la empresa');
        }

        await tx.empleadoServicio.createMany({
          data: empleadosIds.map((empleadoId) => ({
            usuarioId: empleadoId,
            servicioId: nuevoServicio.id,
          })),
        });
      }

      return nuevoServicio;
    });

    const servicioCompleto = await db.servicio.findUnique({
      where: { id: servicio.id },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
        // ✅ CORREGIDO: era "empleadosServicios"
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
            // ✅ CORREGIDO: era "citas"
            cita: true,
            itemsVenta: true,
          },
        },
      },
    });

    return NextResponse.json(servicioCompleto, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        },
        { status: 400 }
      );
    }

    console.error('❌ Error al crear servicio:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}