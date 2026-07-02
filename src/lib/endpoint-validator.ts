import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { obtenerConfiguracionNegocio, validarFuncionalidad } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "./prisma-types";
// Mapeo de rutas a funcionalidades requeridas
const VALIDACIONES_ENDPOINT = {
  "/api/servicios": "servicios",
  "/api/citas": "citas",
  "/api/mascotas": "mascotas",
  "/api/productos/[id]/variantes": "variantes",
  "/api/productos/[id]/lotes": "lotes",
  "/api/productos/[id]/vencimientos": "vencimientos",
  "/api/recetas": "recetas"
} as const;

// Tipo para las funcionalidades disponibles
type FuncionalidadRequerida = typeof VALIDACIONES_ENDPOINT[keyof typeof VALIDACIONES_ENDPOINT];

export class EndpointValidator {
  /**
   * Valida si un usuario tiene acceso a un endpoint específico
   */
  static async validarAcceso(
    request: NextRequest,
    endpoint: string
  ): Promise<{ permitido: boolean; razon?: string }> {
    try {
      // Obtener token de usuario
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      });

      if (!token) {
        return { permitido: false, razon: "Usuario no autenticado" };
      }

      // Los superadmin tienen acceso a todo
      if (token.role === "SUPERADMIN") {
        return { permitido: true };
      }

      // Verificar si el endpoint requiere validación
      const funcionalidadRequerida = this.obtenerFuncionalidadRequerida(endpoint);

      if (!funcionalidadRequerida) {
        return { permitido: true }; // Endpoint sin restricciones
      }

      // Obtener configuración de la empresa
      const configuracionResponse = await fetch(new URL("/api/configuracion", request.url), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-empresa-id": token.empresaId as string
        }
      });

      if (!configuracionResponse.ok) {
        return { permitido: false, razon: "No se pudo obtener configuración de empresa" };
      }

      const configuracion = await configuracionResponse.json();
      const tipoNegocio = configuracion.tipoNegocio || configuracion.empresa?.tipoNegocio;

      if (!tipoNegocio) {
        return { permitido: false, razon: "Tipo de negocio no configurado" };
      }

      // Validar funcionalidad según tipo de negocio
      const funcionalidadHabilitada = validarFuncionalidad(
        tipoNegocio as TipoNegocio,
        funcionalidadRequerida
      );

      if (!funcionalidadHabilitada) {
        const configNegocio = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);
        return {
          permitido: false,
          // @ts-expect-error Mismatch de tipos Prisma u obj temporal
          razon: `La funcionalidad '${funcionalidadRequerida}' no está disponible para ${configNegocio.nombre}`
        };
      }

      return { permitido: true };

    } catch (error) {
      console.error("Error validando acceso a endpoint:", error);
      return { permitido: false, razon: "Error interno de validación" };
    }
  }

  /**
   * Obtiene la funcionalidad requerida para un endpoint
   */
  private static obtenerFuncionalidadRequerida(endpoint: string): FuncionalidadRequerida | null {
    // Normalizar endpoint (remover parámetros dinámicos)
    const endpointNormalizado = endpoint.replace(/\/\d+/g, "/[id]");

    return VALIDACIONES_ENDPOINT[endpointNormalizado as keyof typeof VALIDACIONES_ENDPOINT] || null;
  }

  /**
   * Middleware para validar acceso a endpoints
   */
  static crearMiddleware() {
    return async (request: NextRequest) => {
      const pathname = request.nextUrl.pathname;

      // Solo validar rutas de API específicas
      if (!pathname.startsWith("/api/") || pathname.startsWith("/api/auth/")) {
        return NextResponse.next();
      }

      const { permitido, razon } = await this.validarAcceso(request, pathname);

      if (!permitido) {
        return NextResponse.json(
          {
            error: "Acceso denegado",
            message: razon || "No tienes permisos para acceder a esta funcionalidad",
            code: "FUNCIONALIDAD_NO_DISPONIBLE"
          },
          { status: 403 }
        );
      }

      return NextResponse.next();
    };
  }
}

/**
 * Función para validar acceso desde el cliente
 */
export async function validarAccesoCliente(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/validar-acceso?endpoint=${encodeURIComponent(endpoint)}`);
    const data = await response.json();
    return data.permitido || false;
  } catch (error) {
    console.error("Error validando acceso:", error);
    return false;
  }
}