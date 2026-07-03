import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

interface ProductoVendido {
  id: string;
  nombre: string;
  cantidad: number;
  monto: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const clienteId = searchParams.get("clienteId");
    const usuarioId = searchParams.get("usuarioId");
    const estado = searchParams.get("estado");
    const metodoPago = searchParams.get("metodoPago");
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json({ message: "Empresa no encontrada" }, { status: 404 });
    }

    const whereClause: any = { empresaId };

    // Filtros de fecha
    if (fechaInicio || fechaFin) {
      whereClause.createdAt = {};
      if (fechaInicio) whereClause.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = fechaFinDate;
      }
    }

    if (clienteId && clienteId !== "todos") whereClause.clienteId = clienteId;
    if (usuarioId && usuarioId !== "todos") whereClause.usuarioId = usuarioId;
    if (estado && estado !== "todos") whereClause.estado = estado;
    if (metodoPago && metodoPago !== "todos") whereClause.metodoPago = metodoPago;

    const ventas = await db.venta.findMany({
      where: whereClause,
      include: {
        cliente: { select: { id: true, nombre: true, email: true, telefono: true } },
        usuario: { select: { id: true, nombre: true, email: true } },
        items: {
          include: {
            producto: { select: { id: true, nombre: true } },
            servicio: { select: { id: true, nombre: true } },
            variante: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalVentas = ventas.length;
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const montoTotal = ventas.reduce((sum: number, v) => sum + Number(v.total), 0);

    // Agrupación por día
    const ventasPorDia: Record<string, { fecha: string; cantidad: number; monto: number }> = {};
    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventas.forEach((venta) => {
      const fecha = venta.createdAt.toISOString().split("T")[0];
      if (!ventasPorDia[fecha]) ventasPorDia[fecha] = { fecha, cantidad: 0, monto: 0 };
      ventasPorDia[fecha].cantidad += 1;
      ventasPorDia[fecha].monto += Number(venta.total);
    });

    // Agrupación de productos/servicios
    const productosPorCantidad: Record<string, ProductoVendido> = {};
    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventas.forEach((venta) => {
      // @ts-expect-error Autofix Next15 o tipos implícitos
      venta.items.forEach((detalle) => {
        const productoId = detalle.productoId || detalle.servicioId || detalle.varianteId;
        if (!productoId) return;

        let nombre = "Desconocido";
        let tipo = "Desconocido";

        if (detalle.producto) {
          tipo = "Producto";
          nombre = detalle.producto.nombre;
        } else if (detalle.servicio) {
          tipo = "Servicio";
          nombre = detalle.servicio.nombre;
        } else if (detalle.variante) {
          tipo = "Variante";
          nombre = detalle.variante.nombre;
        }

        if (!productosPorCantidad[productoId]) {
          productosPorCantidad[productoId] = { id: productoId, nombre: `${tipo}: ${nombre}`, cantidad: 0, monto: 0 };
        }

        productosPorCantidad[productoId].cantidad += Number(detalle.cantidad);
        productosPorCantidad[productoId].monto += Number(detalle.subtotal);
      });
    });

    const productosMasVendidosPorCantidad = (Object.values(productosPorCantidad) as ProductoVendido[])
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    const productosMasVendidosPorMonto = (Object.values(productosPorCantidad) as ProductoVendido[])
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10);

    // ✅ Antes de devolver la respuesta, formateamos los items con tipo y nombre
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const ventasConDetalles = ventas.map((venta) => ({
      ...venta,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      items: venta.items.map((detalle) => {
        let tipo = "Desconocido";
        let nombre = "N/A";

        if (detalle.producto) {
          tipo = "Producto";
          nombre = detalle.producto.nombre;
        } else if (detalle.servicio) {
          tipo = "Servicio";
          nombre = detalle.servicio.nombre;
        } else if (detalle.variante) {
          tipo = "Variante";
          nombre = detalle.variante.nombre;
        }

        return {
          id: detalle.id,
          tipo,
          nombre,
          cantidad: Number(detalle.cantidad),
          subtotal: Number(detalle.subtotal),
        };
      }),
    }));

    return NextResponse.json({
      resumen: {
        totalVentas,
        montoTotal,
        promedioPorVenta: totalVentas > 0 ? montoTotal / totalVentas : 0,
      },
      ventasPorDia: Object.values(ventasPorDia).sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      ),
      productosMasVendidosPorCantidad,
      productosMasVendidosPorMonto,
      ventas: ventasConDetalles, // 👈 ahora con items + tipo + nombre
    });
  } catch (error) {
    console.error("Error al generar reporte de ventas:", error);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
