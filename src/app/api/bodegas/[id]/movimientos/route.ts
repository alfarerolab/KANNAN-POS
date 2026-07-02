import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import type { TipoMovimiento } from "../../../../../lib/prisma-types";
// ⭐ CAMBIO: Params ahora usa Promise
interface Params {
  params: Promise<{ id: string }>;
}

// GET - Obtener movimientos de una bodega
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    // Verificar si la empresa tiene bodegas habilitadas
    const empresa = await db.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { bodegaHabilitada: true },
    });

    if (!empresa?.bodegaHabilitada) {
      return NextResponse.json(
        { error: "Las bodegas no están habilitadas para esta empresa" },
        { status: 403 }
      );
    }

    // Verificar que la bodega pertenece a la empresa
    const bodega = await db.bodega.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!bodega) {
      return NextResponse.json(
        { error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") ?? "1");
    const limit = Number.parseInt(searchParams.get("limit") ?? "10");
    const tipo = searchParams.get("tipo");
    const productoId = searchParams.get("productoId");

    const skip = (page - 1) * limit;

    const where: any = {
      bodegaId: id,
      ...(tipo && { tipo: tipo as TipoMovimiento }),
      ...(productoId && { productoId }),
    };

    const [movimientos, total] = await Promise.all([
      db.movimientoBodega.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              tipoVenta: true,
              precio: true,
              precioPorKilo: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      }),
      db.movimientoBodega.count({ where }),
    ]);

    return NextResponse.json({
      movimientos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener movimientos de bodega:", error);
    return NextResponse.json(
      { error: "Error al obtener movimientos de bodega" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo movimiento de bodega
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    // Verificar si la empresa tiene bodegas habilitadas
    const empresa = await db.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { bodegaHabilitada: true },
    });

    if (!empresa?.bodegaHabilitada) {
      return NextResponse.json(
        { error: "Las bodegas no están habilitadas para esta empresa" },
        { status: 403 }
      );
    }

    // Verificar que la bodega pertenece a la empresa
    const bodega = await db.bodega.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!bodega) {
      return NextResponse.json(
        { error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Verificar que el producto pertenece a la empresa
    const producto = await db.producto.findFirst({
      where: {
        id: body.productoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const movimiento = await db.movimientoBodega.create({
      data: {
        ...body,
        bodegaId: id,
        usuarioId: session.user.id,
      },
      include: {
        producto: {
          select: {
            id: true,
            nombre: true,
            tipoVenta: true,
            precio: true,
            precioPorKilo: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json(movimiento, { status: 201 });
  } catch (error) {
    console.error("Error al crear movimiento de bodega:", error);
    return NextResponse.json(
      { error: "Error al crear movimiento de bodega" },
      { status: 500 }
    );
  }
}