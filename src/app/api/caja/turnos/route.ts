import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado"); // 'abierto' | 'cerrado' | 'todos'

    const where: any = {
      empresaId: session.user.empresaId,
    };

    if (estado === "abierto") {
      where.cerradaEn = null;
    } else if (estado === "cerrado") {
      where.cerradaEn = { not: null };
    }

    const turnos = await db.cajaTurno.findMany({
      where,
      orderBy: {
        abiertaEn: 'desc'
      },
      include: {
        usuario: {
          select: {
            nombre: true
          }
        }
      },
      take: 50 // Limit to recent 50
    });

    return NextResponse.json({ success: true, turnos });
  } catch (error: any) {
    console.error("[OBTENER TURNOS]", error);
    return NextResponse.json({ error: "Error al obtener turnos", details: error.message }, { status: 500 });
  }
}
