import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parámetros de filtro
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json(
        { message: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Crear condiciones de filtrado
    const whereClause: any = {
      empresaId,
      estado: "COMPLETADA", // Solo ventas completadas
    };

    // Filtrar por fecha
    if (fechaInicio || fechaFin) {
      whereClause.createdAt = {};

      if (fechaInicio) {
        whereClause.createdAt.gte = new Date(fechaInicio);
      }

      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = fechaFinDate;
      }
    }

    // Agrupar ventas por usuario
    const ventasPorUsuario = await db.venta.groupBy({
      by: ['usuarioId'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    // Obtener información de los usuarios
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const usuarioIds = ventasPorUsuario.map(v => v.usuarioId).filter(Boolean);
    
    const usuarios = await db.usuario.findMany({
      where: {
        id: {
          in: usuarioIds
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      }
    });

    // Combinar datos de ventas con información de usuarios
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const reporteVentasPorUsuario = ventasPorUsuario.map(venta => {
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const usuario = usuarios.find(u => u.id === venta.usuarioId);
      
      return {
        usuarioId: venta.usuarioId,
        nombre: usuario?.nombre || "Usuario no encontrado",
        email: usuario?.email || "",
        cantidadVentas: venta._count.id,
        totalVentas: Number(venta._sum.total || 0),
        promedioVenta: venta._count.id > 0 
          ? Number(venta._sum.total || 0) / venta._count.id 
          : 0,
      };
    });

    // Ordenar por total de ventas (descendente)
    const reporteOrdenado = reporteVentasPorUsuario.sort(
      // @ts-expect-error Autofix Next15 o tipos implícitos
      (a, b) => b.totalVentas - a.totalVentas
    );

    // Calcular totales generales
    const totales = {
      totalUsuarios: reporteOrdenado.length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      totalVentas: reporteOrdenado.reduce((sum: number, item) => sum + item.cantidadVentas, 0),
      // @ts-expect-error Autofix Next15 o tipos implícitos
      totalIngresos: reporteOrdenado.reduce((sum: number, item) => sum + item.totalVentas, 0),
    };

    return NextResponse.json({
      datos: reporteOrdenado,
      totales,
    });

  } catch (error) {
    console.error("Error al generar reporte de ventas por usuario:", error);
    return NextResponse.json(
      { message: "Error al generar reporte de ventas por usuario" },
      { status: 500 }
    );
  }
}