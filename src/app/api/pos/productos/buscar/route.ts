import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = token.empresaId as string;
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    const productos = await db.producto.findMany({
      where: {
        empresaId,
        activo: true,
        nombre: { contains: q },
      },
      select: {
        id: true,
        nombre: true,
        enStock: true,
        unidadBase: true,
      },
      orderBy: { nombre: "asc" },
      take: 8,
    });

    const resultado = productos.map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      enStock: Number(p.enStock),
      unidadBase: p.unidadBase,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al buscar productos:", error);
    return NextResponse.json(
      { error: "Error al buscar productos" },
      { status: 500 }
    );
  }
}
