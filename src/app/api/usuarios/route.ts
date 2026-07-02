import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions, hashPassword } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { validatePassword, getPasswordErrorMessage } from "@/lib/password-policy";
import { sanitizeInput } from "@/lib/sanitize";

// GET - Obtener todos los usuarios de la empresa actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Verificar si el usuario tiene permiso (solo ADMIN, SUPERADMIN o GERENTE)
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json(
        { mensaje: "No tiene permiso para ver la lista de usuarios" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Opciones de búsqueda y paginación
    const busqueda = searchParams.get("busqueda");
    const rol = searchParams.get("rol");
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const limite = parseInt(searchParams.get("limite") || "20");
    const omitir = (pagina - 1) * limite;

    // Construir la consulta
    const whereClause: any = { empresaId };

    if (busqueda) {
      whereClause.OR = [
        { nombre: { contains: busqueda } },
        { email: { contains: busqueda } },
      ];
    }

    if (rol) {
      whereClause.rol = rol;
    }

    // Para usuarios normales (no superadmin), no mostrar superadmins
    if (session.user.role !== "SUPERADMIN") {
      whereClause.rol = { not: "SUPERADMIN" };
    }

    // Contar usuarios para la paginación
    const totalUsuarios = await db.usuario.count({
      where: whereClause,
    });

    // Obtener usuarios con paginación
    const usuarios = await db.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        imagen: true,
        activo: true,
        esEmpleadoOperativo: true,
        porcentajeComision: true,
        createdAt: true,
      },
      orderBy: {
        nombre: "asc",
      },
      skip: omitir,
      take: limite,
    });

    // Ocultar el email placeholder de empleados operativos
    const usuariosPublicos = usuarios.map((u: typeof usuarios[number]) => ({
      ...u,
      email: u.esEmpleadoOperativo ? null : u.email,
    }));

    return NextResponse.json({
      datos: usuariosPublicos,
      meta: {
        total: totalUsuarios,
        pagina,
        limite,
        totalPaginas: Math.ceil(totalUsuarios / limite),
      },
    });

  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Verificar si el usuario tiene permiso
    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json(
        { mensaje: "No tiene permiso para crear usuarios" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nombre,
      email,
      telefono,
      contrasena,
      rol,
      imagen,
      esEmpleadoOperativo,
      porcentajeComision,
    } = body;

    // Validación básica — nombre siempre requerido
    if (!nombre) {
      return NextResponse.json(
        { mensaje: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FLUJO EMPLEADO OPERATIVO (sin acceso al sistema)
    // ──────────────────────────────────────────────────────────────────────────
    if (esEmpleadoOperativo) {
      // Los empleados operativos no pueden tener rol SUPERADMIN ni ADMINISTRADOR
      if (["SUPERADMIN", "ADMINISTRADOR"].includes(rol)) {
        return NextResponse.json(
          { mensaje: "Un empleado operativo no puede tener rol de Administrador o Superadmin" },
          { status: 400 }
        );
      }

      const configuracionEmpresa = await db.configuracionEmpresa.findUnique({ where: { empresaId } });
      const tieneConfiguracion = !!configuracionEmpresa;
      const nombreSanitizado = sanitizeInput(nombre);

      // Generar email placeholder único interno (no expuesto al usuario)
      const placeholderEmail = `emp-${Date.now()}-${crypto.randomUUID().substring(0,8)}@nologin.interno`;
      const placeholderPassword = crypto.randomUUID();
      const contrasenaHash = await hashPassword(placeholderPassword);

      const usuario = await db.usuario.create({
        data: {
          nombre: nombreSanitizado,
          email: placeholderEmail,
          telefono: telefono || null,
          contrasena: contrasenaHash,
          rol: rol || "EMPLEADO",
          imagen: imagen || null,
          empresaId,
          esEmpleadoOperativo: true,
          porcentajeComision: porcentajeComision ? parseFloat(porcentajeComision) : null,
          configuracionCompletada: tieneConfiguracion,
        },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          rol: true,
          imagen: true,
          empresaId: true,
          esEmpleadoOperativo: true,
          porcentajeComision: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        ...usuario,
        email: null, // No exponer el placeholder
        mensaje: "Empleado operativo creado. No tiene acceso al sistema.",
      }, { status: 201 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FLUJO USUARIO NORMAL (con acceso al sistema)
    // ──────────────────────────────────────────────────────────────────────────

    // Email y contraseña son requeridos para usuarios con acceso
    if (!email || !contrasena) {
      return NextResponse.json(
        { mensaje: "El email y la contraseña son requeridos para usuarios con acceso al sistema" },
        { status: 400 }
      );
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { mensaje: "El formato del email es inválido" },
        { status: 400 }
      );
    }

    // Validar contraseña con política de seguridad
    const passwordValidation = validatePassword(contrasena);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { mensaje: getPasswordErrorMessage(passwordValidation) },
        { status: 400 }
      );
    }

    // Los usuarios normales no pueden crear superadmins
    if (rol === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { mensaje: "No tiene permiso para crear usuarios Superadmin" },
        { status: 403 }
      );
    }

    // Verificar si ya existe un usuario con el mismo email
    const usuarioExistente = await db.usuario.findFirst({
      where: { email },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { mensaje: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    // Verificar si la empresa ya tiene configuración
    const configuracionEmpresa = await db.configuracionEmpresa.findUnique({
      where: { empresaId }
    });

    const tieneConfiguracion = !!configuracionEmpresa;
    const contrasenaEncriptada = await hashPassword(contrasena);
    const nombreSanitizado = sanitizeInput(nombre);

    const usuario = await db.usuario.create({
      data: {
        nombre: nombreSanitizado,
        email,
        telefono,
        contrasena: contrasenaEncriptada,
        rol: rol || "EMPLEADO",
        imagen,
        empresaId,
        esEmpleadoOperativo: false,
        porcentajeComision: porcentajeComision ? parseFloat(porcentajeComision) : null,
        configuracionCompletada: tieneConfiguracion,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        imagen: true,
        empresaId: true,
        esEmpleadoOperativo: true,
        porcentajeComision: true,
        createdAt: true,
        configuracionCompletada: true,
      },
    });

    return NextResponse.json({
      ...usuario,
      mensaje: tieneConfiguracion
        ? "Usuario creado exitosamente con configuración de empresa"
        : "Usuario creado. Requiere configuración inicial"
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { mensaje: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
