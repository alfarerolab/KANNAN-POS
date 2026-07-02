import { Prisma } from "@prisma/client";
import { EstadoMesaRestaurante } from "../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  mesaRestauranteInclude,
  obtenerPedidoAbiertoPorMesa,
  serializarMesaRestaurante,
} from "@/lib/restaurante";

interface ContextoRuta {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const mesa = await db.mesaRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
      },
    });

    if (!mesa) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
    }

    const body = await req.json();
    const pedidoAbierto = await obtenerPedidoAbiertoPorMesa(db, mesa.id);

    const data: Prisma.MesaRestauranteUpdateInput = {};

    if (typeof body.nombre === "string") {
      const nombre = body.nombre.trim();
      if (!nombre) {
        return NextResponse.json(
          { error: "El nombre de la mesa es obligatorio" },
          { status: 400 }
        );
      }
      data.nombre = nombre;
    }

    if (body.capacidad !== undefined) {
      const capacidad = Number(body.capacidad);
      if (!Number.isInteger(capacidad) || capacidad <= 0) {
        return NextResponse.json(
          { error: "La capacidad debe ser un número entero mayor a cero" },
          { status: 400 }
        );
      }
      data.capacidad = capacidad;
    }

    if (body.ubicacion !== undefined) {
      data.ubicacion =
        typeof body.ubicacion === "string" && body.ubicacion.trim()
          ? body.ubicacion.trim()
          : null;
    }

    if (body.activa !== undefined) {
      if (pedidoAbierto && body.activa === false) {
        return NextResponse.json(
          { error: "No puedes desactivar una mesa con una cuenta abierta" },
          { status: 400 }
        );
      }

      data.activa = Boolean(body.activa);
      if (body.activa === false) {
        data.estado = "INACTIVA";
      }
    }

    if (body.estado !== undefined) {
      const estado = body.estado as EstadoMesaRestaurante;
      const estadosValidos = Object.values(EstadoMesaRestaurante);
      if (!estadosValidos.includes(estado)) {
        return NextResponse.json(
          { error: "Estado de mesa inválido" },
          { status: 400 }
        );
      }

      if (pedidoAbierto && estado !== "OCUPADA") {
        return NextResponse.json(
          { error: "La mesa debe permanecer ocupada mientras la cuenta esté abierta" },
          { status: 400 }
        );
      }

      data.estado = estado;
    }

    const mesaActualizada = await db.mesaRestaurante.update({
      where: { id: mesa.id },
      data,
      include: mesaRestauranteInclude,
    });

    return NextResponse.json(serializarMesaRestaurante(mesaActualizada));
  } catch (error) {
    console.error("Error al actualizar mesa del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la mesa" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: ContextoRuta) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const mesa = await db.mesaRestaurante.findFirst({
      where: {
        id,
        empresaId: token.empresaId as string,
      },
    });

    if (!mesa) {
      return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
    }

    const pedidoAbierto = await obtenerPedidoAbiertoPorMesa(db, mesa.id);
    if (pedidoAbierto) {
      return NextResponse.json(
        { error: "No puedes eliminar una mesa con una cuenta abierta" },
        { status: 400 }
      );
    }

    // Hard delete: elimina el registro completamente, liberando el nombre único
    await db.mesaRestaurante.delete({
      where: { id: mesa.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar mesa del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la mesa" },
      { status: 500 }
    );
  }
}