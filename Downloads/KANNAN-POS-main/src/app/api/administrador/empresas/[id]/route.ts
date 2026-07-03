import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions, esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { obtenerConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../../../../lib/prisma-types";
// GET - Obtener una empresa específica por ID (solo superadmin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
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

    const { id } = await params; // ⭐ CAMBIO: await params
    if (!id) {
      return NextResponse.json(
        { message: "El ID de la empresa es requerido" },
        { status: 400 }
      );
    }

    // Buscar la empresa específica
    const empresa = await db.empresa.findUnique({
      where: {
        id,
      },
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
    });

    if (!empresa) {
      return NextResponse.json(
        { message: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Formatear la empresa para asegurar el formato correcto
    const empresaFormateada = {
      id: empresa.id,
      nombre: empresa.nombre,
      email: empresa.email,
      telefono: empresa.telefono,
      activa: empresa.activa,
      fechaVencimiento: empresa.fechaVencimiento?.toISOString() || null,
      createdAt: empresa.createdAt.toISOString(),
      direccion: empresa.direccion,
      logo: empresa.logo,
      tipoNegocio: empresa.tipoNegocio,
      notaDesactivacion: empresa.notaDesactivacion,
      configuracion: empresa.configuracion,
      _count: empresa._count,
    };

    return NextResponse.json(empresaFormateada);
  } catch (error) {
    console.error("API: Error al obtener empresa:", error);
    return NextResponse.json(
      { 
        message: "Error al obtener empresa", 
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar una empresa (solo superadmin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
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

    const { id } = await params; // ⭐ CAMBIO: await params
    const body = await request.json();
    const { nombre, email, telefono, direccion, logo, activa, fechaVencimiento, notaDesactivacion, tipoNegocio } = body;

    if (!id) {
      return NextResponse.json(
        { message: "El ID de la empresa es requerido" },
        { status: 400 }
      );
    }

    // Verificar si la empresa existe
    const empresa = await db.empresa.findUnique({
      where: {
        id,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const updateData: {
      nombre?: string;
      email?: string;
      telefono?: string;
      direccion?: string;
      logo?: string;
      activa?: boolean;
      fechaVencimiento?: Date | null;
      notaDesactivacion?: string;
      tipoNegocio?: TipoNegocio;
    } = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (logo !== undefined) updateData.logo = logo;
    if (activa !== undefined) updateData.activa = activa;
    if (fechaVencimiento !== undefined) {
      updateData.fechaVencimiento = fechaVencimiento ? new Date(fechaVencimiento) : null;
    }
    if (notaDesactivacion !== undefined) updateData.notaDesactivacion = notaDesactivacion;
    if (tipoNegocio !== undefined) updateData.tipoNegocio = tipoNegocio;

    // Si se está cambiando el tipo de negocio, actualizar la configuración
    if (tipoNegocio && tipoNegocio !== empresa.tipoNegocio) {
      // Obtener la nueva configuración según el tipo de negocio
      const nuevaConfig = obtenerConfiguracionNegocio(tipoNegocio as TipoNegocio);

      // Actualizar en una transacción
      const empresaActualizada = await db.$transaction(async (tx: any) => {
        // Actualizar la empresa
        const empresaActualizada = await tx.empresa.update({
          where: { id },
          data: updateData,
        });

        // Buscar si ya existe configuración
        const configExistente = await tx.configuracionEmpresa.findUnique({
          where: { empresaId: id }
        });

        // Datos de configuración según el nuevo tipo de negocio
        if (!nuevaConfig) {
          throw new Error("❌ No se encontró la nueva configuración del negocio");
        }

      const configData = {
        tipoNegocio: tipoNegocio as TipoNegocio,
        habilitarServicios: nuevaConfig.funcionalidades.servicios,
        habilitarCitas: nuevaConfig.funcionalidades.citas,
        habilitarVariantes: nuevaConfig.funcionalidades.variantes,
        habilitarRecetas: nuevaConfig.funcionalidades.recetas,
        habilitarLotes: nuevaConfig.funcionalidades.lotes,
        habilitarVencimientos: nuevaConfig.funcionalidades.vencimientos,
        configuracionPos: JSON.stringify({}),
        configuracionInventario: JSON.stringify({}),
        configuracionFactura: JSON.stringify({}),
      };

        if (configExistente) {
          // Actualizar configuración existente
          await tx.configuracionEmpresa.update({
            where: { empresaId: id },
            data: configData
          });
        } else {
          // Crear nueva configuración
          await tx.configuracionEmpresa.create({
            data: {
              empresaId: id,
              ...configData
            }
          });
        }

        return empresaActualizada;
      });

      return NextResponse.json({
        ...empresaActualizada,
        configuracionActualizada: true
      });
    }

    // Actualización normal sin cambio de tipo de negocio
    const empresaActualizada = await db.empresa.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(empresaActualizada);
  } catch (error) {
    console.error("Error al actualizar empresa:", error);
    return NextResponse.json(
      { message: "Error al actualizar empresa" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una empresa (solo superadmin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
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

    const { id } = await params; // ⭐ CAMBIO: await params

    if (!id) {
      return NextResponse.json(
        { message: "El ID de la empresa es requerido" },
        { status: 400 }
      );
    }

    // Verificar si la empresa existe
    const empresa = await db.empresa.findUnique({
      where: {
        id,
      },
      include: {
        usuarios: true,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si hay un superadmin entre los usuarios
    const haySuperAdmin = empresa.usuarios.some(
      (usuario: any) => usuario.rol === "SUPERADMIN"
    );

    if (haySuperAdmin) {
      return NextResponse.json(
        {
          message:
            "No se puede eliminar una empresa que tenga un superadministrador",
        },
        { status: 400 }
      );
    }

    // Eliminar la empresa (esto también eliminará usuarios, productos, etc. por cascada)
    await db.empresa.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(
      { message: "Empresa eliminada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar empresa:", error);
    return NextResponse.json(
      { message: "Error al eliminar empresa" },
      { status: 500 }
    );
  }
}