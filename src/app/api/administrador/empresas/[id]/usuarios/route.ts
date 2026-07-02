import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: empresaId } = await params; // ⭐ CAMBIO: await params

    const empresa = await db.empresa.findUnique({
      where: { id: empresaId },
      include: {
        usuarios: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    return NextResponse.json(empresa.usuarios, { status: 200 });
  } catch (error) {
    console.error("💥 Error en GET /api/administrador/empresas/[id]/usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}