import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";

export async function GET(req: NextRequest, { params }: { params: Promise<{ periodo: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const empresaId = session.user.empresaId;
    const { periodo } = resolvedParams;

    // Validar período
    if (!['diaria', 'semanal', 'mensual'].includes(periodo)) {
      return NextResponse.json(
        { error: "Período no válido" },
        { status: 400 }
      );
    }

    // Buscar la meta específica
    const meta = await db.metaEmpresa.findUnique({
      where: {
        empresaId_periodo: {
          empresaId: empresaId,
          periodo: periodo
        }
      }
    });

    if (!meta) {
      return NextResponse.json(
        { error: "Meta no encontrada" },
        { status: 404 }
      );
    }

    // Calcular progreso actual (reutilizamos la función del archivo anterior)
    const progreso = await calcularProgresoMeta(empresaId, periodo, meta.objetivo);

    return NextResponse.json({
      success: true,
      meta: {
        ...meta,
        progreso: progreso.porcentaje,
        actual: progreso.actual,
        falta: Math.max(0, meta.objetivo - progreso.actual),
        detalles: {
          cantidadVentas: progreso.cantidadVentas,
          fechaInicio: progreso.fechaInicio,
          fechaFin: progreso.fechaFin
        }
      }
    });

  } catch (error) {
    console.error("Error al obtener meta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ periodo: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const empresaId = session.user.empresaId;
    const { periodo } = resolvedParams;
    const data = await req.json();

    // Validar período
    if (!['diaria', 'semanal', 'mensual'].includes(periodo)) {
      return NextResponse.json(
        { error: "Período no válido" },
        { status: 400 }
      );
    }

    // Verificar que la meta existe
    const metaExistente = await db.metaEmpresa.findUnique({
      where: {
        empresaId_periodo: {
          empresaId: empresaId,
          periodo: periodo
        }
      }
    });

    if (!metaExistente) {
      return NextResponse.json(
        { error: "Meta no encontrada" },
        { status: 404 }
      );
    }

    // Validar datos de entrada
    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.objetivo !== undefined) {
      if (typeof data.objetivo !== 'number' || data.objetivo <= 0) {
        return NextResponse.json(
          { error: "El objetivo debe ser un número mayor a 0" },
          { status: 400 }
        );
      }
      updateData.objetivo = data.objetivo;
    }

    // Actualizar la meta
    const metaActualizada = await db.metaEmpresa.update({
      where: {
        empresaId_periodo: {
          empresaId: empresaId,
          periodo: periodo
        }
      },
      data: updateData
    });

    // Calcular progreso con el nuevo objetivo
    const progreso = await calcularProgresoMeta(
      empresaId, 
      periodo, 
      metaActualizada.objetivo
    );

    return NextResponse.json({
      success: true,
      meta: {
        ...metaActualizada,
        progreso: progreso.porcentaje,
        actual: progreso.actual,
        falta: Math.max(0, metaActualizada.objetivo - progreso.actual)
      }
    });

  } catch (error) {
    console.error("Error al actualizar meta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ periodo: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const empresaId = session.user.empresaId;
    const { periodo } = resolvedParams;

    // Validar período
    if (!['diaria', 'semanal', 'mensual'].includes(periodo)) {
      return NextResponse.json(
        { error: "Período no válido" },
        { status: 400 }
      );
    }

    // Verificar que la meta existe antes de eliminar
    const metaExistente = await db.metaEmpresa.findUnique({
      where: {
        empresaId_periodo: {
          empresaId: empresaId,
          periodo: periodo
        }
      }
    });

    if (!metaExistente) {
      return NextResponse.json(
        { error: "Meta no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar la meta
    await db.metaEmpresa.delete({
      where: {
        empresaId_periodo: {
          empresaId: empresaId,
          periodo: periodo
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Meta ${periodo} eliminada correctamente`
    });

  } catch (error) {
    console.error("Error al eliminar meta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Función auxiliar (igual que en el archivo anterior)
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

  const ventasResult = await db.venta.aggregate({
    where: {
      empresaId: empresaId,
      estado: 'COMPLETADA',
      createdAt: {
        gte: fechaInicio,
        lte: fechaFin
      }
    },
    _sum: { total: true },
    _count: { id: true }
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
