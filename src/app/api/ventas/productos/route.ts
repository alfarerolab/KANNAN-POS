import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Obtener ventas de la empresa con items + productos
    const ventas = await db.venta.findMany({
      where: { empresaId },
      include: {
        items: {
          include: {
            producto: {
              include: {
                categoria: true,
              },
            },
          },
        },
      },
    });

    if (!ventas || ventas.length === 0) {
      return NextResponse.json({
        productos: [],
        topProductosCantidad: [],
        topProductosIngresos: [],
      });
    }

    // Agrupar productos
    const acumulado = new Map<string, any>();

    for (const venta of ventas) {
      for (const item of venta.items) {
        const id = item.productoId;

        // Evitar productoId null
        if (!id) continue;

        if (!acumulado.has(id)) {
          acumulado.set(id, {
            productoId: id,
            nombre: item.producto?.nombre || "Producto",
            precio: Number(item.producto?.precio) || 0,
            categoria: item.producto?.categoria || null,
            cantidad: 0,
            ingresos: 0,
            numeroVentas: 0,
          });
        }

        const ref = acumulado.get(id);

        // Prisma Decimal → convertir siempre a Number
        const cantidadNum = Number(item.cantidad);
        const precioNum = Number(item.precio);

        ref.cantidad += cantidadNum;
        ref.ingresos += cantidadNum * precioNum;
        ref.numeroVentas += 1;
      }
    }

    const lista = Array.from(acumulado.values());

    return NextResponse.json({
      productos: lista,
      topProductosCantidad: [...lista].sort((a, b) => b.cantidad - a.cantidad),
      topProductosIngresos: [...lista].sort((a, b) => b.ingresos - a.ingresos),
    });

  } catch (error) {
    console.error("❌ Error en /api/ventas/analisis:", error);
    return NextResponse.json(
      { mensaje: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
