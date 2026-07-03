// src/app/api/citas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { addMinutes, isBefore, startOfDay, endOfDay } from 'date-fns';

const citaUpdateSchema = z.object({
  fechaHora: z.string().datetime('Fecha y hora inválida').optional(),
  clienteId: z.string().min(1, 'Cliente es requerido').optional(),
  servicioId: z.string().min(1, 'Servicio es requerido').optional(),
  empleadoId: z.string().optional(),
  notas: z.string().optional(),
  recordatorio: z.boolean().optional(),
});

const estadoUpdateSchema = z.object({
  estado: z.enum(['PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO', 'COMPLETADA', 'FACTURADA', 'CANCELADA', 'NO_ASISTIO']),
  ventaId: z.string().optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Obtener cita específica
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const cita = await db.cita.findFirst({
      where: {
        id,
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
        venta: {
          select: {
            id: true,
            total: true,
            estado: true,
          },
        },
      },
    });

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    return NextResponse.json(cita);
  } catch (error) {
    console.error('Error al obtener cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar cita completa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = citaUpdateSchema.parse(body);

    // Verificar que la cita existe y pertenece a la empresa
    const citaExistente = await db.cita.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        servicio: true,
      },
    });

    if (!citaExistente) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Preparar datos para actualización
    const datosActualizacion: any = {
      ...(validatedData.notas !== undefined && { notas: validatedData.notas }),
      ...(validatedData.recordatorio !== undefined && { recordatorio: validatedData.recordatorio }),
      ...(validatedData.empleadoId !== undefined && { empleadoId: validatedData.empleadoId }),
    };

    // Si se actualiza la fecha, cliente o servicio, hacer validaciones adicionales
    if (validatedData.fechaHora || validatedData.clienteId || validatedData.servicioId) {
      let servicioActual = citaExistente.servicio;

      // Si se cambia el servicio, obtener el nuevo
      if (validatedData.servicioId && validatedData.servicioId !== citaExistente.servicioId) {
        const nuevoServicio = await db.servicio.findFirst({
          where: {
            id: validatedData.servicioId,
            empresaId: session.user.empresaId,
            activo: true,
          },
        });

        if (!nuevoServicio) {
          return NextResponse.json(
            { error: 'Servicio no encontrado' },
            { status: 404 }
          );
        }

        servicioActual = nuevoServicio;
        datosActualizacion.servicioId = validatedData.servicioId;
        datosActualizacion.duracion = nuevoServicio.duracion;
      }

      // Si se cambia el cliente, verificar que existe
      if (validatedData.clienteId && validatedData.clienteId !== citaExistente.clienteId) {
        const cliente = await db.cliente.findFirst({
          where: {
            id: validatedData.clienteId,
            empresaId: session.user.empresaId,
          },
        });

        if (!cliente) {
          return NextResponse.json(
            { error: 'Cliente no encontrado' },
            { status: 404 }
          );
        }

        datosActualizacion.clienteId = validatedData.clienteId;
      }

      // Si se cambia la fecha, hacer validaciones
      if (validatedData.fechaHora) {
        const fechaCita = new Date(validatedData.fechaHora);

        // Validar que la fecha no sea en el pasado
        if (isBefore(fechaCita, new Date())) {
          return NextResponse.json(
            { error: 'No se pueden programar citas en el pasado' },
            { status: 400 }
          );
        }

        // Verificar disponibilidad del empleado si se especifica
        const empleadoId = validatedData.empleadoId || citaExistente.empleadoId;
        if (empleadoId) {
          // Auto-ajustar horario si hay conflicto
          let intentos = 0;
          let hayConflicto = true;
          let horaInicioPropuesta = fechaCita;
          
          while (hayConflicto && intentos < 10) {
            const horaFinPropuesta = addMinutes(horaInicioPropuesta, servicioActual.duracion);
            
            // Verificar conflicto en este horario específico propuesto
            const citaConflicto = await db.cita.findFirst({
              where: {
                empleadoId: empleadoId,
                id: { not: id }, // Excluir la cita actual que estamos editando
                estado: {
                  in: ['PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO'],
                },
                OR: [
                  {
                    AND: [
                      { fechaHora: { lte: horaInicioPropuesta } },
                      { 
                        fechaHora: { 
                          gt: new Date(horaInicioPropuesta.getTime() - servicioActual.duracion * 60000)
                        }
                      },
                    ],
                  },
                  {
                    AND: [
                      { fechaHora: { gte: horaInicioPropuesta } },
                      { fechaHora: { lt: horaFinPropuesta } },
                    ],
                  },
                ],
              },
              include: {
                servicio: {
                  select: { duracion: true },
                },
              },
              orderBy: {
                fechaHora: 'asc'
              }
            });

            let conflictoReal = null;
            
            if (citaConflicto) {
                 const inicioCitaExistente = new Date(citaConflicto.fechaHora);
                 const finCitaExistente = addMinutes(inicioCitaExistente, citaConflicto.servicio.duracion);
                 
                 if (
                   (horaInicioPropuesta >= inicioCitaExistente && horaInicioPropuesta < finCitaExistente) ||
                   (horaFinPropuesta > inicioCitaExistente && horaFinPropuesta <= finCitaExistente) ||
                   (horaInicioPropuesta <= inicioCitaExistente && horaFinPropuesta >= finCitaExistente)
                 ) {
                   conflictoReal = citaConflicto;
                 }
            }
            
            if (!conflictoReal) {
                 const todasCitasDia = await db.cita.findMany({
                      where: {
                          empleadoId: empleadoId,
                          id: { not: id }, // Excluir la actual
                          estado: { in: ['PROGRAMADA', 'CONFIRMADA', 'EN_PROCESO'] },
                          fechaHora: {
                              gte: startOfDay(horaInicioPropuesta),
                              lte: endOfDay(horaInicioPropuesta)
                          }
                      },
                      include: { servicio: { select: { duracion: true } } }
                 });
                 
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
              { error: 'El empleado está completamente ocupado, no se pudo encontrar un espacio libre.' },
              { status: 400 }
            );
          }
          
          fechaCita.setTime(horaInicioPropuesta.getTime());
        }

        datosActualizacion.fechaHora = fechaCita;
      }
    }

    // Actualizar la cita
    const citaActualizada = await db.cita.update({
      where: { id },
      data: datosActualizacion,
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
        venta: {
          select: {
            id: true,
            total: true,
            estado: true,
          },
        },
      },
    });

    const originalFechaStr = new Date(validatedData.fechaHora || citaExistente.fechaHora).toISOString();
    const isAdjusted = citaActualizada.fechaHora.toISOString() !== originalFechaStr;

    return NextResponse.json({ ...citaActualizada, autoAdjusted: isAdjusted });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de la cita
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = estadoUpdateSchema.parse(body);

    // Verificar que la cita existe y pertenece a la empresa
    const citaExistente = await db.cita.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!citaExistente) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Preparar datos de actualización
    const datosActualizacion: any = {
      estado: validatedData.estado
    };

    // Si se proporciona ventaId, incluirlo
    if (validatedData.ventaId) {
      datosActualizacion.ventaId = validatedData.ventaId;
    }

    // Validaciones de transición de estado
    const estadoActual = citaExistente.estado;
    const nuevoEstado = validatedData.estado;

    const transicionesValidas: Record<string, string[]> = {
      PROGRAMADA: ['CONFIRMADA', 'CANCELADA', 'COMPLETADA', 'NO_ASISTIO'],
      CONFIRMADA: ['EN_PROCESO', 'CANCELADA', 'COMPLETADA', 'NO_ASISTIO'],
      EN_PROCESO: ['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'],
      COMPLETADA: ['FACTURADA'],
      FACTURADA: [], // Estado final
      CANCELADA: ['PROGRAMADA'],
      NO_ASISTIO: ['PROGRAMADA'],
    };

    const transicionValida =
      transicionesValidas[estadoActual]?.includes(nuevoEstado) ||
      (nuevoEstado === 'COMPLETADA' && validatedData.ventaId) ||
      estadoActual === nuevoEstado;

    if (!transicionValida) {
      return NextResponse.json(
        { error: `No se puede cambiar de ${estadoActual} a ${nuevoEstado}` },
        { status: 400 }
      );
    }

    // Actualizar la cita
    const citaActualizada = await db.cita.update({
      where: { id },
      data: datosActualizacion,
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
        venta: {
          select: {
            id: true,
            total: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json(citaActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error al actualizar estado de cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar cita
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que la cita existe y pertenece a la empresa
    const citaExistente = await db.cita.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        venta: true,
      },
    });

    if (!citaExistente) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // No permitir eliminar citas que ya tienen una venta asociada
    if (citaExistente.venta) {
      return NextResponse.json(
        { error: 'No se puede eliminar una cita que ya tiene una venta asociada' },
        { status: 400 }
      );
    }

    // Eliminar la cita
    await db.cita.delete({
      where: { id },
    });

    return NextResponse.json({ mensaje: 'Cita eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}