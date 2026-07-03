import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/auth";
import { checkRateLimit, getClientIp, REGISTRO_RATE_LIMIT } from "@/lib/rate-limit";
import { validatePassword, getPasswordErrorMessage } from "@/lib/password-policy";
import { sanitizeInput } from "@/lib/sanitize";

// POST - Registrar una nueva empresa y usuario administrador
export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ────────────────────────────────────────────
    const clientIp = getClientIp(request);
    const rlCheck = checkRateLimit(REGISTRO_RATE_LIMIT, clientIp);
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { mensaje: "Demasiados intentos de registro. Intenta más tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      nombreEmpresa,
      emailEmpresa,
      telefonoEmpresa,
      direccionEmpresa,
      nombreUsuario,
      emailUsuario,
      telefonoUsuario,
      contrasena,
    } = body;

    // Validaciones básicas
    if (!nombreEmpresa || !emailEmpresa || !nombreUsuario || !emailUsuario || !contrasena) {
      return NextResponse.json(
        { mensaje: "Todos los campos obligatorios deben completarse" },
        { status: 400 }
      );
    }

    // Validar emails
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEmpresa) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailUsuario)) {
      return NextResponse.json(
        { mensaje: "Los emails proporcionados no son válidos" },
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

    // Sanitizar inputs de texto
    const nombreEmpresaSanitizado = sanitizeInput(nombreEmpresa);
    const nombreUsuarioSanitizado = sanitizeInput(nombreUsuario);

    // Verificar si ya existe una empresa con ese email
    const empresaExistente = await db.empresa.findUnique({
      where: {
        email: emailEmpresa,
      },
    });

    if (empresaExistente) {
      return NextResponse.json(
        { mensaje: "Ya existe una empresa con ese email" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un usuario con ese email
    const usuarioExistente = await db.usuario.findUnique({
      where: {
        email: emailUsuario,
      },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { mensaje: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    // Encriptar contraseña (12 rounds centralizado)
    const contrasenaEncriptada = await hashPassword(contrasena);

    // Crear empresa y usuario administrador en una transacción
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const resultado = await db.$transaction(async (prisma) => {
      // 1. Crear la empresa
      const nuevaEmpresa = await prisma.empresa.create({
        data: {
          nombre: nombreEmpresaSanitizado,
          email: emailEmpresa,
          telefono: sanitizeInput(telefonoEmpresa),
          direccion: sanitizeInput(direccionEmpresa),
        },
      });

      // 2. Crear usuario administrador asociado a la empresa
      const nuevoUsuario = await prisma.usuario.create({
        data: {
          nombre: nombreUsuarioSanitizado,
          email: emailUsuario,
          telefono: sanitizeInput(telefonoUsuario),
          contrasena: contrasenaEncriptada,
          rol: "ADMINISTRADOR", // Rol de administrador
          empresaId: nuevaEmpresa.id,
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          rol: true,
          empresaId: true,
          // No incluir contraseña en la respuesta
        },
      });

      return {
        empresa: nuevaEmpresa,
        usuario: nuevoUsuario,
      };
    });

    return NextResponse.json({
      mensaje: "Registro completado exitosamente",
      datos: resultado,
    }, { status: 201 });
  } catch (error) {
    console.error("Error en el registro:", error);
    return NextResponse.json(
      { mensaje: "Error al procesar el registro" },
      { status: 500 }
    );
  }
}
