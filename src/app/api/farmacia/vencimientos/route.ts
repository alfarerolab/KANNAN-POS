import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const filtro = searchParams.get("filtro") || "todos"; // todos, proximos, vencidos, vigentes
    const dias = Number.parseInt(searchParams.get("dias") || "30");

    // Obtener productos con vencimientos habilitados
    const productos = await db.producto.findMany({
      where: {
        empresaId,
        manejaVencimiento: true,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        sku: true,
        codigoBarras: true,
        enStock: true,
        stockMinimo: true,
        fechasVencimiento: true,
        categoria: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    // Procesar cada producto y extraer info de vencimiento
    const resultados: any[] = [];

    for (const producto of productos) {
      const fechasVenc = producto.fechasVencimiento as any[];
      if (!fechasVenc || !Array.isArray(fechasVenc) || fechasVenc.length === 0) continue;

      for (const lote of fechasVenc) {
        const fechaVenc = new Date(lote.fecha);
        fechaVenc.setHours(0, 0, 0, 0);

        let estado: "vigente" | "proximo" | "vencido" = "vigente";
        let diasRestantes = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        if (fechaVenc < hoy) {
          estado = "vencido";
        } else if (fechaVenc <= fechaLimite) {
          estado = "proximo";
        }

        // Aplicar filtro
        if (filtro === "proximos" && estado !== "proximo") continue;
        if (filtro === "vencidos" && estado !== "vencido") continue;
        if (filtro === "vigentes" && estado !== "vigente") continue;

        resultados.push({
          productoId: producto.id,
          productoNombre: producto.nombre,
          sku: producto.sku,
          codigoBarras: producto.codigoBarras,
          categoria: producto.categoria?.nombre || "Sin categoría",
          lote: lote.lote || "Sin lote",
          fechaVencimiento: lote.fecha,
          cantidad: lote.cantidad || 0,
          estado,
          diasRestantes,
          stockTotal: Number(producto.enStock),
          stockMinimo: Number(producto.stockMinimo),
        });
      }
    }

    // Ordenar por urgencia (vencidos primero, luego próximos por días restantes)
    resultados.sort((a, b) => {
      const prioridad: Record<string, number> = { vencido: 0, proximo: 1, vigente: 2 };
      if (prioridad[a.estado] !== prioridad[b.estado]) {
        return prioridad[a.estado] - prioridad[b.estado];
      }
      return a.diasRestantes - b.diasRestantes;
    });

    return NextResponse.json({
      datos: resultados,
      meta: {
        total: resultados.length,
        vencidos: resultados.filter((r) => r.estado === "vencido").length,
        proximos: resultados.filter((r) => r.estado === "proximo").length,
        vigentes: resultados.filter((r) => r.estado === "vigente").length,
      },
    });
  } catch (error) {
    console.error("Error al obtener vencimientos:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener vencimientos" },
      { status: 500 }
    );
  }
}
