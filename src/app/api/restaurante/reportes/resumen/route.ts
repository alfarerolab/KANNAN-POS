import { EstadoPedidoRestaurante, EstadoPreparacionRestaurante, EstacionPreparacionRestaurante } from "../../../../../lib/prisma-types";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { db } from "@/lib/db";
import { decimalANumero } from "@/lib/restaurante";

function inicioDelDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function finDelDia(fecha: Date) {
  const fin = inicioDelDia(fecha);
  fin.setDate(fin.getDate() + 1);
  return fin;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const ahora = new Date();
    const desdeParam = req.nextUrl.searchParams.get("desde");
    const desde = desdeParam ? new Date(desdeParam) : inicioDelDia(ahora);
    const hasta = finDelDia(ahora);

    const [mesas, pedidosAbiertos, ventasHoy, itemsFacturadosHoy, preparacion] =
      await Promise.all([
        db.mesaRestaurante.findMany({
          where: {
            empresaId: token.empresaId as string,
          },
          select: {
            id: true,
            activa: true,
            estado: true,
          },
        }),
        db.pedidoRestaurante.findMany({
          where: {
            empresaId: token.empresaId as string,
            estado: "ABIERTO",
          },
          select: {
            id: true,
            total: true,
          },
        }),
        db.pedidoRestaurante.aggregate({
          where: {
            empresaId: token.empresaId as string,
            estado: "FACTURADO",
            fechaFacturacion: {
              gte: desde,
              lt: hasta,
            },
          },
          _count: {
            id: true,
          },
          _sum: {
            total: true,
          },
        }),
        db.pedidoRestauranteItem.findMany({
          where: {
            pedido: {
              empresaId: token.empresaId as string,
              estado: "FACTURADO",
              fechaFacturacion: {
                gte: desde,
                lt: hasta,
              },
            },
          },
          select: {
            productoId: true,
            nombreProducto: true,
            cantidad: true,
            subtotal: true,
          },
        }),
        db.pedidoRestauranteItem.findMany({
          where: {
            pedido: {
              empresaId: token.empresaId as string,
              estado: "ABIERTO",
            },
            estadoPreparacion: {
              not: "ENTREGADO",
            },
          },
          select: {
            estacion: true,
            estadoPreparacion: true,
          },
        }),
      ]);

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const topProductosMap = itemsFacturadosHoy.reduce<
      Record<string, { productoId: string; nombreProducto: string; cantidad: number; total: number }>
    // @ts-expect-error Autofix Next15 o tipos implícitos
    >((acc, item) => {
      const actual = acc[item.productoId] || {
        productoId: item.productoId,
        nombreProducto: item.nombreProducto,
        cantidad: 0,
        total: 0,
      };

      actual.cantidad += item.cantidad;
      actual.total += decimalANumero(item.subtotal);
      acc[item.productoId] = actual;
      return acc;
    }, {});

    const totalVentasHoy = decimalANumero(ventasHoy._sum.total);
    const cantidadVentasHoy = ventasHoy._count.id;

    const response = {
      fecha: ahora.toISOString(),
      mesas: {
        total: mesas.length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        activas: mesas.filter((mesa) => mesa.activa).length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        libres: mesas.filter((mesa) => mesa.estado === "LIBRE" && mesa.activa).length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        ocupadas: mesas.filter((mesa) => mesa.estado === "OCUPADA" && mesa.activa).length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        reservadas: mesas.filter((mesa) => mesa.estado === "RESERVADA" && mesa.activa)
          .length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        limpieza: mesas.filter((mesa) => mesa.estado === "LIMPIEZA" && mesa.activa).length,
        // @ts-expect-error Autofix Next15 o tipos implícitos
        inactivas: mesas.filter((mesa) => !mesa.activa || mesa.estado === "INACTIVA")
          .length,
      },
      pedidosAbiertos: pedidosAbiertos.length,
      consumoAbierto: pedidosAbiertos.reduce(
        // @ts-expect-error Autofix Next15 o tipos implícitos
        (acumulado, pedido) => acumulado + decimalANumero(pedido.total),
        0
      ),
      ventasHoy: {
        cantidad: cantidadVentasHoy,
        total: totalVentasHoy,
        ticketPromedio:
          cantidadVentasHoy > 0 ? totalVentasHoy / cantidadVentasHoy : 0,
      },
      preparacion: {
        cocina: preparacion.filter(
          // @ts-expect-error Autofix Next15 o tipos implícitos
          (item) =>
            item.estacion === "COCINA" &&
            item.estadoPreparacion !== "ENTREGADO"
        ).length,
        barra: preparacion.filter(
          // @ts-expect-error Autofix Next15 o tipos implícitos
          (item) =>
            item.estacion === "BARRA" &&
            item.estadoPreparacion !== "ENTREGADO"
        ).length,
        general: preparacion.filter(
          // @ts-expect-error Autofix Next15 o tipos implícitos
          (item) =>
            item.estacion === "GENERAL" &&
            item.estadoPreparacion !== "ENTREGADO"
        ).length,
        listos: preparacion.filter(
          // @ts-expect-error Autofix Next15 o tipos implícitos
          (item) =>
            item.estadoPreparacion === "LISTO"
        ).length,
      },
      topProductos: Object.values(topProductosMap)
        // @ts-expect-error Autofix Next15 o tipos implícitos
        .sort((a, b) => b.cantidad - a.cantidad || b.total - a.total)
        .slice(0, 5),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error al obtener el resumen del restaurante:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el resumen del restaurante" },
      { status: 500 }
    );
  }
}
