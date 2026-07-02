import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { Rol } from "./prisma-types";
import type { Session } from "next-auth";

/**
 * Middleware para verificar que un usuario tenga rol de SuperAdmin
 */
export async function soloSuperAdmin(req: NextRequest) {
  const token = await getToken({ req });

  if (!token || token.role !== "SUPERADMIN") {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a este recurso" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Middleware para verificar que un usuario sea Administrador o superior
 */
export async function soloAdministradorOSuperior(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json(
      { error: "No se proporcionó un token de autenticación" },
      { status: 401 }
    );
  }

  const rolesAutorizados: Rol[] = ["SUPERADMIN", "ADMINISTRADOR"];
  if (!rolesAutorizados.includes(token.role as Rol)) {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a este recurso" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Middleware para verificar que un usuario sea Gerente o superior
 */
export async function soloGerenteOSuperior(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json(
      { error: "No se proporcionó un token de autenticación" },
      { status: 401 }
    );
  }

  const rolesAutorizados: Rol[] = ["SUPERADMIN", "ADMINISTRADOR", "GERENTE"];
  if (!rolesAutorizados.includes(token.role as Rol)) {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a este recurso" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Middleware para verificar que un usuario pertenezca a una empresa específica
 * @param empresaId El ID de la empresa a verificar
 */
export async function verificarAccesoEmpresa(req: NextRequest, empresaId: string) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json(
      { error: "No se proporcionó un token de autenticación" },
      { status: 401 }
    );
  }

  // Si es SuperAdmin, permitir acceso a cualquier empresa
  if (token.role === "SUPERADMIN") {
    return NextResponse.next();
  }

  // Si no es SuperAdmin, verificar que pertenezca a la empresa
  if (token.empresaId !== empresaId) {
    return NextResponse.json(
      { error: "No tienes permiso para acceder a datos de esta empresa" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

/**
 * Middleware para extraer información de la sesión y poner a disposición en el request
 */
export async function withSession(req: NextRequest, res: NextResponse) {
  const token = await getToken({ req });

  // Añadir información de la sesión a headers personalizados
  if (token) {
    res.headers.set("x-usuario-id", token.id as string);
    res.headers.set("x-usuario-rol", token.role as string);
    res.headers.set("x-empresa-id", token.empresaId as string || "");
  }

  return res;
}

/**
 * Helper para verificar si un usuario es SuperAdmin
 */
export const esSuperAdmin = (rol: string | undefined): boolean => {
  return rol === "SUPERADMIN";
};

/**
 * Helper para verificar si un usuario es Administrador
 */
export const esAdministrador = (rol: string | undefined): boolean => {
  return rol === "ADMINISTRADOR";
};

/**
 * Helper para verificar si un usuario es Gerente
 */
export const esGerente = (rol: string | undefined): boolean => {
  return rol === "GERENTE";
};

/**
 * Helper para verificar si un usuario es Empleado
 */
export const esEmpleado = (rol: string | undefined): boolean => {
  return rol === "EMPLEADO";
};

/**
 * Manejo de errores para rutas API (Next.js 15 compatible)
 */
export async function withApiError(
  handler: () => Promise<Response>
): Promise<Response> {
  try {
    return await handler();
  } catch (error: any) {
    console.error("❌ Error en API:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Verifica autenticación en rutas API protegidas (Next.js 15 compatible)
 */
export async function withApiAuth(
  handler: (session: Session) => Promise<Response>
): Promise<Response> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  return handler(session);
}