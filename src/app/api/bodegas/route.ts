import { type NextRequest, NextResponse } from "next/server";
import { withApiAuth, withApiError } from "@/lib/api-middleware";
import { db } from "@/lib/db";

// GET - Obtener todas las bodegas de la empresa
export async function GET(request: NextRequest) {
  return withApiError(async () => {
    return withApiAuth(async (session) => {
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

      const { searchParams } = new URL(request.url);
      const page = Number.parseInt(searchParams.get("page") ?? "1");
      const limit = Number.parseInt(searchParams.get("limit") ?? "10");
      const search = searchParams.get("search") ?? "";
      const activa = searchParams.get("activa");

      const skip = (page - 1) * limit;

      const where = {
        empresaId: session.user.empresaId,
        ...(search && {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { descripcion: { contains: search, mode: "insensitive" as const } },
            { ubicacion: { contains: search, mode: "insensitive" as const } },
          ],
        }),
        ...(activa !== null && { activa: activa === "true" }),
      };

      const [bodegas, total] = await Promise.all([
        db.bodega.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { movimientos: true },
            },
          },
        }),
        db.bodega.count({ where }),
      ]);

      return NextResponse.json({
        bodegas,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    });
  });
}

// POST - Crear nueva bodega
export async function POST(request: NextRequest) {
  return withApiError(async () => {
    return withApiAuth(async (session) => {
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

      const bodega = await db.bodega.create({
        data: {
          ...body,
          empresaId: session.user.empresaId,
        },
        include: {
          _count: {
            select: { movimientos: true },
          },
        },
      });

      return NextResponse.json(bodega, { status: 201 });
    });
  });
}
