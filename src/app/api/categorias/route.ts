import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todas las categorías de la empresa actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    // Opciones de búsqueda y paginación
    const busqueda = searchParams.get("busqueda");
    const pagina = Number.parseInt(searchParams.get("pagina") || "1");
    const limite = Number.parseInt(searchParams.get("limite") || "50");
    const omitir = (pagina - 1) * limite;

    // Construir la consulta
    const whereClause: {
      empresaId: string;
      OR?: Array<{ nombre?: { contains: string } }>;
    } = { empresaId };

    if (busqueda) {
      whereClause.OR = [
        { nombre: { contains: busqueda } },
        // @ts-expect-error Mismatch de tipos Prisma u obj temporal
        { descripcion: { contains: busqueda } },
      ];
    }

    // Contar categorías para la paginación
    const totalCategorias = await db.categoria.count({
      where: whereClause,
    });

    // Obtener categorías con paginación
    const categorias = await db.categoria.findMany({
      where: whereClause,
      orderBy: {
        nombre: "asc",
      },
      skip: omitir,
      take: limite,
    });

    return NextResponse.json({
      datos: categorias,
      meta: {
        total: totalCategorias,
        pagina,
        limite,
        totalPaginas: Math.ceil(totalCategorias / limite),
      },
    });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva categoría
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const body = await request.json();
    const { nombre, descripcion } = body;

    // Validación básica
    if (!nombre) {
      return NextResponse.json(
        { mensaje: "El nombre de la categoría es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una categoría con el mismo nombre en la empresa
    const categoriaExistente = await db.categoria.findFirst({
      where: {
        nombre,
        empresaId,
      },
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { mensaje: "Ya existe una categoría con ese nombre en su empresa" },
        { status: 400 }
      );
    }

    // Crear la categoría
    const categoria = await db.categoria.create({
      data: {
        nombre,
        descripcion,
        empresaId,
      },
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { mensaje: "Error al crear categoría" },
      { status: 500 }
    );
  }
}
