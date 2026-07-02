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

    // Leer parámetros de paginación
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    // Validación
    const skip = (page - 1) * limit;

    // Obtener ventas + productos
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
        meta: {
          total: 0,
          page,
          limit,
          totalPaginas: 0,
        },
      });
    }

    // Agrupar productos
    const acumulado = new Map<string, any>();

    for (const venta of ventas) {
      for (const item of venta.items) {
        const id = item.productoId;
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

        const cantidadNum = Number(item.cantidad);
        const precioNum = Number(item.precio);

        ref.cantidad += cantidadNum;
        ref.ingresos += cantidadNum * precioNum;
        ref.numeroVentas += 1;
      }
    }

    // Convertir mapa a array final
    const lista = Array.from(acumulado.values());

    /** 🔹 APLICAR PAGINACIÓN AQUÍ */
    const total = lista.length;
    const totalPaginas = Math.ceil(total / limit);

    const listaPaginada = lista
      .sort((a, b) => b.cantidad - a.cantidad) // ordenar por cantidad vendida
      .slice(skip, skip + limit);

    return NextResponse.json({
      productos: listaPaginada,
      topProductosCantidad: [...lista].sort((a, b) => b.cantidad - a.cantidad),
      topProductosIngresos: [...lista].sort((a, b) => b.ingresos - a.ingresos),
      meta: {
        total,
        page,
        limit,
        totalPaginas,
      },
    });

  } catch (error) {
    console.error("❌ Error en /api/ventas/analisis:", error);
    return NextResponse.json(
      { mensaje: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
