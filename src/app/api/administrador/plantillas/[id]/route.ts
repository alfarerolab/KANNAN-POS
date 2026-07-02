import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions, esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener plantilla específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const { id } = await params; 

    const plantilla = await db.plantillaConfiguracion.findUnique({
      where: { id },
      include: {
        aplicaciones: {
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
          },
          orderBy: { fechaAplicacion: "desc" },
          take: 10,
        },
        _count: {
          select: {
            aplicaciones: true,
          },
        },
      },
    });

    if (!plantilla) {
      return NextResponse.json(
        { message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(plantilla);
  } catch (error) {
    console.error("Error al obtener plantilla:", error);
    return NextResponse.json(
      { message: "Error al obtener plantilla" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar plantilla
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ⭐ CAMBIO: params es Promise
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nombre, descripcion, configuracion, activa, esDefault } = body;

    const { id } = await params; // ⭐ CAMBIO: await params

    const plantilla = await db.plantillaConfiguracion.findUnique({
      where: { id },
    });

    if (!plantilla) {
      return NextResponse.json(
        { message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    // Si se está marcando como default, desactivar otras por defecto del mismo tipo
    if (esDefault && !plantilla.esDefault) {
      await db.plantillaConfiguracion.updateMany({
        where: {
          tipoNegocio: plantilla.tipoNegocio,
          esDefault: true,
          id: { not: id },
        },
        data: {
          esDefault: false,
        },
      });
    }

    const plantillaActualizada = await db.plantillaConfiguracion.update({
      where: { id },
      data: {
        nombre: nombre ?? plantilla.nombre,
        descripcion: descripcion ?? plantilla.descripcion,
        configuracion: configuracion ?? plantilla.configuracion,
        activa: activa ?? plantilla.activa,
        esDefault: esDefault ?? plantilla.esDefault,
      },
    });

    return NextResponse.json(plantillaActualizada);
  } catch (error) {
    console.error("Error al actualizar plantilla:", error);
    return NextResponse.json(
      { message: "Error al actualizar plantilla" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plantilla
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    const plantilla = await db.plantillaConfiguracion.findUnique({
      where: { id },
    });

    if (!plantilla) {
      return NextResponse.json(
        { message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    // No permitir eliminar plantillas por defecto
    if (plantilla.esDefault) {
      return NextResponse.json(
        { message: "No se pueden eliminar plantillas por defecto" },
        { status: 400 }
      );
    }

    await db.plantillaConfiguracion.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Plantilla eliminada correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar plantilla:", error);
    return NextResponse.json(
      { message: "Error al eliminar plantilla" },
      { status: 500 }
    );
  }
}