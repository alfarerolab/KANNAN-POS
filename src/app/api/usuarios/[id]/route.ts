import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions, hashPassword } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { validatePassword, getPasswordErrorMessage } from "@/lib/password-policy";
import { sanitizeInput } from "@/lib/sanitize";

// GET - Obtener detalles de un usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: usuarioId } = await params; // ⭐ CAMBIO: await params
    const empresaId = session.user.empresaId; // ⭐ CAMBIO: empresaId en lugar de companyId

    // Verificar si el usuario tiene permiso (solo ADMIN, SUPERADMIN, GERENTE o el propio usuario)
    const esSuPerfil = session.user.id === usuarioId;
    const tienePermiso = ["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role);

    if (!esSuPerfil && !tienePermiso) {
      return NextResponse.json(
        { mensaje: "No tiene permiso para ver este usuario" },
        { status: 403 }
      );
    }

    // Construir la consulta
    const whereClause: any = { id: usuarioId };

    // Si no es superadmin y no es su propio perfil, solo puede ver usuarios de su empresa
    if (session.user.role !== "SUPERADMIN" && !esSuPerfil) {
      whereClause.empresaId = empresaId;
    }

    const usuario = await db.usuario.findFirst({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        imagen: true,
        empresaId: true,
        createdAt: true,
        // No incluir contraseña por seguridad
        empresa: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { mensaje: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Si es el mismo usuario, podemos obtener estadísticas de ventas
    if (esSuPerfil || tienePermiso) {
      const estadisticasVentas = await db.venta.findMany({
        where: {
          usuarioId,
          empresaId,
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5, // Últimas 5 ventas
      });

      // Contar total de ventas
      const totalVentas = await db.venta.count({
        where: {
          usuarioId,
          empresaId,
        },
      });

      // Sumar monto total de ventas
      const montoTotalVentas = await db.venta.aggregate({
        where: {
          usuarioId,
          empresaId,
        },
        _sum: {
          total: true,
        },
      });

      return NextResponse.json({
        ...usuario,
        estadisticas: {
          ultimasVentas: estadisticasVentas,
          totalVentas,
          montoTotal: montoTotalVentas._sum.total || 0,
        },
      });
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Error al obtener detalles del usuario:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener detalles del usuario" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un usuario existente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: usuarioId } = await params; // ⭐ CAMBIO: await params
    const empresaId = session.user.empresaId; // ⭐ CAMBIO: empresaId en lugar de companyId
    const body = await request.json();
    const {
      nombre,
      email,
      telefono,
      contrasena,
      rol,
      imagen
    } = body;

    // Verificar si el usuario tiene permiso
    const esSuPerfil = session.user.id === usuarioId;
    const esAdmin = ["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role);
    const esGerente = session.user.role === "GERENTE";

    // Si no es su perfil y no es admin ni gerente, no tiene permiso
    if (!esSuPerfil && !esAdmin && !esGerente) {
      return NextResponse.json(
        { mensaje: "No tiene permiso para actualizar este usuario" },
        { status: 403 }
      );
    }

    // Si es gerente, solo puede actualizar empleados
    if (esGerente && !esSuPerfil) {
      const usuarioAActualizar = await db.usuario.findUnique({
        where: { id: usuarioId },
        select: { rol: true },
      });

      if (usuarioAActualizar && usuarioAActualizar.rol !== "EMPLEADO") {
        return NextResponse.json(
          { mensaje: "Los gerentes solo pueden actualizar empleados" },
          { status: 403 }
        );
      }
    }

    // Verificar que el usuario exista
    const usuarioExistente = await db.usuario.findFirst({
      where: {
        id: usuarioId,
        ...(session.user.role !== "SUPERADMIN" ? { empresaId } : {}),
      },
    });

    if (!usuarioExistente) {
      return NextResponse.json(
        { mensaje: "Usuario no encontrado o no tiene permiso para actualizarlo" },
        { status: 404 }
      );
    }

    // Solo admins pueden cambiar roles, y solo superadmins pueden asignar rol de superadmin
    if (rol) {
      if (!esAdmin) {
        return NextResponse.json(
          { mensaje: "Solo administradores pueden cambiar roles" },
          { status: 403 }
        );
      }

      if (rol === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
        return NextResponse.json(
          { mensaje: "Solo superadmins pueden asignar rol de superadmin" },
          { status: 403 }
        );
      }
    }

    // Validar email si se proporciona
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { mensaje: "El formato del email es inválido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe otro usuario con el mismo email (si se cambia)
    if (email && email !== usuarioExistente.email) {
      const existeConEmail = await db.usuario.findFirst({
        where: {
          email,
          id: { not: usuarioId },
        },
      });

      if (existeConEmail) {
        return NextResponse.json(
          { mensaje: "Ya existe otro usuario con ese email" },
          { status: 400 }
        );
      }
    }

    // Validar contraseña si se proporciona
    if (contrasena) {
      const passwordValidation = validatePassword(contrasena);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { mensaje: getPasswordErrorMessage(passwordValidation) },
          { status: 400 }
        );
      }
    }

    // Construir objeto de datos para actualizar
    const datosActualizacion: any = {};

    if (nombre !== undefined) datosActualizacion.nombre = sanitizeInput(nombre);
    if (email !== undefined) datosActualizacion.email = email;
    if (telefono !== undefined) datosActualizacion.telefono = sanitizeInput(telefono);
    if (contrasena) datosActualizacion.contrasena = await hashPassword(contrasena);
    if (rol !== undefined && esAdmin) datosActualizacion.rol = rol;
    if (imagen !== undefined) datosActualizacion.imagen = imagen;

    // Actualizar el usuario
    const usuarioActualizado = await db.usuario.update({
      where: {
        id: usuarioId,
      },
      data: datosActualizacion,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        imagen: true,
        empresaId: true,
        createdAt: true,
        // No incluir contraseña en la respuesta
      },
    });

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { mensaje: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: usuarioId } = await params; // ⭐ CAMBIO: await params
    const empresaId = session.user.empresaId; // ⭐ CAMBIO: empresaId en lugar de companyId

    // Solo administradores pueden eliminar usuarios
    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { mensaje: "No tiene permiso para eliminar usuarios" },
        { status: 403 }
      );
    }

    // No se puede eliminar a uno mismo
    if (session.user.id === usuarioId) {
      return NextResponse.json(
        { mensaje: "No puede eliminarse a sí mismo" },
        { status: 400 }
      );
    }

    // Verificar que el usuario exista y pertenezca a la empresa (excepto superadmins)
    const usuario = await db.usuario.findFirst({
      where: {
        id: usuarioId,
        ...(session.user.role !== "SUPERADMIN" ? { empresaId } : {}),
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { mensaje: "Usuario no encontrado o no tiene permiso para eliminarlo" },
        { status: 404 }
      );
    }

    // Solo superadmins pueden eliminar a otros superadmins
    if (usuario.rol === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { mensaje: "No tiene permiso para eliminar usuarios superadmin" },
        { status: 403 }
      );
    }

    // Verificar si hay ventas asociadas a este usuario
    const ventasAsociadas = await db.venta.count({
      where: {
        usuarioId,
      },
    });

    if (ventasAsociadas > 0) {
      return NextResponse.json(
        {
          mensaje: "No se puede eliminar el usuario porque tiene ventas asociadas",
          ventasAsociadas
        },
        { status: 400 }
      );
    }

    // Eliminar el usuario
    await db.usuario.delete({
      where: {
        id: usuarioId,
      },
    });

    return NextResponse.json({
      mensaje: "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}