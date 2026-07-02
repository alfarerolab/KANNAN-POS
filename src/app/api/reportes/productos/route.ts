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
    const categoriaId = searchParams.get("categoriaId");
    const stockMin = searchParams.get("stockMin");
    const stockMax = searchParams.get("stockMax");
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json({ message: "Empresa no encontrada" }, { status: 404 });
    }

    const whereClause: any = { empresaId };
    if (categoriaId) whereClause.categoriaId = categoriaId;
    if (stockMin || stockMax) {
      whereClause.enStock = {};
      if (stockMin) whereClause.enStock.gte = parseInt(stockMin);
      if (stockMax) whereClause.enStock.lte = parseInt(stockMax);
    }

    const productos = await db.producto.findMany({
      where: whereClause,
      include: {
        categoria: true,
        _count: { select: { itemsVenta: true, movimientosInventario: true } }, 
      },
      orderBy: { enStock: "asc" },
    });

    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 1);

    const movimientos = await db.movimientoInventario.findMany({
      where: {
        producto: { empresaId },
        fechaMovimiento: { gte: fechaInicio },
      },
      include: { producto: { select: { id: true, nombre: true } } },
    });

    // 👇 aquí usamos db.itemVenta, porque el modelo en prisma es ItemVenta
    const ventas = await db.itemVenta.findMany({
      where: {
        venta: { empresaId, createdAt: { gte: fechaInicio } },
      },
      include: {
        producto: { select: { id: true, nombre: true, precio: true, precioCosto: true } },
      },
    });

    const totalProductos = productos.length;
    const valorInventarioTotal = productos.reduce(
      // @ts-expect-error Autofix Next15 o tipos implícitos
      (sum, p) => sum + Number(p.precioCosto ?? 0) * Number(p.enStock),
      0
    );

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const productosStockBajo = productos.filter((p) => Number(p.enStock) < 10);

    const rotacionProductos: any = {};

    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventas.forEach((detalle) => {
      const productoId = detalle.productoId;
      if (!productoId) return;

      if (!rotacionProductos[productoId]) {
        rotacionProductos[productoId] = {
          id: productoId,
          nombre: detalle.producto?.nombre || "Producto Desconocido",
          cantidadVendida: 0,
          ventasTotal: 0,
          margenBruto: 0,
          ultimoMovimiento: null,
        };
      }
      rotacionProductos[productoId].cantidadVendida += detalle.cantidad;
      rotacionProductos[productoId].ventasTotal += Number(detalle.subtotal);

      if (detalle.producto) {
        const costo = Number(detalle.producto.precioCosto ?? 0) * Number(detalle.cantidad);
        rotacionProductos[productoId].margenBruto += Number(detalle.subtotal) - costo;
      }
    });

    // @ts-expect-error Autofix Next15 o tipos implícitos
    movimientos.forEach((mov) => {
      const productoId = mov.productoId;
      if (!productoId) return;

      if (!rotacionProductos[productoId]) {
        rotacionProductos[productoId] = {
          id: productoId,
          nombre: mov.producto?.nombre || "Producto Desconocido",
          cantidadVendida: 0,
          ventasTotal: 0,
          margenBruto: 0,
          ultimoMovimiento: null,
        };
      }
      if (
        !rotacionProductos[productoId].ultimoMovimiento ||
        new Date(mov.fechaMovimiento) > new Date(rotacionProductos[productoId].ultimoMovimiento)
      ) {
        rotacionProductos[productoId].ultimoMovimiento = mov.fechaMovimiento;
      }
    });

    const rotacionProductosArray = Object.values(rotacionProductos).sort(
      (a: any, b: any) => b.cantidadVendida - a.cantidadVendida
    );

    const productosSinMovimiento = productos.filter(
      // @ts-expect-error Autofix Next15 o tipos implícitos
      (p) => !rotacionProductosArray.some((item: any) => item.id === p.id)
    );

    return NextResponse.json({
      resumen: {
        totalProductos,
        valorInventarioTotal,
        productosStockBajo: productosStockBajo.length,
        productosSinMovimiento: productosSinMovimiento.length,
      },
      productosStockBajo,
      productosSinMovimiento,
      rotacionProductos: rotacionProductosArray.slice(0, 20),
      productos,
    });
  } catch (error) {
    console.error("Error al generar reporte de productos:", error);
    return NextResponse.json({ message: "Error al generar reporte de productos" }, { status: 500 });
  }
}
