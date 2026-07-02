import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { montoInicial } = body;

    // Check if there is already an open shift
    const turnoAbierto = await db.cajaTurno.findFirst({
      where: {
        empresaId: session.user.empresaId,
        cerradaEn: null
      }
    });

    if (turnoAbierto) {
      return NextResponse.json({ error: "Ya existe una caja abierta" }, { status: 400 });
    }

    const nuevoTurno = await db.cajaTurno.create({
      data: {
        empresaId: session.user.empresaId,
        usuarioId: session.user.id,
        montoInicial: montoInicial || 0,
      }
    });

    return NextResponse.json({ success: true, turno: nuevoTurno });
  } catch (error: any) {
    console.error("[ABRIR CAJA]", error);
    return NextResponse.json({ error: "Error al abrir la caja", details: error.message }, { status: 500 });
  }
}
