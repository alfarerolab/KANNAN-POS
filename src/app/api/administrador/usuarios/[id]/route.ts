import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import type { Rol } from "../../../../../lib/prisma-types";
import { esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener un usuario por ID (solo superadmin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession({});

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    if (!id) {
      return NextResponse.json(
        { message: "El ID del usuario es requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const usuario = await db.usuario.findUnique({
      where: {
        id,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            activa: true,
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar la contraseña de la respuesta
    const { contrasena, ...usuarioSinContrasena } = usuario;

    return NextResponse.json(usuarioSinContrasena);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { message: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un usuario (solo superadmin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession({});

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    if (!id) {
      return NextResponse.json(
        { message: "El ID del usuario es requerido" },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const usuario = await db.usuario.findUnique({
      where: {
        id,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir eliminar el último administrador de una empresa
    if (usuario.rol === "ADMINISTRADOR" || usuario.rol === "SUPERADMIN") {
      const adminCount = await db.usuario.count({
        where: {
          empresaId: usuario.empresaId,
          rol: {
            in: ["ADMINISTRADOR", "SUPERADMIN"],
          },
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            message:
              "No se puede eliminar el único administrador de la empresa",
          },
          { status: 400 }
        );
      }
    }

    // Eliminar el usuario
    await db.usuario.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      { message: "Usuario eliminado correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { message: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession({});

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    if (!id) {
      return NextResponse.json(
        { message: "El ID del usuario es requerido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, email, telefono, contrasena, rol, activo } = body;

    // Verificar que el usuario existe
    const usuarioExistente = await db.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Si solo se está actualizando el estado activo
    if (activo !== undefined && Object.keys(body).length === 1) {
      const usuarioActualizado = await db.usuario.update({
        where: { id },
        data: { activo },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              activa: true,
            },
          },
        },
      });

      // Eliminar la contraseña de la respuesta
      const { contrasena: _, ...usuarioSinContrasena } = usuarioActualizado;

      return NextResponse.json(usuarioSinContrasena);
    }

    // Para actualizaciones completas del perfil, validar campos requeridos
    if (!nombre || !email || !rol) {
      return NextResponse.json(
        { message: "Nombre, email y rol son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso por otro usuario
    if (email !== usuarioExistente.email) {
      const emailEnUso = await db.usuario.findFirst({
        where: {
          email,
          id: { not: id },
        },
      });

      if (emailEnUso) {
        return NextResponse.json(
          { message: "El email ya está en uso por otro usuario" },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const datosActualizacion: {
      nombre: string;
      email: string;
      rol: Rol;
      telefono: string | null;
      activo?: boolean;
      contrasena?: string;
    } = {
      nombre,
      email,
      rol: rol as Rol,
      telefono: telefono || null,
    };

    // Incluir activo si se proporciona
    if (activo !== undefined) {
      datosActualizacion.activo = activo;
    }

    // Solo actualizar la contraseña si se proporciona una nueva
    if (contrasena) {
      const bcrypt = await import('bcryptjs');
      datosActualizacion.contrasena = await bcrypt.default.hash(contrasena, 12);
    }

    // Actualizar el usuario
    const usuarioActualizado = await db.usuario.update({
      where: { id },
      data: datosActualizacion,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            activa: true,
          },
        },
      },
    });

    // Eliminar la contraseña de la respuesta
    const { contrasena: _, ...usuarioSinContrasena } = usuarioActualizado;

    return NextResponse.json(usuarioSinContrasena);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { message: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}