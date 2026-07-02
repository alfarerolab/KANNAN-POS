// app/api/metas/multiples/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const empresaId = session.user.empresaId;
    const data = await req.json();

    // Validar que se recibió un array de metas
    if (!data.metas || !Array.isArray(data.metas) || data.metas.length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar un array de metas válido" },
        { status: 400 }
      );
    }

    // Validar cada meta
    for (const meta of data.metas) {
      if (!meta.periodo || !meta.objetivo) {
        return NextResponse.json(
          { error: "Cada meta debe tener periodo y objetivo" },
          { status: 400 }
        );
      }

      if (!['diaria', 'semanal', 'mensual'].includes(meta.periodo)) {
        return NextResponse.json(
          { error: `Período inválido: ${meta.periodo}` },
          { status: 400 }
        );
      }

      if (typeof meta.objetivo !== 'number' || meta.objetivo <= 0) {
        return NextResponse.json(
          { error: "El objetivo debe ser un número mayor a 0" },
          { status: 400 }
        );
      }
    }

    // Crear o actualizar todas las metas
    const metasCreadas = await Promise.all(
      data.metas.map(async (metaData: any) => {
        const { periodo, objetivo, tipo = 'ingresos', activa = true } = metaData;

        // Usar upsert para crear o actualizar
        const meta = await db.metaEmpresa.upsert({
          where: {
            empresaId_periodo: {
              empresaId: empresaId,
              periodo: periodo
            }
          },
          update: {
            objetivo: objetivo,
            updatedAt: new Date()
          },
          create: {
            id: `${empresaId}_${periodo}_${Date.now()}`,
            empresaId: empresaId,
            periodo: periodo,
            objetivo: objetivo,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Calcular progreso actual
        const progreso = await calcularProgresoMeta(empresaId, periodo, objetivo);

        return {
          ...meta,
          progreso: progreso.porcentaje,
          actual: progreso.actual,
          falta: Math.max(0, objetivo - progreso.actual),
          estado: progreso.porcentaje >= 100 ? 'COMPLETADA' : 
                  progreso.porcentaje >= 80 ? 'EN_PROGRESO' : 'PENDIENTE'
        };
      })
    );

    return NextResponse.json({
      success: true,
      metas: metasCreadas,
      mensaje: `${metasCreadas.length} meta(s) configurada(s) correctamente`
    });

  } catch (error) {
    console.error("Error al configurar múltiples metas:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para calcular el progreso de una meta
async function calcularProgresoMeta(empresaId: string, periodo: string, objetivo: number) {
  const ahora = new Date();
  let fechaInicio: Date;
  let fechaFin: Date;

  // Determinar el rango de fechas según el período
  switch (periodo) {
    case 'diaria':
      fechaInicio = startOfDay(ahora);
      fechaFin = endOfDay(ahora);
      break;
    case 'semanal':
      fechaInicio = startOfWeek(ahora, { weekStartsOn: 1 }); // Lunes
      fechaFin = endOfWeek(ahora, { weekStartsOn: 1 });
      break;
    case 'mensual':
      fechaInicio = startOfMonth(ahora);
      fechaFin = endOfMonth(ahora);
      break;
    default:
      throw new Error(`Período no válido: ${periodo}`);
  }

  // Calcular ventas en el período
  const ventasResult = await db.venta.aggregate({
    where: {
      empresaId: empresaId,
      estado: 'COMPLETADA',
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    _sum: {
      total: true
    },
    _count: {
      id: true
    }
  });

  const totalVentas = Number(ventasResult._sum.total || 0);
  const cantidadVentas = ventasResult._count || 0;
  const porcentaje = objetivo > 0 ? (totalVentas / objetivo) * 100 : 0;

  return {
    actual: totalVentas,
    cantidadVentas: cantidadVentas,
    porcentaje: Math.round(porcentaje * 100) / 100,
    fechaInicio,
    fechaFin
  };
}