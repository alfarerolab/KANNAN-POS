// app/api/restaurante/caja/turno/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

// GET → devuelve el turno activo (cerradaEn === null) de la empresa
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const turno = await db.cajaTurno.findFirst({
      where: {
        empresaId: token.empresaId as string,
        cerradaEn: null,
      },
      orderBy: { abiertaEn: "desc" },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ turno });
  } catch (error) {
    console.error("[CAJA_TURNO_GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → abre un nuevo turno (cierra el anterior si quedó abierto)
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.empresaId || !token?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const notas: string | undefined = body?.notas;

    await db.cajaTurno.updateMany({
      where: {
        empresaId: token.empresaId as string,
        cerradaEn: null,
      },
      data: { cerradaEn: new Date() },
    });

    const turno = await db.cajaTurno.create({
      data: {
        empresaId: token.empresaId as string,
        usuarioId: token.id as string,
        notas: notas || null,
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ turno });
  } catch (error) {
    console.error("[CAJA_TURNO_POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH → cierra el turno activo
export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const turno = await db.cajaTurno.findFirst({
      where: {
        empresaId: token.empresaId as string,
        cerradaEn: null,
      },
      orderBy: { abiertaEn: "desc" },
    });

    if (!turno) {
      return NextResponse.json({ error: "No hay turno activo" }, { status: 404 });
    }

    const turnoCerrado = await db.cajaTurno.update({
      where: { id: turno.id },
      data: { cerradaEn: new Date() },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({ turno: turnoCerrado });
  } catch (error) {
    console.error("[CAJA_TURNO_PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}