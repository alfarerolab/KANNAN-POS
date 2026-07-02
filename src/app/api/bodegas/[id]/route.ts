import { type NextRequest, NextResponse } from "next/server";
import { withApiAuth, withApiError } from "@/lib/api-middleware";
import { db } from "@/lib/db";
import type { Session } from "next-auth";

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Obtener bodega por ID
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  return withApiError(async () => {
    return withApiAuth(async (session: Session) => {
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

      const bodega = await db.bodega.findFirst({
        where: {
          id: id,
          empresaId: session.user.empresaId,
        },
        include: {
          movimientos: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true,
                  tipoVenta: true,
                },
              },
              usuario: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          _count: {
            select: { movimientos: true },
          },
        },
      });

      if (!bodega) {
        return NextResponse.json(
          { error: "Bodega no encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json(bodega);
    });
  });
}

// PUT - Actualizar bodega
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  return withApiError(async () => {
    return withApiAuth(async (session: Session) => {
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

      const body = await request.json();

      const bodegaExistente = await db.bodega.findFirst({
        where: {
          id: id,
          empresaId: session.user.empresaId,
        },
      });

      if (!bodegaExistente) {
        return NextResponse.json(
          { error: "Bodega no encontrada" },
          { status: 404 }
        );
      }

      const bodega = await db.bodega.update({
        where: { id: id },
        data: body,
        include: {
          _count: {
            select: { movimientos: true },
          },
        },
      });

      return NextResponse.json(bodega);
    });
  });
}

// DELETE - Eliminar bodega
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  
  return withApiError(async () => {
    return withApiAuth(async (session: Session) => {
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

      const bodegaExistente = await db.bodega.findFirst({
        where: {
          id: id,
          empresaId: session.user.empresaId,
        },
        include: {
          _count: {
            select: { movimientos: true },
          },
        },
      });

      if (!bodegaExistente) {
        return NextResponse.json(
          { error: "Bodega no encontrada" },
          { status: 404 }
        );
      }

      // Verificar si la bodega tiene movimientos
      if (bodegaExistente._count.movimientos > 0) {
        return NextResponse.json(
          { error: "No se puede eliminar una bodega con movimientos registrados" },
          { status: 400 }
        );
      }

      await db.bodega.delete({
        where: { id: id },
      });

      return NextResponse.json({ success: true });
    });
  });
}