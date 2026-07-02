// /src/app/api/usuarios/configuracion-completada/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const empresaId = session.user.empresaId;

    // Verificar que solo ADMINISTRADOR pueda marcar su configuración como completada
    if (session.user.role !== "ADMINISTRADOR") {
      return NextResponse.json(
        { error: "Solo administradores pueden completar la configuración inicial" },
        { status: 403 }
      );
    }

    // 🔴 CAMBIO: Obtener la configuración de la empresa para incluir tipoNegocio
    const configuracionEmpresa = await db.configuracionEmpresa.findUnique({
      where: { empresaId },
      select: {
        id: true,
        tipoNegocio: true,
      },
    });

    if (!configuracionEmpresa) {
      console.error(`❌ No se encontró configuración para empresa: ${empresaId}`);
      return NextResponse.json(
        { error: "Debe guardar la configuración de la empresa primero" },
        { status: 400 }
      );
    }

    // 🔴 CAMBIO: Actualizar el flag de configuración completada en la BD
    const usuarioActualizado = await db.usuario.update({
      where: { id: userId },
      data: { 
        configuracionCompletada: true 
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        configuracionCompletada: true,
        empresaId: true,
      },
    });

    // 🔴 NUEVO: Retornar también el tipoNegocio para actualizar la sesión
    return NextResponse.json({
      success: true,
      message: "Configuración marcada como completada exitosamente",
      usuario: {
        id: usuarioActualizado.id,
        configuracionCompletada: usuarioActualizado.configuracionCompletada,
        tipoNegocio: configuracionEmpresa.tipoNegocio, // ⭐ Incluir el tipo de negocio
      },
    });

  } catch (error) {
    console.error("❌ Error al actualizar configuración completada:", error);
    
    return NextResponse.json(
      { 
        error: "Error al actualizar usuario",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// GET - Verificar estado de configuración (útil para debugging)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const usuario = await db.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        configuracionCompletada: true,
        empresaId: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const configuracionEmpresa = await db.configuracionEmpresa.findUnique({
      where: { empresaId: usuario.empresaId },
      select: {
        id: true,
        tipoNegocio: true,
      },
    });

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        configuracionCompletada: usuario.configuracionCompletada,
      },
      configuracionEmpresa: configuracionEmpresa ? {
        existe: true,
        tipoNegocio: configuracionEmpresa.tipoNegocio,
      } : {
        existe: false,
      },
      necesitaConfiguracionInicial: !usuario.configuracionCompletada && usuario.rol === "ADMINISTRADOR",
    });

  } catch (error) {
    console.error("❌ Error al verificar estado de configuración:", error);
    
    return NextResponse.json(
      { 
        error: "Error al verificar estado",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}