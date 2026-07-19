// Editado: Importado desde la versión de producción en la VPS
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Obtener token del usuario (como lo tenías)
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = token.empresaId as string;
    const url = new URL(req.url);

    // Parámetros de filtrado
    const busqueda = url.searchParams.get("busqueda") || "";
    const categoriaId = url.searchParams.get("categoriaId") || undefined;
    const soloDisponibles = url.searchParams.get("soloDisponibles") === "true";
    const limite = parseInt(url.searchParams.get("limite") || "100");
    const pagina = parseInt(url.searchParams.get("pagina") || "1");
    const skip = (pagina - 1) * limite;

    // Construcción de filtros
    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
    const filtros: Prisma.ProductoWhereInput = {
      empresaId,
      activo: true,
    };

    if (categoriaId) {
      filtros.categoriaId = categoriaId;
    }

    if (soloDisponibles) {
      filtros.enStock = { gt: new Prisma.Decimal(0) };
    }

    if (busqueda) {
      filtros.OR = [
        { nombre: { contains: busqueda } },
        { descripcion: { contains: busqueda } }, 
        { codigoBarras: { contains: busqueda } }, 
        { sku: { contains: busqueda } }, 
      ];
    }

    // Consultar productos y total
    const [productos, total] = await Promise.all([
      db.producto.findMany({
        where: filtros,
        include: {
          categoria: { select: { id: true, nombre: true } },
          componentes: {
            select: {
              cantidad: true,
              componente: {
                select: {
                  id: true,
                  nombre: true,
                  enStock: true,
                },
              },
            },
          },
        },
        orderBy: { nombre: "asc" },
        skip,
        take: limite,
      }),
      db.producto.count({ where: filtros }),
    ]);

  // Transformar productos y calcular stock virtual para combos
  // @ts-expect-error Autofix Next15 o tipos implícitos
  const productosTransformados = productos.map(p => {
    let stockCalculado = Number(p.enStock);

    // Si es combo, calcular stock basado en componentes
    if (p.esCombo && p.componentes && p.componentes.length > 0) {
      let minCombos = Infinity;
      for (const comp of p.componentes) {
        const stockComponente = Number(comp.componente.enStock);
        const cantidadRequerida = Number(comp.cantidad);
        if (cantidadRequerida <= 0) continue;
        const combosConEste = Math.floor(stockComponente / cantidadRequerida);
        minCombos = Math.min(minCombos, combosConEste);
      }
      stockCalculado = minCombos === Infinity ? 0 : minCombos;
    }

    return {
      ...p,
      enStock: stockCalculado,
      stockMinimo: Number(p.stockMinimo),
      precio: Number(p.precio),
      precioCosto: p.precioCosto ? Number(p.precioCosto) : null,
    };
  });



    // Consultar categorías (solo si no hay búsqueda para ahorrar recursos)
    let categorias: any[] = [];
    if (!busqueda && !categoriaId) {
      categorias = await db.categoria.findMany({
        where: { empresaId },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          descripcion: true,
          // _count: { select: { productos: true } }, // Removido para mejorar el rendimiento (causaba demoras)
        },
      });
    }

    return NextResponse.json({
      datos: productosTransformados, 
      paginacion: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
      categorias,
    });
  } catch (error) {
    console.error("Error al obtener productos para POS:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}
