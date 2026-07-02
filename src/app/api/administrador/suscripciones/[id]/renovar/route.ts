import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Este es el ID de la suscripción
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { meses } = body;

    if (!meses || meses < 1 || meses > 24) {
      return NextResponse.json(
        { error: "El número de meses debe estar entre 1 y 24" },
        { status: 400 }
      );
    }

    // Verificar que la suscripción existe
    const suscripcionActual = await db.suscripcion.findUnique({
      where: { id },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tipoNegocio: true,
            activa: true
          }
        },
        plan: {
          select: {
            id: true,
            nombre: true,
            precio: true
          }
        }
      }
    });

    if (!suscripcionActual) {
      return NextResponse.json(
        { error: "Suscripción no encontrada" },
        { status: 404 }
      );
    }

    // Calcular nueva fecha de fin
    const fechaBase = suscripcionActual.fechaFin > new Date()
      ? new Date(suscripcionActual.fechaFin) // Si no ha vencido, extender desde la fecha actual de fin
      : new Date(); // Si ya venció, extender desde hoy

    const nuevaFechaFin = new Date(fechaBase);
    nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + meses);

    // Calcular precio para la renovación (precio proporcional por mes)
    const precioPorMes = Number(suscripcionActual.plan.precio);
    const precioRenovacion = precioPorMes * meses;

    // Crear nueva suscripción (renovación)
    const nuevaSuscripcion = await db.suscripcion.create({
      data: {
        empresaId: suscripcionActual.empresa.id,
        planId: suscripcionActual.plan.id,
        fechaInicio: fechaBase,
        fechaFin: nuevaFechaFin,
        estado: 'ACTIVA',
        precioTotal: precioRenovacion,
        descuentoAplicado: 0,
        metodoPago: 'MANUAL_ADMIN', // Indicar que fue renovación manual por admin
        renovacionAutomatica: false,
        notasAdmin: `Renovación manual por ${session.user.email} - ${meses} mes(es)`
      },
      include: {
        empresa: true,
        plan: true
      }
    });

    // Marcar la suscripción anterior como expirada/cancelada si está activa
    if (suscripcionActual.estado === 'ACTIVA') {
      await db.suscripcion.update({
        where: { id: suscripcionActual.id },
        data: {
          estado: 'EXPIRADA',
          notasAdmin: `Reemplazada por renovación ${nuevaSuscripcion.id}`
        }
      });
    }

    // Reactivar la empresa si estaba inactiva
    if (!suscripcionActual.empresa.activa) {
      await db.empresa.update({
        where: { id: suscripcionActual.empresa.id },
        data: {
          activa: true,
          notaDesactivacion: null,
          fechaVencimiento: nuevaFechaFin // Actualizar también este campo por compatibilidad
        }
      });
    } else {
      // Solo actualizar la fecha de vencimiento
      await db.empresa.update({
        where: { id: suscripcionActual.empresa.id },
        data: {
          fechaVencimiento: nuevaFechaFin
        }
      });
    }

    // Crear log de auditoría
    await db.auditoriaLog.create({
      data: {
        tabla: 'Suscripcion',
        registroId: nuevaSuscripcion.id,
        accion: 'CREAR',
        datosNuevos: JSON.stringify({
          tipoOperacion: 'renovacion',
          suscripcionAnteriorId: suscripcionActual.id,
          mesesRenovados: meses,
          precioRenovacion,
          fechaFinAnterior: suscripcionActual.fechaFin,
          fechaFinNueva: nuevaFechaFin,
          renovadoPor: session.user.email
        }),
        usuarioEmail: session.user.email,
        usuarioRol: session.user.role,
        empresaId: suscripcionActual.empresa.id,
        notas: `Suscripción renovada por ${meses} mes(es). Precio: $${precioRenovacion.toLocaleString('es-CO')} COP`
      }
    });

    // Crear métrica de renovación
    await db.metricaUso.create({
      data: {
        tipo: 'EMPRESA',
        entidad: 'suscripcion',
        entidadId: nuevaSuscripcion.id,
        evento: 'renovacion_manual',
        datos: JSON.stringify({
          mesesRenovados: meses,
          precioRenovacion,
          suscripcionAnteriorId: suscripcionActual.id,
          fechaAnterior: suscripcionActual.fechaFin,
          fechaNueva: nuevaFechaFin,
          renovadoPor: session.user.email,
          planId: suscripcionActual.plan.id,
          planNombre: suscripcionActual.plan.nombre
        }),
        valor: meses,
        valorDecimal: precioRenovacion,
        empresaId: suscripcionActual.empresa.id,
        tipoNegocio: suscripcionActual.empresa.tipoNegocio,
        fechaMes: new Date().toISOString().slice(0, 7),
        fechaDia: new Date().toISOString().slice(0, 10)
      }
    });

    return NextResponse.json({
      mensaje: "Suscripción renovada exitosamente",
      suscripcionAnterior: {
        id: suscripcionActual.id,
        fechaFin: suscripcionActual.fechaFin.toISOString()
      },
      nuevaSuscripcion: {
        id: nuevaSuscripcion.id,
        fechaInicio: nuevaSuscripcion.fechaInicio.toISOString(),
        fechaFin: nuevaSuscripcion.fechaFin.toISOString(),
        precioTotal: Number(nuevaSuscripcion.precioTotal),
        estado: nuevaSuscripcion.estado
      },
      empresa: {
        id: nuevaSuscripcion.empresa.id,
        nombre: nuevaSuscripcion.empresa.nombre,
        activa: true
      },
      resumen: {
        mesesRenovados: meses,
        precioTotal: precioRenovacion,
        moneda: 'COP',
        fechaRenovacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al renovar suscripción:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor", 
        details: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}