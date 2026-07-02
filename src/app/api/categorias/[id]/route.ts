import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// GET - Obtener detalles de una categoría específica
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: categoriaId } = await params;
    const empresaId = session.user.empresaId;

    const categoria = await db.categoria.findFirst({
      where: {
        id: categoriaId,
        empresaId,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { mensaje: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    // Opcionalmente, podemos incluir los productos asociados a la categoría
    const productosRelacionados = await db.producto.findMany({
      where: {
        categoriaId,
        empresaId,
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
        enStock: true,
        imagen: true,
      },
    });

    return NextResponse.json({
      ...categoria,
      productos: productosRelacionados,
    });
  } catch (error) {
    console.error("Error al obtener detalles de la categoría:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener detalles de la categoría" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar una categoría existente
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: categoriaId } = await params;
    const empresaId = session.user.empresaId;
    const body = await request.json();
    const { nombre, descripcion } = body;

    // Verificar que la categoría exista y pertenezca a la empresa
    const categoriaExistente = await db.categoria.findFirst({
      where: {
        id: categoriaId,
        empresaId,
      },
    });

    if (!categoriaExistente) {
      return NextResponse.json(
        { mensaje: "Categoría no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Validación básica
    if (nombre !== undefined && !nombre.trim()) {
      return NextResponse.json(
        { mensaje: "El nombre de la categoría no puede estar vacío" },
        { status: 400 }
      );
    }

    // Si se cambia el nombre, verificar que no exista otra categoría con ese nombre
    if (nombre && nombre !== categoriaExistente.nombre) {
      const existeConNombre = await db.categoria.findFirst({
        where: {
          nombre,
          empresaId,
          id: { not: categoriaId },
        },
      });

      if (existeConNombre) {
        return NextResponse.json(
          { mensaje: "Ya existe otra categoría con ese nombre en su empresa" },
          { status: 400 }
        );
      }
    }

    // Construir objeto de datos para actualizar
    const datosActualizacion: {
      nombre?: string;
      descripcion?: string;
    } = {};

    if (nombre !== undefined) datosActualizacion.nombre = nombre;
    if (descripcion !== undefined) datosActualizacion.descripcion = descripcion;

    // Actualizar la categoría
    const categoriaActualizada = await db.categoria.update({
      where: {
        id: categoriaId,
      },
      data: datosActualizacion,
    });

    return NextResponse.json(categoriaActualizada);
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json(
      { mensaje: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una categoría
export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const { id: categoriaId } = await params;
    const empresaId = session.user.empresaId;

    // Verificar que la categoría exista y pertenezca a la empresa
    const categoria = await db.categoria.findFirst({
      where: {
        id: categoriaId,
        empresaId,
      },
    });

    if (!categoria) {
      return NextResponse.json(
        { mensaje: "Categoría no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Verificar si hay productos asociados a esta categoría
    const productosAsociados = await db.producto.count({
      where: {
        categoriaId,
        empresaId,
      },
    });

    if (productosAsociados > 0) {
      // Opción 1: No permitir eliminar categorías con productos
      return NextResponse.json(
        {
          mensaje: "No se puede eliminar la categoría porque tiene productos asociados",
          productosAsociados
        },
        { status: 400 }
      );

      // Opción 2: Actualizar los productos para quitar la referencia a la categoría
      // await db.producto.updateMany({
      //   where: {
      //     categoriaId,
      //     empresaId,
      //   },
      //   data: {
      //     categoriaId: null,
      //   },
      // });
    }

    // Eliminar la categoría
    await db.categoria.delete({
      where: {
        id: categoriaId,
      },
    });

    return NextResponse.json({
      mensaje: "Categoría eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar categoría:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}