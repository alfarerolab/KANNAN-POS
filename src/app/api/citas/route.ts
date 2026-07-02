// src/app/api/citas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { addMinutes, isBefore, startOfDay, endOfDay } from 'date-fns';

const citaSchema = z.object({
  fechaHora: z.string().datetime('Fecha y hora inválida'),
  clienteId: z.string().min(1, 'Cliente es requerido'),
  servicioId: z.string().min(1, 'Servicio es requerido'),
  empleadoId: z.string().optional(),
  notas: z.string().optional(),
  recordatorio: z.boolean().default(true),
});

// GET - Obtener citas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const whereClause: any = {
      empresaId: session.user.empresaId,
    };

    const fecha = searchParams.get('fecha');
    if (fecha) {
      const fechaDate = new Date(fecha);
      whereClause.fechaHora = {
        gte: startOfDay(fechaDate),
        lte: endOfDay(fechaDate),
      };
    }

    const empleadoId = searchParams.get('empleadoId');
    if (empleadoId) whereClause.empleadoId = empleadoId;

    const clienteId = searchParams.get('clienteId');
    if (clienteId) whereClause.clienteId = clienteId;

    const estado = searchParams.get('estado');
    if (
      estado &&
      ['PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO'].includes(estado)
    ) {
      whereClause.estado = estado;
    }

    const servicioId = searchParams.get('servicioId');
    if (servicioId) whereClause.servicioId = servicioId;

    const citas = await db.cita.findMany({
      where: whereClause,
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
      orderBy: {
        fechaHora: 'asc',
      },
    });

    return NextResponse.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear cita
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = citaSchema.parse(body);

    // Verificar que la empresa tenga citas habilitadas
    const configuracion = await db.configuracionEmpresa.findUnique({
      where: { empresaId: session.user.empresaId },
    });

    if (!configuracion?.habilitarCitas) {
      return NextResponse.json(
        { error: 'Las citas no están habilitadas para esta empresa' },
        { status: 400 }
      );
    }

    const fechaCita = new Date(validatedData.fechaHora);

    if (isBefore(fechaCita, new Date())) {
      return NextResponse.json(
        { error: 'No se pueden crear citas en el pasado' },
        { status: 400 }
      );
    }

    // Obtener información del servicio
    const servicio = await db.servicio.findFirst({
      where: {
        id: validatedData.servicioId,
        empresaId: session.user.empresaId,
        activo: true,
      },
    });

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    }

    // Verificar que el cliente existe y pertenece a la empresa
    const cliente = await db.cliente.findFirst({
      where: {
        id: validatedData.clienteId,
        empresaId: session.user.empresaId,
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verificar disponibilidad del empleado si se especifica
    if (validatedData.empleadoId) {
      let intentos = 0;
      let hayConflicto = true;
      let horaInicioPropuesta = fechaCita;

      while (hayConflicto && intentos < 10) {
        const horaFinPropuesta = addMinutes(horaInicioPropuesta, servicio.duracion);

        // Obtener todas las citas del empleado en ese día para validar en memoria
        const todasCitasDia = await db.cita.findMany({
          where: {
            empleadoId: validatedData.empleadoId,
            estado: { in: ['PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO'] },
            fechaHora: {
              gte: startOfDay(horaInicioPropuesta),
              lte: endOfDay(horaInicioPropuesta),
            },
          },
          include: {
            servicio: { select: { duracion: true } },
          },
        });

        let conflictoReal = null;
        for (const cita of todasCitasDia) {
          const inicio = new Date(cita.fechaHora);
          const fin = addMinutes(inicio, cita.servicio.duracion);
          if (
            (horaInicioPropuesta >= inicio && horaInicioPropuesta < fin) ||
            (horaFinPropuesta > inicio && horaFinPropuesta <= fin) ||
            (horaInicioPropuesta <= inicio && horaFinPropuesta >= fin)
          ) {
            conflictoReal = cita;
            break;
          }
        }

        if (conflictoReal) {
          const inicioConflicto = new Date(conflictoReal.fechaHora);
          horaInicioPropuesta = addMinutes(inicioConflicto, conflictoReal.servicio.duracion);
          intentos++;
        } else {
          hayConflicto = false;
        }
      }

      if (hayConflicto) {
        return NextResponse.json(
          { error: 'El empleado está completamente ocupado, no se pudo encontrar un espacio.' },
          { status: 400 }
        );
      }

      fechaCita.setTime(horaInicioPropuesta.getTime());

      // Verificar que el empleado puede prestar el servicio
      const empleadoServicio = await db.empleadoServicio.findFirst({
        where: {
          usuarioId: validatedData.empleadoId,
          servicioId: validatedData.servicioId,
          activo: true,
        },
      });

      if (!empleadoServicio && servicio.requiereEmpleado) {
        return NextResponse.json(
          { error: 'El empleado no puede prestar este servicio' },
          { status: 400 }
        );
      }
    }

    const cita = await db.cita.create({
      data: {
        ...validatedData,
        fechaHora: fechaCita,
        duracion: servicio.duracion,
        empresaId: session.user.empresaId,
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
       
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          },
        },
      },
    });

    const originalFechaStr = new Date(validatedData.fechaHora).toISOString();
    const isAdjusted = fechaCita.toISOString() !== originalFechaStr;

    return NextResponse.json({ ...cita, autoAdjusted: isAdjusted }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al crear cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}