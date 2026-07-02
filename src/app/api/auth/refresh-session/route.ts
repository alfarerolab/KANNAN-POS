// /src/app/api/auth/refresh-session/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";


export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener datos actualizados del usuario desde la BD
    const usuarioActualizado = await db.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        empresa: {
          include: {
            configuracion: true,
          }
        }
      }
    });

    if (!usuarioActualizado) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos actualizados para la sesión
    const datosActualizados = {
      configuracionCompletada: usuarioActualizado.configuracionCompletada || false,
      tipoNegocio: usuarioActualizado.empresa?.configuracion?.tipoNegocio || 
                   usuarioActualizado.empresa?.tipoNegocio || 
                   null,
    };

    return NextResponse.json({
      success: true,
      message: "Sesión refrescada exitosamente",
      datos: datosActualizados,
      // Instrucción para el cliente: debe llamar a update() de useSession
      instruccion: "Llama a updateSession() en el cliente para aplicar estos cambios"
    });

  } catch (error) {
    console.error("❌ Error al refrescar sesión:", error);
    
    return NextResponse.json(
      { 
        error: "Error al refrescar sesión",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// GET - Verificar estado actual de la sesión
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener datos actuales de la BD
    const usuarioDB = await db.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        configuracionCompletada: true,
        empresaId: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            configuracion: {
              select: {
                id: true,
                tipoNegocio: true,
              }
            }
          }
        }
      },
    });

    if (!usuarioDB) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Comparar sesión actual con datos de BD
    const sesionActual = {
      configuracionCompletada: session.user.configuracionCompletada,
      tipoNegocio: session.user.tipoNegocio,
    };

    const datosEnBD = {
      configuracionCompletada: usuarioDB.configuracionCompletada,
      tipoNegocio: usuarioDB.empresa?.configuracion?.tipoNegocio,
    };

    const necesitaActualizacion = 
      sesionActual.configuracionCompletada !== datosEnBD.configuracionCompletada ||
      sesionActual.tipoNegocio !== datosEnBD.tipoNegocio;

    return NextResponse.json({
      sesionActual,
      datosEnBD,
      necesitaActualizacion,
      mensaje: necesitaActualizacion 
        ? "La sesión está desincronizada con la BD. Llama a POST /api/auth/refresh-session"
        : "La sesión está sincronizada con la BD"
    });

  } catch (error) {
    console.error("❌ Error al verificar sesión:", error);
    
    return NextResponse.json(
      { 
        error: "Error al verificar sesión",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
