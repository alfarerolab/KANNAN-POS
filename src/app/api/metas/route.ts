import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const empresaId = session.user.empresaId;

    // Obtener todas las metas de la empresa
    const metas = await db.metaEmpresa.findMany({
      where: {
        empresaId: empresaId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular progreso actual para cada meta
    const metasConProgreso = await Promise.all(
      // @ts-expect-error Autofix Next15 o tipos implícitos
      metas.map(async (meta) => {
        const progreso = await calcularProgresoMeta(empresaId, meta.periodo, meta.objetivo);
        
        return {
          ...meta,
          progreso: progreso.porcentaje,
          actual: progreso.actual,
          objetivo: meta.objetivo,
          falta: Math.max(0, meta.objetivo - progreso.actual),
          estado: progreso.porcentaje >= 100 ? 'COMPLETADA' : 
                  progreso.porcentaje >= 80 ? 'EN_PROGRESO' : 'PENDIENTE'
        };
      })
    );

    return NextResponse.json({
      success: true,
      metas: metasConProgreso
    });

  } catch (error) {
    console.error("Error al obtener metas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

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

    const { periodo, objetivo, tipo = 'ingresos', activa = true } = data;

    // Validar datos
    if (!periodo || !objetivo) {
      return NextResponse.json(
        { error: "Período y objetivo son requeridos" },
        { status: 400 }
      );
    }

    if (!['diaria', 'semanal', 'mensual'].includes(periodo)) {
      return NextResponse.json(
        { error: "Período debe ser 'diaria', 'semanal' o 'mensual'" },
        { status: 400 }
      );
    }

    if (typeof objetivo !== 'number' || objetivo <= 0) {
      return NextResponse.json(
        { error: "El objetivo debe ser un número mayor a 0" },
        { status: 400 }
      );
    }

    // Crear o actualizar la meta
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

    return NextResponse.json({
      success: true,
      meta: {
        ...meta,
        progreso: progreso.porcentaje,
        actual: progreso.actual,
        falta: Math.max(0, objetivo - progreso.actual)
      }
    });

  } catch (error) {
    console.error("Error al configurar meta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
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
    porcentaje: Math.round(porcentaje * 100) / 100, // Redondear a 2 decimales
    fechaInicio,
    fechaFin
  };
}