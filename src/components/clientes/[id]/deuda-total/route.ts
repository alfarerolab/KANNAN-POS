// src/app/api/clientes/[id]/deuda-total/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener deuda total del cliente con todas sus ventas fiadas pendientes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const clienteId = params.id;
    const empresaId = session.user.empresaId;

    // Verificar que el cliente pertenece a la empresa
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

    // Obtener todas las ventas fiadas pendientes del cliente (ordenadas por antigüedad)
    const ventasFiadas = await db.venta.findMany({
      where: {
        clienteId,
        empresaId,
        esVentaFiada: true,
        estadoPago: {
          in: ["PENDIENTE", "PAGO_PARCIAL", "VENCIDO"],
        },
        saldoPendiente: {
          gt: 0,
        },
      },
      include: {
        pagosFiados: {
          orderBy: {
            fechaPago: "desc",
          },
        },
      },
      orderBy: {
        fechaCreacion: "asc", // Más antiguas primero
      },
    });

    // Calcular totales
    const deudaTotal = ventasFiadas.reduce(
      (sum, venta) => sum + Number(venta.saldoPendiente || 0),
      0
    );

    const totalOriginal = ventasFiadas.reduce(
      (sum, venta) => sum + Number(venta.total),
      0
    );

    const totalPagado = ventasFiadas.reduce(
      (sum, venta) => sum + Number(venta.montoPagado || 0),
      0
    );

    // Estadísticas adicionales
    const ventasVencidas = ventasFiadas.filter(
      (v) => v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date()
    ).length;

    const ventaMasAntigua = ventasFiadas.length > 0 ? ventasFiadas[0] : null;
    const ventaMasReciente = ventasFiadas.length > 0 ? ventasFiadas[ventasFiadas.length - 1] : null;

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
      },
      resumen: {
        deudaTotal,
        totalOriginal,
        totalPagado,
        cantidadVentas: ventasFiadas.length,
        ventasVencidas,
      },
      ventas: ventasFiadas.map((venta) => ({
        id: venta.id,
        fechaCreacion: venta.fechaCreacion,
        total: Number(venta.total),
        saldoPendiente: Number(venta.saldoPendiente || 0),
        montoPagado: Number(venta.montoPagado || 0),
        estadoPago: venta.estadoPago,
        fechaVencimiento: venta.fechaVencimiento,
        diasCredito: venta.diasCredito,
        cantidadPagos: venta.pagosFiados?.length || 0,
        ultimoPago: venta.pagosFiados?.[0]
          ? {
              monto: Number(venta.pagosFiados[0].monto),
              fecha: venta.pagosFiados[0].fechaPago,
              metodoPago: venta.pagosFiados[0].metodoPago,
            }
          : null,
      })),
      ventaMasAntigua: ventaMasAntigua
        ? {
            id: ventaMasAntigua.id,
            fecha: ventaMasAntigua.fechaCreacion,
            saldo: Number(ventaMasAntigua.saldoPendiente || 0),
          }
        : null,
      ventaMasReciente: ventaMasReciente
        ? {
            id: ventaMasReciente.id,
            fecha: ventaMasReciente.fechaCreacion,
            saldo: Number(ventaMasReciente.saldoPendiente || 0),
          }
        : null,
    });
  } catch (error) {
    console.error("Error al obtener deuda total:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener deuda total" },
      { status: 500 }
    );
  }
}
