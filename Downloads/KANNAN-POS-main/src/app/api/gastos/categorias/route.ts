import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET — listar categorías de gasto de la empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Sin permisos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;

    const categorias = await db.categoriaGasto.findMany({
      where: { empresaId },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, createdAt: true },
    });

    return NextResponse.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías de gasto:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}

// POST — crear nueva categoría de gasto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Sin permisos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { nombre } = await request.json();

    if (!nombre?.trim()) {
      return NextResponse.json({ mensaje: "El nombre es requerido" }, { status: 400 });
    }

    // Verificar duplicado
    const existente = await db.categoriaGasto.findFirst({
      where: { empresaId, nombre: { equals: nombre.trim() } },
    });

    if (existente) {
      return NextResponse.json({ mensaje: "Ya existe una categoría con ese nombre" }, { status: 400 });
    }

    const categoria = await db.categoriaGasto.create({
      data: { nombre: nombre.trim(), empresaId },
      select: { id: true, nombre: true, createdAt: true },
    });

    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría de gasto:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
