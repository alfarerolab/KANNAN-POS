import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * GET /api/peluqueria/comisiones
 * Retorna el reporte de comisiones agrupado por empleado.
 * Filtra ItemVenta donde servicioId IS NOT NULL y empleadoId IS NOT NULL.
 *
 * Query params:
 *   desde: ISO date string
 *   hasta: ISO date string
 *   empleadoId: string (opcional, para filtrar un empleado específico)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Sin permisos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const empleadoIdFiltro = searchParams.get("empleadoId");

    // Construir filtro de fecha
    const fechaFiltro: any = {};
    if (desde) fechaFiltro.gte = new Date(desde);
    if (hasta) fechaFiltro.lte = new Date(hasta);

    const where: any = {
      venta: {
        empresaId,
        // Incluir ventas COMPLETADAS y PENDIENTES (crédito/mixto pueden quedar en PENDIENTE)
        estado: { in: ["COMPLETADA", "PENDIENTE"] },
      },
      empleadoId: { not: null },
    };
    if (Object.keys(fechaFiltro).length > 0) where.createdAt = fechaFiltro;
    if (empleadoIdFiltro) where.empleadoId = empleadoIdFiltro;

    // Obtener todos los ítems con empleado asignado (servicios y productos)
    const items = await db.itemVenta.findMany({
      where,
      select: {
        id: true,
        subtotal: true,
        empleadoId: true,
        empleado: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            porcentajeComision: true,
          },
        },
        servicio: { select: { id: true, nombre: true, porcentajeEmpleado: true } },
        producto: { select: { id: true, nombre: true } },
        createdAt: true,
        comisionPagada: true,
      },
    });

    // Obtener los gastos de comisiones (pagos realizados) en el mismo rango de fechas
    const gastosComisiones = await db.gasto.findMany({
      where: {
        empresaId,
        concepto: {
          contains: "Liquidación de comisiones",
        },
        ...(Object.keys(fechaFiltro).length > 0 ? { fecha: fechaFiltro } : {})
      }
    });

    // Agrupar por empleado
    const porEmpleado = new Map<
      string,
      {
        empleadoId: string;
        nombre: string;
        imagen: string | null;
        porcentajeComision: number;
        totalServicios: number;
        totalMonto: number;
        montoComision: number;
        items: { id: string; servicioNombre: string; subtotal: number; fecha: Date; comision: number; porcentajeAsignado: number; pagado: boolean }[];
        montoPagado: number;
      }
    >();

    for (const item of items) {
      if (!item.empleadoId || !item.empleado) continue;

      const subtotal = parseFloat(item.subtotal.toString());
      
      // Use service commission, fallback to employee commission, fallback to 0
      const porcentaje = item.servicio?.porcentajeEmpleado 
        ? parseFloat(item.servicio.porcentajeEmpleado.toString())
        : (item.empleado.porcentajeComision ? parseFloat(item.empleado.porcentajeComision.toString()) : 0);

      if (!porEmpleado.has(item.empleadoId)) {
        porEmpleado.set(item.empleadoId, {
          empleadoId: item.empleadoId,
          nombre: item.empleado.nombre,
          imagen: item.empleado.imagen,
          porcentajeComision: porcentaje,
          totalServicios: 0,
          totalMonto: 0,
          montoComision: 0,
          montoPagado: 0,
          items: [],
        });
      }

      const entry = porEmpleado.get(item.empleadoId)!;
      entry.totalServicios++;
      entry.totalMonto += subtotal;
      const isPagado = item.comisionPagada;
      if (isPagado) {
        entry.montoPagado += subtotal * (porcentaje / 100);
      } else {
        entry.montoComision += subtotal * (porcentaje / 100);
      }

      entry.items.push({
        id: item.id,
        servicioNombre: item.servicio?.nombre || item.producto?.nombre || "Ítem de venta",
        subtotal,
        fecha: item.createdAt,
        comision: subtotal * (porcentaje / 100),
        porcentajeAsignado: porcentaje,
        pagado: isPagado
      });
    }

    const resultado = Array.from(porEmpleado.values()).map(entry => {
      return {
        ...entry,
        montoTotalGenerado: entry.montoComision + entry.montoPagado,
      };
    }).sort((a, b) => b.totalMonto - a.totalMonto);

    // Totales generales
    const totalGeneral = resultado.reduce((sum, e) => sum + e.totalMonto, 0);
    const totalComisiones = resultado.reduce((sum, e) => sum + e.montoComision, 0);

    return NextResponse.json({
      empleados: resultado,
      resumen: {
        totalEmpleados: resultado.length,
        totalServicios: items.length,
        totalGeneral,
        totalComisiones,
      },
    });
  } catch (error) {
    console.error("Error al calcular comisiones:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
