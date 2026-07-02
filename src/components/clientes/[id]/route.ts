import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener detalles de un cliente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const clienteId = params.id;

    const cliente = await db.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { mensaje: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Opcionalmente, podemos incluir el historial de compras del cliente
    const historialCompras = await db.venta.findMany({
      where: {
        clienteId,
        empresaId,
      },
      select: {
        id: true,
        total: true,
        fechaCreacion: true,
        estado: true,
      },
      orderBy: {
        fechaCreacion: "desc",
      },
      take: 10, // Últimas 10 compras
    });

    return NextResponse.json({
      ...cliente,
      historialCompras,
    });
  } catch (error) {
    console.error("Error al obtener detalles del cliente:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener detalles del cliente" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar un cliente existente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const clienteId = params.id;
    const body = await request.json();
    const { nombre, email, telefono, direccion } = body;

    // Verificar que el cliente exista y pertenezca a la empresa
    const clienteExistente = await db.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId,
      },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { mensaje: "Cliente no encontrado o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Validación básica
    if (nombre !== undefined && !nombre.trim()) {
      return NextResponse.json(
        { mensaje: "El nombre del cliente no puede estar vacío" },
        { status: 400 }
      );
    }

    // Validar email si se proporciona
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { mensaje: "El formato del email es inválido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe otro cliente con el mismo email (si se cambia)
    if (email && email !== clienteExistente.email) {
      const existeConEmail = await db.cliente.findFirst({
        where: {
          email,
          empresaId,
          id: { not: clienteId },
        },
      });

      if (existeConEmail) {
        return NextResponse.json(
          { mensaje: "Ya existe otro cliente con ese email en su empresa" },
          { status: 400 }
        );
      }
    }

    // Construir objeto de datos para actualizar
    const datosActualizacion: {
      nombre?: string;
      email?: string;
      telefono?: string;
      direccion?: string;
    } = {};

    if (nombre !== undefined) datosActualizacion.nombre = nombre;
    if (email !== undefined) datosActualizacion.email = email;
    if (telefono !== undefined) datosActualizacion.telefono = telefono;
    if (direccion !== undefined) datosActualizacion.direccion = direccion;

    // Actualizar el cliente
    const clienteActualizado = await db.cliente.update({
      where: {
        id: clienteId,
      },
      data: datosActualizacion,
    });

    return NextResponse.json(clienteActualizado);
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json(
      { mensaje: "Error al actualizar cliente" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const clienteId = params.id;

    // Verificar que el cliente exista y pertenezca a la empresa
    const cliente = await db.cliente.findFirst({
      where: {
        id: clienteId,
        empresaId,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { mensaje: "Cliente no encontrado o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Verificar si hay ventas asociadas a este cliente
    const ventasAsociadas = await db.venta.count({
      where: {
        clienteId,
        empresaId,
      },
    });

    if (ventasAsociadas > 0) {
      return NextResponse.json(
        {
          mensaje: "No se puede eliminar el cliente porque tiene ventas asociadas",
          ventasAsociadas
        },
        { status: 400 }
      );
    }

    // Eliminar el cliente
    await db.cliente.delete({
      where: {
        id: clienteId,
      },
    });

    return NextResponse.json({
      mensaje: "Cliente eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar cliente" },
      { status: 500 }
    );
  }
}
