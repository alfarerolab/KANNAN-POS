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
      clienteId: {
        not: null, // Solo ventas con cliente asignado
      },
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

    // Agrupar ventas por cliente
    const ventasPorCliente = await db.venta.groupBy({
      by: ['clienteId'],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    // Obtener información de los clientes
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clienteIds = ventasPorCliente.map(v => v.clienteId).filter(Boolean);

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const idsValidos = clienteIds.filter((id): id is string => id !== null);

    const clientes = await db.cliente.findMany({
      where: {
        id: { in: idsValidos },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
      },
    });

    // Obtener la fecha de última compra para cada cliente
    const ultimasCompras = await db.venta.findMany({
      where: {
        clienteId: { in: idsValidos },
        empresaId,
        estado: "COMPLETADA",
      },
      select: {
        clienteId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['clienteId'],
    });
    
    // Combinar datos de ventas con información de clientes
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const reporteVentasPorCliente = ventasPorCliente.map(venta => {
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const cliente = clientes.find(c => c.id === venta.clienteId);
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const ultimaCompra = ultimasCompras.find(u => u.clienteId === venta.clienteId);
      
      return {
        clienteId: venta.clienteId,
        nombre: cliente?.nombre || "Cliente no encontrado",
        email: cliente?.email || "",
        telefono: cliente?.telefono || "",
        cantidadVentas: venta._count.id,
        totalVentas: Number(venta._sum.total || 0),
        promedioVenta: venta._count.id > 0 
          ? Number(venta._sum.total || 0) / venta._count.id 
          : 0,
        ultimaCompra: ultimaCompra?.createdAt || null,
      };
    });

    // Ordenar por total de ventas (descendente)
    const reporteOrdenado = reporteVentasPorCliente.sort(
      // @ts-expect-error Autofix Next15 o tipos implícitos
      (a, b) => b.totalVentas - a.totalVentas
    );

    // Calcular totales generales
    const totales = {
      totalClientes: reporteOrdenado.length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      totalVentas: reporteOrdenado.reduce((sum: number, item) => sum + item.cantidadVentas, 0),
      // @ts-expect-error Autofix Next15 o tipos implícitos
      totalIngresos: reporteOrdenado.reduce((sum: number, item) => sum + item.totalVentas, 0),
      promedioComprasPorCliente: reporteOrdenado.length > 0 
        // @ts-expect-error Autofix Next15 o tipos implícitos
        ? reporteOrdenado.reduce((sum: number, item) => sum + item.cantidadVentas, 0) / reporteOrdenado.length
        : 0,
    };

    // Segmentar clientes por valor
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clientesVIP = reporteOrdenado.filter(c => c.totalVentas > totales.totalIngresos / totales.totalClientes * 2);
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clientesRegulares = reporteOrdenado.filter(c => 
      c.totalVentas <= totales.totalIngresos / totales.totalClientes * 2 &&
      c.totalVentas >= totales.totalIngresos / totales.totalClientes * 0.5
    );
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clientesOcasionales = reporteOrdenado.filter(c => c.totalVentas < totales.totalIngresos / totales.totalClientes * 0.5);

    return NextResponse.json({
      datos: reporteOrdenado,
      totales,
      segmentacion: {
        vip: clientesVIP.length,
        regulares: clientesRegulares.length,
        ocasionales: clientesOcasionales.length,
      },
    });

  } catch (error) {
    console.error("Error al generar reporte de ventas por cliente:", error);
    return NextResponse.json(
      { message: "Error al generar reporte de ventas por cliente" },
      { status: 500 }
    );
  }
}