import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fechas para cálculos
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Obtener datos básicos en paralelo
    const [
      totalEmpresas,
      empresasActivas,
      empresasInactivas,
      suscripcionesActivas,
      planesConPrecios,
      empresasEsteMes,
      empresasMesAnterior,
      suscripcionesVencenProximas,
      empresasRecientes
    ] = await Promise.all([
      // Total de empresas
      db.empresa.count(),

      // Empresas activas
      db.empresa.count({ where: { activa: true } }),

      // Empresas inactivas
      db.empresa.count({ where: { activa: false } }),

      // Suscripciones activas
      db.suscripcion.count({
        where: {
          estado: 'ACTIVA',
          fechaFin: { gte: ahora }
        }
      }),

      // Planes con precios para calcular ingresos
      db.plan.findMany({
        select: {
          id: true,
          nombre: true,
          precio: true,
          meses: true,
          suscripciones: {
            where: {
              estado: 'ACTIVA',
              fechaFin: { gte: ahora }
            },
            select: {
              id: true,
              precioTotal: true,
              fechaInicio: true,
              fechaFin: true
            }
          }
        }
      }),

      // Empresas creadas este mes
      db.empresa.count({
        where: {
          createdAt: { gte: inicioMes }
        }
      }),

      // Empresas creadas mes anterior
      db.empresa.count({
        where: {
          createdAt: {
            gte: inicioMesAnterior,
            lte: finMesAnterior
          }
        }
      }),

      // Suscripciones que vencen en los próximos 30 días
      db.suscripcion.findMany({
        where: {
          estado: 'ACTIVA',
          fechaFin: {
            gte: ahora,
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          empresa: { select: { nombre: true } },
          plan: { select: { nombre: true } }
        },
        orderBy: { fechaFin: 'asc' },
        take: 10
      }),

      // Empresas recientes
      db.empresa.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          suscripciones: {
            where: { estado: 'ACTIVA' },
            include: { plan: true },
            take: 1
          }
        }
      })
    ]);

    // Calcular MRR (Monthly Recurring Revenue)
    let mrrTotal = 0;
    const ingresosPorPlan: Record<string, { monto: number; clientes: number }> = {};

    for (const plan of planesConPrecios) {
      let mrrPlan = 0;
      const clientesPlan = plan.suscripciones.length;

      for (const suscripcion of plan.suscripciones) {
        // Convertir el precio a mensual
        const precioMensual = plan.precio / plan.meses;
        mrrPlan += precioMensual;
      }

      mrrTotal += mrrPlan;

      if (clientesPlan > 0) {
        ingresosPorPlan[plan.nombre] = {
          monto: Math.round(mrrPlan),
          clientes: clientesPlan
        };
      }
    }

    // Calcular ARR (Annual Recurring Revenue)
    const arrTotal = mrrTotal * 12;

    // Calcular tasa de crecimiento
    const tasaCrecimiento = empresasMesAnterior > 0
      ? ((empresasEsteMes - empresasMesAnterior) / empresasMesAnterior) * 100
      : 0;

    // Calcular churn rate (empresas que se dieron de baja)
    const empresasCanceladas = await db.empresa.count({
      where: {
        activa: false,
        createdAt: { gte: hace30Dias }
      }
    });

    const churnRate = empresasActivas > 0
      ? (empresasCanceladas / (empresasActivas + empresasCanceladas)) * 100
      : 0;

    // Calcular retención
    const retencionMensual = 100 - churnRate;

    // LTV y CAC (valores estimados)
    const ltv = mrrTotal > 0 ? (mrrTotal / (churnRate / 100 || 0.05)) : 0;
    const cac = 50; // Valor estimado

    // Generar alertas
    const alertas = [];

    // Alertas de vencimiento
    for (const suscripcion of suscripcionesVencenProximas.slice(0, 3)) {
      const diasRestantes = Math.ceil(
        (suscripcion.fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      );

      alertas.push({
        tipo: 'vencimiento' as const,
        mensaje: `${suscripcion.empresa.nombre} vence en ${diasRestantes} días`,
        fecha: ahora.toISOString(),
        // @ts-expect-error Mismatch de tipos Prisma u obj temporal
        prioridad: (diasRestantes <= 5 ? 'alta' : 'media') as const,
        empresaId: suscripcion.empresaId
      });
    }

    // Alerta de churn alto
    if (churnRate > 5) {
      alertas.push({
        tipo: 'churn' as const,
        mensaje: `Tasa de cancelación alta: ${churnRate.toFixed(1)}%`,
        fecha: ahora.toISOString(),
        prioridad: 'alta' as const
      });
    }

    // Alerta de oportunidad de crecimiento
    if (tasaCrecimiento > 20) {
      alertas.push({
        tipo: 'oportunidad' as const,
        mensaje: `Crecimiento acelerado: +${tasaCrecimiento.toFixed(1)}% este mes`,
        fecha: ahora.toISOString(),
        prioridad: 'media' as const
      });
    }

    // Formatear empresas recientes
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const empresasRecientesFormateadas = empresasRecientes.map(empresa => ({
      nombre: empresa.nombre,
      plan: empresa.suscripciones[0]?.plan?.nombre || 'Sin plan',
      fechaRegistro: empresa.createdAt.toISOString(),
      monto: empresa.suscripciones[0]?.plan?.precio || 0
    }));

    const metricas = {
      mrr: Math.round(mrrTotal),
      arr: Math.round(arrTotal),
      churnRate: Math.round(churnRate * 10) / 10,
      ltv: Math.round(ltv),
      cac: cac,
      totalClientes: totalEmpresas,
      clientesActivos: empresasActivas,
      clientesInactivos: empresasInactivas,
      clientesNuevos: empresasEsteMes,
      tasaCrecimiento: Math.round(tasaCrecimiento * 10) / 10,
      retencionMensual: Math.round(retencionMensual * 10) / 10,
      suscripcionesActivas: suscripcionesActivas,
      ingresosPorPlan,
      empresasRecientes: empresasRecientesFormateadas,
      alertas,
      objetivos: {
        mrrObjetivo: 2000,
        clientesObjetivo: 50,
        churnObjetivo: 5
      },
      // Datos adicionales para el dashboard
      estadisticas: {
        empresasEsteMes,
        empresasMesAnterior,
        suscripcionesVencenProximas: suscripcionesVencenProximas.length,
        conversionRate: totalEmpresas > 0 ? (suscripcionesActivas / totalEmpresas * 100) : 0
      }
    };

    return NextResponse.json(metricas);

  } catch (error) {
    console.error("Error al obtener métricas del dashboard:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
