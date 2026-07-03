import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todas las empresas (solo superadmin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { message: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Opciones de filtrado
    const search = searchParams.get("search");
    const estado = searchParams.get("estado"); // Filtro para activas/inactivas

    // Opciones de paginación
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Construir la consulta
    const whereClause: {
      OR?: Array<{ nombre?: { contains: string } } | { email?: { contains: string } }>;
      activa?: boolean;
    } = {};

    if (search) {
      whereClause.OR = [
        { nombre: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Filtrar por estado de activación
    if (estado === "activas") {
      whereClause.activa = true;
    } else if (estado === "inactivas") {
      whereClause.activa = false;
    }

    // Contar empresas para la paginación
    const totalEmpresas = await db.empresa.count({
      where: whereClause,
    });

    // Obtener empresas con estadísticas
    const empresa = await db.empresa.findMany({
      where: whereClause,
      include: {
        configuracion: true,
        _count: {
          select: {
            usuarios: true,
            productos: true,
            ventas: true,
            clientes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      datos: empresa,
      meta: {
        total: totalEmpresas,
        page,
        limit,
        totalPages: Math.ceil(totalEmpresas / limit),
      },
    });
  } catch (error) {
    console.error("Error al obtener empresas:", error);
    return NextResponse.json(
      { message: "Error al obtener empresas" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva empresa (solo superadmin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nombre,
      email,
      telefono,
      direccion,
      logo,
      tipoNegocio,
      fechaVencimiento,
      nombreAdmin,
      emailAdmin,
      contrasenaAdmin,
      telefonoAdmin,
      planId,
      planMeses
    } = body;

    // Validación básica
    if (!nombre || !email || !tipoNegocio) {
      return NextResponse.json(
        { message: "El nombre, email y tipo de negocio de la empresa son requeridos" },
        { status: 400 }
      );
    }

    // Validación de datos del administrador
    if (!nombreAdmin || !emailAdmin || !contrasenaAdmin) {
      return NextResponse.json(
        { message: "Los datos del administrador son requeridos" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una empresa con ese email
    const empresaExistente = await db.empresa.findUnique({
      where: {
        email,
      },
    });

    if (empresaExistente) {
      return NextResponse.json(
        { message: "Ya existe una empresa con ese email" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un usuario con el email del administrador
    const adminExistente = await db.usuario.findUnique({
      where: {
        email: emailAdmin,
      },
    });

    if (adminExistente) {
      return NextResponse.json(
        { message: "Ya existe un usuario con el email del administrador" },
        { status: 400 }
      );
    }

    // Verificar si el plan existe (si se proporcionó)
    let planInfo = null;
    if (planId) {
      planInfo = await db.plan.findUnique({ where: { id: planId } });
      if (!planInfo) {
        return NextResponse.json(
          { message: "El plan seleccionado no existe" },
          { status: 400 }
        );
      }
    }

    // Hashear la contraseña del administrador
    const hashedPassword = await bcrypt.hash(contrasenaAdmin, 12);

    // Crear la empresa y el administrador en una transacción
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const resultado = await db.$transaction(async (tx) => {
      // Crear la empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre,
          email,
          telefono,
          direccion,
          logo,
          tipoNegocio: tipoNegocio as any, // Cast porque TypeScript no reconoce el nuevo enum
          activa: true,
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        },
      });

      // Crear categoría predeterminada
      await tx.categoria.create({
        data: {
          nombre: "General",
          descripcion: "Categoría general para productos",
          empresaId: empresa.id,
        },
      });

      // Crear el usuario administrador
      const admin = await tx.usuario.create({
        data: {
          nombre: nombreAdmin,
          email: emailAdmin,
          telefono: telefonoAdmin,
          contrasena: hashedPassword,
          rol: "ADMINISTRADOR",
          empresaId: empresa.id,
          activo: true,
        },
      });


      // Crear suscripción si hay plan
      if (planInfo && planId) {
        const fechaInicio = new Date();
        const fechaFinObj = fechaVencimiento ? new Date(fechaVencimiento) : new Date();
        if (!fechaVencimiento && planMeses) {
          fechaFinObj.setMonth(fechaFinObj.getMonth() + Number(planMeses));
        }
        
        await tx.suscripcion.create({
          data: {
            empresaId: empresa.id,
            planId: planId,
            fechaInicio,
            fechaFin: fechaFinObj,
            estado: "ACTIVA",
            precioTotal: planInfo.precio,
            descuentoAplicado: planInfo.descuento || 0,
            metodoPago: "SISTEMA",
          }
        });
      }

      return { empresa, admin };
    });

    return NextResponse.json({
      message: "Empresa y administrador creados exitosamente",
      empresa: resultado.empresa,
      administrador: {
        id: resultado.admin.id,
        nombre: resultado.admin.nombre,
        email: resultado.admin.email,
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Error al crear empresa:", error);
    return NextResponse.json(
      { message: "Error al crear empresa" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar estado de una empresa (activar/desactivar)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, activa, fechaVencimiento, notaDesactivacion } = body;

    if (!id) {
      return NextResponse.json(
        { message: "El ID de la empresa es requerido" },
        { status: 400 }
      );
    }

    // Verificar si la empresa existe
    const empresa = await db.empresa.findUnique({
      where: { id },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: "La empresa no existe" },
        { status: 404 }
      );
    }

    // Actualizar estado de la empresa
    const updatedEmpresa = await db.empresa.update({
      where: { id },
      data: {
        activa: activa !== undefined ? activa : empresa.activa,
        fechaVencimiento: fechaVencimiento !== undefined ? new Date(fechaVencimiento) : empresa.fechaVencimiento,
        notaDesactivacion: notaDesactivacion !== undefined ? notaDesactivacion : empresa.notaDesactivacion,
      },
    });

    return NextResponse.json(updatedEmpresa, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar empresa:", error);
    return NextResponse.json(
      { message: "Error al actualizar estado de la empresa" },
      { status: 500 }
    );
  }
}
