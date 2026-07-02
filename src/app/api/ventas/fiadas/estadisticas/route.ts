// src/app/api/ventas/fiadas/estadisticas/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";


interface VentaFiadaConRelaciones {
  id: string;
  total: unknown;
  montoPagado: unknown;
  saldoPendiente: unknown;
  estadoPago: string;
  fechaVencimiento: Date | null;
  createdAt: Date;
  cliente: { id: string; nombre: string; email: string | null } | null;
  pagos: unknown[];
}

// GET - Obtener estadísticas de ventas fiadas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    
    // Filtros opcionales
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    // Construir filtro de fechas
    const fechaFiltro: any = {};
    if (fechaInicio) {
      fechaFiltro.gte = new Date(fechaInicio);
    }
    if (fechaFin) {
      fechaFiltro.lte = new Date(fechaFin);
    }

    const whereClause: any = {
      empresaId,
      esVentaFiada: true,
    };

    if (fechaInicio || fechaFin) {
      whereClause.createdAt = fechaFiltro;
    }

    // Obtener todas las ventas fiadas
    const ventasFiadas = await db.venta.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        pagos: true,
      },
    });

    const hoy = new Date();
    const en7Dias = new Date();
    en7Dias.setDate(hoy.getDate() + 7);

    // Calcular estadísticas
    const totalVentasFiadas = ventasFiadas.length;
    const montoTotalFiado = ventasFiadas.reduce(
      (sum: number, v: VentaFiadaConRelaciones) => sum + Number(v.total),
      0
    );
    const saldoPendienteTotal = ventasFiadas.reduce(
      (sum: number, v: VentaFiadaConRelaciones) => sum + Number(v.saldoPendiente || 0),
      0
    );

    // Ventas vencidas
    const ventasVencidas = ventasFiadas.filter(
      (v: VentaFiadaConRelaciones) =>
        v.fechaVencimiento &&
        new Date(v.fechaVencimiento) < hoy &&
        v.estadoPago !== "PAGADO"
    );
    const montoVencido = ventasVencidas.reduce(
      (sum: number, v: VentaFiadaConRelaciones) => sum + Number(v.saldoPendiente || 0),
      0
    );

    // Ventas por vencer (próximos 7 días)
    const ventasPorVencer = ventasFiadas.filter(
      (v: VentaFiadaConRelaciones) =>
        v.fechaVencimiento &&
        new Date(v.fechaVencimiento) >= hoy &&
        new Date(v.fechaVencimiento) <= en7Dias &&
        v.estadoPago !== "PAGADO"
    );
    const montoPorVencer = ventasPorVencer.reduce(
      (sum: number, v: VentaFiadaConRelaciones) => sum + Number(v.saldoPendiente || 0),
      0
    );

    // Ventas con pago parcial
    const ventasConPagoParcial = ventasFiadas.filter(
      (v: VentaFiadaConRelaciones) => v.estadoPago === "PAGO_PARCIAL"
    ).length;

    // Tasa de recuperación
    const montoPagadoTotal = ventasFiadas.reduce(
      (sum: number, v: VentaFiadaConRelaciones) => sum + Number(v.montoPagado || 0),
      0
    );
    const tasaRecuperacion =
      montoTotalFiado > 0 ? (montoPagadoTotal / montoTotalFiado) * 100 : 0;

    // Promedio de saldo pendiente
    const promedioSaldoPendiente =
      totalVentasFiadas > 0 ? saldoPendienteTotal / totalVentasFiadas : 0;

    // Ventas por estado de pago
    const ventasPorEstado = {
      pendiente: ventasFiadas.filter((v: VentaFiadaConRelaciones) => v.estadoPago === "PENDIENTE").length,
      pagoParcial: ventasFiadas.filter((v: VentaFiadaConRelaciones) => v.estadoPago === "PAGO_PARCIAL").length,
      pagado: ventasFiadas.filter((v: VentaFiadaConRelaciones) => v.estadoPago === "PAGADO").length,
      vencido: ventasFiadas.filter((v: VentaFiadaConRelaciones) => v.estadoPago === "VENCIDO").length,
    };

    // Top clientes con deuda
    const clientesConDeuda = ventasFiadas
      .filter((v: VentaFiadaConRelaciones) => Number(v.saldoPendiente || 0) > 0)
      .reduce((acc: Record<string, { id: string; nombre: string; email: string | null; totalDeuda: number; ventasPendientes: number }>, venta: VentaFiadaConRelaciones) => {
        if (!venta.cliente) return acc;
        
        const clienteId = venta.cliente.id;
        if (!acc[clienteId]) {
          acc[clienteId] = {
            id: venta.cliente.id,
            nombre: venta.cliente.nombre,
            email: venta.cliente.email,
            totalDeuda: 0,
            ventasPendientes: 0,
          };
        }
        
        acc[clienteId].totalDeuda += Number(venta.saldoPendiente || 0);
        acc[clienteId].ventasPendientes += 1;
        
        return acc;
      }, {});

    const topClientesDeuda = Object.values(clientesConDeuda)
      .sort((a: any, b: any) => b.totalDeuda - a.totalDeuda)
      .slice(0, 10);

    // Construir respuesta
    const estadisticas = {
      resumen: {
        totalVentasFiadas,
        montoTotalFiado,
        saldoPendienteTotal,
        montoPagadoTotal,
        tasaRecuperacion,
        promedioSaldoPendiente,
      },
      vencimientos: {
        ventasVencidas: ventasVencidas.length,
        montoVencido,
        ventasPorVencer: ventasPorVencer.length,
        montoPorVencer,
      },
      estadosPago: {
        ventasConPagoParcial,
        distribucion: ventasPorEstado,
      },
      topClientes: topClientesDeuda,
      ventasRecientes: ventasFiadas
        .sort((a: VentaFiadaConRelaciones, b: VentaFiadaConRelaciones) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((v: VentaFiadaConRelaciones) => ({
          id: v.id,
          cliente: v.cliente,
          total: v.total,
          montoPagado: v.montoPagado,
          saldoPendiente: v.saldoPendiente,
          estadoPago: v.estadoPago,
          fechaVencimiento: v.fechaVencimiento,
          createdAt: v.createdAt,
          cantidadPagos: v.pagos.length,
        })),
    };

    return NextResponse.json(estadisticas);
  } catch (error) {
    console.error("Error al obtener estadísticas de ventas fiadas:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}