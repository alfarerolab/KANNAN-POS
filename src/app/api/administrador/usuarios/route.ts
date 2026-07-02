import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { esSuperAdmin, hashPassword, authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todos los usuarios (solo superadmin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    const { searchParams } = new URL(request.url);

    // Opciones de filtrado
    const search = searchParams.get("search");
    const empresaId = searchParams.get("empresaId");

    // Opciones de paginación
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Construir la consulta
    const whereClause: {
      OR?: Array<{ nombre?: { contains: string } } | { email?: { contains: string } }>;
      empresaId?: string;
    } = {};

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (empresaId) {
      whereClause.empresaId = empresaId;
    }

    // Contar usuarios para la paginación
    const totalUsers = await db.usuario.count({
      where: whereClause,
    });

    // Obtener usuarios
    const users = await db.usuario.findMany({
      where: whereClause,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            activa: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Eliminar contraseñas de la respuesta
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const safeUsers = users.map((user) => {
      const { contrasena, ...safeUser } = user;
      return safeUser;
    });

    return NextResponse.json({
      data: safeUsers,
      meta: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { message: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo usuario (solo superadmin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    const body = await request.json();
    const { nombre, email, contrasena, rol, telefono, empresaId } = body;

    // Validación básica
    if (!nombre || !email || !contrasena || !rol || !empresaId) {
      return NextResponse.json(
        { message: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un usuario con ese email
    const existingUser = await db.usuario.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    // Verificar si la empresa existe
    const empresa = await db.empresa.findUnique({
      where: {
        id: empresaId,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: "La empresa no existe" },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const contrasenaHasheada = await hashPassword(contrasena);

    // Crear el usuario
    const usuario = await db.usuario.create({
      data: {
        nombre,
        email,
        contrasena: contrasenaHasheada,
        rol,
        telefono,
        empresaId,
      },
    });

    // Eliminar la contraseña de la respuesta
    const { contrasena: _, ...usuarioSinContrasena } = usuario;

    return NextResponse.json(usuarioSinContrasena, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { message: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un usuario (solo superadmin)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    const body = await request.json();
    const { id, nombre, email, contrasena, rol, telefono, empresaId } = body;

    if (!id) {
      return NextResponse.json(
        { message: "El ID del usuario es requerido" },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe
    const existingUser = await db.usuario.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 404 }
      );
    }

    // Construir objeto de actualización
    const updateData: {
      nombre?: string;
      email?: string;
      contrasena?: string;
      rol?: string;
      telefono?: string;
      empresaId?: string;
    } = {};

    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email;
    if (contrasena !== undefined) updateData.contrasena = await hashPassword(contrasena);
    if (rol !== undefined) updateData.rol = rol;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (empresaId !== undefined) {
      // Verificar si la empresa existe
      const empresa = await db.empresa.findUnique({
        where: {
          id: empresaId,
        },
      });

      if (!empresa) {
        return NextResponse.json(
          { message: "La empresa no existe" },
          { status: 400 }
        );
      }

      updateData.empresaId = empresaId;
    }

    // Actualizar el usuario
    const usuario = await db.usuario.update({
      where: {
        id,
      },
      data: updateData,
    });

    // Eliminar la contraseña de la respuesta
    const { contrasena: _, ...usuarioSinContrasena } = usuario;

    return NextResponse.json(usuarioSinContrasena, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { message: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}
