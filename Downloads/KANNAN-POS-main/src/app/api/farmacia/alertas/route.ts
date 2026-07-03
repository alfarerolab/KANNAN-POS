import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Obtener todos los productos con vencimientos
    const productos = await db.producto.findMany({
      where: {
        empresaId,
        manejaVencimiento: true,
        activo: true,
      },
      select: {
        id: true,
        enStock: true,
        stockMinimo: true,
        fechasVencimiento: true,
      },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en30Dias = new Date(hoy);
    en30Dias.setDate(en30Dias.getDate() + 30);
    const en7Dias = new Date(hoy);
    en7Dias.setDate(en7Dias.getDate() + 7);

    let totalLotes = 0;
    let vencidos = 0;
    let proximos30 = 0;
    let proximos7 = 0;
    let vigentes = 0;
    let stockBajo = 0;

    // Count products with low stock (done in JS since we need field comparison)
    const allActiveProducts = await db.producto.findMany({
      where: {
        empresaId,
        activo: true,
      },
      select: {
        enStock: true,
        stockMinimo: true,
      },
    });

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const productosStockBajo = allActiveProducts.filter(p => 
      Number(p.enStock) <= Number(p.stockMinimo)
    ).length;

    for (const producto of productos) {
      const stock = Number(producto.enStock);
      const stockMin = Number(producto.stockMinimo);
      if (stock <= stockMin && stock >= 0) {
        stockBajo++;
      }

      const fechasVenc = producto.fechasVencimiento as any[];
      if (!fechasVenc || !Array.isArray(fechasVenc)) continue;

      for (const lote of fechasVenc) {
        totalLotes++;
        const fechaVenc = new Date(lote.fecha);
        fechaVenc.setHours(0, 0, 0, 0);

        if (fechaVenc < hoy) {
          vencidos++;
        } else if (fechaVenc <= en7Dias) {
          proximos7++;
          proximos30++;
        } else if (fechaVenc <= en30Dias) {
          proximos30++;
        } else {
          vigentes++;
        }
      }
    }

    return NextResponse.json({
      totalProductosConVencimiento: productos.length,
      totalLotes,
      vencidos,
      proximos7Dias: proximos7,
      proximos30Dias: proximos30,
      vigentes,
      stockBajo,
      productosStockBajoGeneral: productosStockBajo,
    });
  } catch (error) {
    console.error("Error al obtener alertas de farmacia:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener alertas" },
      { status: 500 }
    );
  }
}
