import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/pos/empleados
 * Retorna lista de empleados activos de la empresa para asignar a servicios.
 * Incluye tanto usuarios con login como empleados operativos (sin login).
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = token.empresaId as string;

    const empleados = await db.usuario.findMany({
      where: {
        empresaId,
        activo: true,
        OR: [
          { rol: "EMPLEADO" },
          { esEmpleadoOperativo: true }
        ],
      },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        rol: true,
        esEmpleadoOperativo: true,
        porcentajeComision: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(
      empleados.map((e: {
        id: string;
        nombre: string;
        imagen: string | null;
        rol: string;
        esEmpleadoOperativo: boolean;
        porcentajeComision: { toString: () => string } | null;
      }) => ({
        id: e.id,
        nombre: e.nombre,
        imagen: e.imagen,
        rol: e.rol,
        esEmpleadoOperativo: e.esEmpleadoOperativo,
        porcentajeComision: e.porcentajeComision
          ? parseFloat(e.porcentajeComision.toString())
          : null,
      }))
    );
  } catch (error) {
    console.error("Error al obtener empleados para POS:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
