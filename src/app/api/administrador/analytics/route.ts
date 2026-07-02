import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions, esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { subDays, subMonths, format, startOfMonth, endOfMonth } from "date-fns";

// GET - Obtener métricas de analytics (solo superadmin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "30d"; // 7d, 30d, 90d, 1y

    // Calcular fechas según el período
    const fechaFin = new Date();
    let fechaInicio: Date;

    switch (periodo) {
      case "7d":
        fechaInicio = subDays(fechaFin, 7);
        break;
      case "30d":
        fechaInicio = subDays(fechaFin, 30);
        break;
      case "90d":
        fechaInicio = subDays(fechaFin, 90);
        break;
      case "1y":
        fechaInicio = subDays(fechaFin, 365);
        break;
      default:
        fechaInicio = subDays(fechaFin, 30);
    }

    // 1. Métricas generales de empresas
    const empresasStats = await db.empresa.groupBy({
      by: ["tipoNegocio", "activa"],
      _count: {
        id: true,
      },
    });

    // 2. Crecimiento de empresas por mes (últimos 12 meses)
    const empresasPorMes = await db.empresa.groupBy({
      by: ["createdAt"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: subMonths(fechaFin, 12),
        },
      },
    });

    // Procesar datos por mes
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const crecimientoPorMes = empresasPorMes.reduce((acc: Record<string, number>, empresa) => {
      const mes = format(new Date(empresa.createdAt), "yyyy-MM");
      acc[mes] = (acc[mes] || 0) + empresa._count.id;
      return acc;
    }, {} as Record<string, number>);

    // 3. Distribución por tipos de negocio
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const distribucionTipos = empresasStats.reduce((acc: Record<string, { total: number; activas: number; inactivas: number }>, stat) => {
      const total = acc[stat.tipoNegocio] || { total: 0, activas: 0, inactivas: 0 };
      total.total += stat._count.id;
      if (stat.activa) {
        total.activas += stat._count.id;
      } else {
        total.inactivas += stat._count.id;
      }
      acc[stat.tipoNegocio] = total;
      return acc;
    }, {} as Record<string, { total: number; activas: number; inactivas: number }>);

    // 4. Métricas de usuarios
    const usuariosStats = await db.usuario.groupBy({
      by: ["rol", "activo"],
      _count: {
        id: true,
      },
    });

    // 5. Actividad reciente (ventas, productos, usuarios creados)
    const ventasRecientes = await db.venta.count({
      where: {
        createdAt: {
          gte: fechaInicio,
        },
      },
    });

    const productosCreados = await db.producto.count({
      where: {
        createdAt: {
          gte: fechaInicio,
        },
      },
    });

    const usuariosCreados = await db.usuario.count({
      where: {
        createdAt: {
          gte: fechaInicio,
        },
      },
    });

    // 6. Top empresas por actividad (más ventas)
    const topEmpresas = await db.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        tipoNegocio: true,
        _count: {
          select: {
            ventas: true,
            productos: true,
            usuarios: true,
          },
        },
      },
      orderBy: {
        ventas: {
          _count: "desc",
        },
      },
      take: 10,
    });

    // 7. Funcionalidades más utilizadas (basado en configuraciones habilitadas)
    const funcionesStats = await db.configuracionEmpresa.findMany({
      select: {
        habilitarServicios: true,
        habilitarCitas: true,
        habilitarVariantes: true,
        habilitarRecetas: true,
        habilitarLotes: true,
        habilitarVencimientos: true,
        empresa: {
          select: {
            tipoNegocio: true,
          },
        },
      },
    });

    // Procesar estadísticas de funcionalidades
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const funcionesUsadas = funcionesStats.reduce((acc: Record<string, { habilitadas: number; total: number }>, config) => {
      const funciones = [
        { nombre: 'servicios', habilitada: config.habilitarServicios },
        { nombre: 'citas', habilitada: config.habilitarCitas },
        { nombre: 'variantes', habilitada: config.habilitarVariantes },
        { nombre: 'recetas', habilitada: config.habilitarRecetas },
        { nombre: 'lotes', habilitada: config.habilitarLotes },
        { nombre: 'vencimientos', habilitada: config.habilitarVencimientos },
        { nombre: 'mascotas', habilitada: config.habilitarMascotas }
      ];

      for (const { nombre, habilitada } of funciones) {
        if (!acc[nombre]) {
          acc[nombre] = {
            habilitadas: 0,
            total: 0
          };
        }

        acc[nombre].total += 1;
        if (habilitada) {
          acc[nombre].habilitadas += 1;
        }
      }

      return acc;
    }, {} as Record<string, { habilitadas: number; total: number }>);

    // 8. Métricas de retención (empresas que siguen activas después de X tiempo)
    const empresasAntiguas = await db.empresa.count({
      where: {
        createdAt: {
          lte: subMonths(fechaFin, 6),
        },
        activa: true,
      },
    });

    const totalEmpresasAntiguas = await db.empresa.count({
      where: {
        createdAt: {
          lte: subMonths(fechaFin, 6),
        },
      },
    });

    const retencion = totalEmpresasAntiguas > 0
      ? (empresasAntiguas / totalEmpresasAntiguas) * 100
      : 0;

    return NextResponse.json({
      periodo,
      fechaInicio,
      fechaFin,
      metricas: {
        empresas: {
          distribucionTipos,
          crecimientoPorMes,
          topEmpresas,
          retencion: Math.round(retencion * 100) / 100,
        },
        usuarios: {
          estadisticas: usuariosStats,
          creados: usuariosCreados,
        },
        actividad: {
          ventas: ventasRecientes,
          productos: productosCreados,
          usuarios: usuariosCreados,
        },
        funcionalidades: funcionesUsadas,
      },
    });
  } catch (error) {
    console.error("Error al obtener métricas:", error);
    return NextResponse.json(
      { message: "Error al obtener métricas de analytics" },
      { status: 500 }
    );
  }
}

// POST - Registrar métrica de uso
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { tipo, entidad, entidadId, evento, datos, valor, valorDecimal, empresaId, tipoNegocio } = body;

    const fecha = new Date();
    const fechaMes = format(fecha, "yyyy-MM");
    const fechaDia = format(fecha, "yyyy-MM-dd");

    const metrica = await db.metricaUso.create({
      data: {
        tipo,
        entidad,
        entidadId,
        evento,
        datos,
        valor,
        valorDecimal,
        empresaId,
        usuarioId: session.user.id,
        tipoNegocio,
        fecha,
        fechaMes,
        fechaDia,
      },
    });

    return NextResponse.json(metrica, { status: 201 });
  } catch (error) {
    console.error("Error al registrar métrica:", error);
    return NextResponse.json(
      { message: "Error al registrar métrica" },
      { status: 500 }
    );
  }
}