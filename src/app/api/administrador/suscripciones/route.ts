import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener suscripciones con información completa
    const suscripciones = await db.suscripcion.findMany({
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tipoNegocio: true,
            activa: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        plan: {
          select: {
            id: true,
            nombre: true,
            precio: true,
            meses: true,
            caracteristicas: true
          }
        }
      },
      orderBy: {
        fechaFin: 'asc'
      }
    });

    // Calcular estado de cada suscripción
    const ahora = new Date();
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const suscripcionesConEstado = suscripciones.map(suscripcion => {
      let diasRestantes = 0;
      let estado: 'activa' | 'por_vencer' | 'vencida' | 'suspendida' = 'activa';

      const fechaFin = new Date(suscripcion.fechaFin);
      diasRestantes = Math.ceil((fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

      // Determinar estado basado en días restantes y estado de BD
      if (suscripcion.estado === 'CANCELADA' || suscripcion.estado === 'PAUSADA') {
        estado = 'suspendida';
      } else if (suscripcion.estado === 'EXPIRADA' || diasRestantes < 0) {
        estado = 'vencida';
      } else if (diasRestantes <= 15) {
        estado = 'por_vencer';
      } else if (suscripcion.estado === 'ACTIVA') {
        estado = 'activa';
      }

      return {
        id: suscripcion.id,
        empresaId: suscripcion.empresa.id,
        nombre: suscripcion.empresa.nombre,
        email: suscripcion.empresa.email,
        tipoNegocio: suscripcion.empresa.tipoNegocio,
        fechaVencimiento: suscripcion.fechaFin.toISOString(),
        fechaInicio: suscripcion.fechaInicio.toISOString(),
        activa: suscripcion.empresa.activa && suscripcion.estado === 'ACTIVA',
        diasRestantes: Math.max(diasRestantes, -999), // Limitar días negativos
        estado,
        ultimoPago: suscripcion.createdAt.toISOString(),
        montoMensual: Number(suscripcion.precioTotal) / suscripcion.plan.meses, // Calcular monto mensual real
        precioTotal: Number(suscripcion.precioTotal),
        planNombre: suscripcion.plan.nombre,
        planMeses: suscripcion.plan.meses,
        estadoSuscripcion: suscripcion.estado,
        metodoPago: suscripcion.metodoPago,
        renovacionAutomatica: suscripcion.renovacionAutomatica,
        descuentoAplicado: suscripcion.descuentoAplicado,
        createdAt: suscripcion.empresa.createdAt?.toISOString(),
        updatedAt: suscripcion.empresa.updatedAt?.toISOString(),
      };
    });

    // Calcular estadísticas reales
    const totalSuscripciones = suscripciones.length;
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const suscripcionesActivas = suscripcionesConEstado.filter(s => s.estado === 'activa').length;
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const porVencer = suscripcionesConEstado.filter(s => s.estado === 'por_vencer').length;
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const vencidas = suscripcionesConEstado.filter(s => s.estado === 'vencida' || s.estado === 'suspendida').length;
    
    // Calcular ingresos mensuales reales (MRR)
    const ingresosMensualesActivas = suscripcionesConEstado
      // @ts-expect-error Autofix Next15 o tipos implícitos
      .filter(s => s.estado === 'activa')
      // @ts-expect-error Autofix Next15 o tipos implícitos
      .reduce((total, s) => total + s.montoMensual, 0);

    // Calcular ingresos totales de todas las suscripciones activas
    const ingresosTotalesActivas = suscripcionesConEstado
      // @ts-expect-error Autofix Next15 o tipos implícitos
      .filter(s => s.estado === 'activa')
      // @ts-expect-error Autofix Next15 o tipos implícitos
      .reduce((total, s) => total + s.precioTotal, 0);

    // Obtener estadísticas adicionales del último mes
    const haceTreintaDias = new Date();
    haceTreintaDias.setDate(haceTreintaDias.getDate() - 30);

    const suscripcionesRecientes = await db.suscripcion.count({
      where: {
        createdAt: {
          gte: haceTreintaDias
        }
      }
    });

    const ingresosMesActual = await db.suscripcion.aggregate({
      where: {
        createdAt: {
          gte: new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        }
      },
      _sum: {
        precioTotal: true
      }
    });

    const estadisticas = {
      totalSuscripciones,
      suscripcionesActivas,
      porVencer,
      vencidas,
      ingresosMensuales: Math.round(ingresosMensualesActivas), // MRR en COP
      ingresosTotales: Math.round(ingresosTotalesActivas), // Total en COP
      suscripcionesRecientes,
      ingresosMesActual: Math.round(Number(ingresosMesActual._sum.precioTotal) || 0),
      tasaCrecimiento: suscripcionesRecientes > 0 ? 
        Math.round(((suscripcionesRecientes / Math.max(totalSuscripciones - suscripcionesRecientes, 1)) * 100) * 100) / 100 : 0
    };

    // Obtener estadísticas por tipo de negocio
    const estadisticasPorTipo = await db.suscripcion.groupBy({
      by: ['empresaId'],
      where: {
        estado: 'ACTIVA'
      },
      _sum: {
        precioTotal: true
      },
      _count: true
    });

    // Obtener información de empresas para agrupar por tipo
    const empresasActivas = await db.empresa.findMany({
      where: {
        id: {
          // @ts-expect-error Autofix Next15 o tipos implícitos
          in: estadisticasPorTipo.map(s => s.empresaId)
        }
      },
      select: {
        id: true,
        tipoNegocio: true
      }
    });

    // Agrupar estadísticas por tipo de negocio
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const estadisticasAgrupadas = empresasActivas.reduce((acc: Record<string, { cantidad: number; ingresos: number }>, empresa) => {
      const tipoNegocio = empresa.tipoNegocio;
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const estadistica = estadisticasPorTipo.find(s => s.empresaId === empresa.id);
      
      if (!acc[tipoNegocio]) {
        acc[tipoNegocio] = {
          cantidad: 0,
          ingresos: 0
        };
      }
      
      if (estadistica) {
        acc[tipoNegocio].cantidad += estadistica._count;
        acc[tipoNegocio].ingresos += Number(estadistica._sum.precioTotal || 0);
      }
      
      return acc;
    }, {} as Record<string, { cantidad: number; ingresos: number }>);

    return NextResponse.json({
      suscripciones: suscripcionesConEstado,
      estadisticas,
      estadisticasPorTipoNegocio: estadisticasAgrupadas,
      metadata: {
        moneda: 'COP',
        timezone: 'America/Bogota',
        ultimaActualizacion: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error al cargar suscripciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}