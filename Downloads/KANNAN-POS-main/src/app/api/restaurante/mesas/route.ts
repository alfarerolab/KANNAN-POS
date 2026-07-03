import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import {
  mesaRestauranteInclude,
  serializarMesaRestaurante,
  decimalANumero,
  serializarPedidoRestaurante,
} from "@/lib/restaurante";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const mesas = await db.mesaRestaurante.findMany({
      where: {
        empresaId: token.empresaId as string,
      },
      include: mesaRestauranteInclude,
      orderBy: [{ activa: "desc" }, { nombre: "asc" }],
    });

    const pedidosFlotantes = await db.pedidoRestaurante.findMany({
      where: {
        empresaId: token.empresaId as string,
        estado: "ABIERTO",
        mesas: { none: {} }
      },
      include: {
        cliente: true,
        usuario: true,
        items: {
          include: { producto: true },
          orderBy: { createdAt: "asc" }
        },
        mesas: { include: { mesa: true } }
      }
    });

    // We serialize existing mesas first
    const serializedMesas = mesas.map(serializarMesaRestaurante);

    // Map free-floating orders into synthetic mesas so frontend handles them identically
    const syntheticMesas = pedidosFlotantes.map((pedido: any) => {
      return {
        id: `synthetic-${pedido.id}`,
        nombre: `Mostrador - ${pedido.nombreCuenta || "General"}`,
        capacidad: pedido.comensales,
        ubicacion: "Barra/Mostrador",
        estado: "OCUPADA",
        activa: true,
        createdAt: pedido.createdAt.toISOString(),
        updatedAt: pedido.updatedAt.toISOString(),
        pedidoAbierto: serializarPedidoRestaurante(pedido),
      };
    });

    return NextResponse.json([...serializedMesas, ...syntheticMesas]);
  } catch (error) {
    console.error("Error al obtener mesas del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener las mesas" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const capacidad = Number(body.capacidad);
    const ubicacion =
      typeof body.ubicacion === "string" && body.ubicacion.trim()
        ? body.ubicacion.trim()
        : null;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre de la mesa es obligatorio" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(capacidad) || capacidad <= 0) {
      return NextResponse.json(
        { error: "La capacidad debe ser un número entero mayor a cero" },
        { status: 400 }
      );
    }

    const mesa = await db.mesaRestaurante.create({
      data: {
        nombre,
        capacidad,
        ubicacion,
        empresaId: token.empresaId as string,
      },
      include: mesaRestauranteInclude,
    });

    return NextResponse.json(serializarMesaRestaurante(mesa), { status: 201 });
  } catch (error) {
    console.error("Error al crear mesa del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo crear la mesa" },
      { status: 500 }
    );
  }
}