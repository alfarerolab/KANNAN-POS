// src/app/api/clientes/[id]/deuda-total/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener deuda total del cliente con todas sus ventas fiadas pendientes
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const clienteId = resolvedParams.id;
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
        createdAt: "asc", // Más antiguas primero
      },
    });

    // Calcular totales
    type VentaConPagos = typeof ventasFiadas[0];

    const deudaTotal = ventasFiadas.reduce(
      (sum: number, venta: VentaConPagos) => sum + Number(venta.saldoPendiente || 0),
      0
    );

    const totalOriginal = ventasFiadas.reduce(
      (sum: number, venta: VentaConPagos) => sum + Number(venta.total),
      0
    );

    const totalPagado = ventasFiadas.reduce(
      (sum: number, venta: VentaConPagos) => sum + Number(venta.montoPagado || 0),
      0
    );

    // Estadísticas adicionales
    const ventasVencidas = ventasFiadas.filter(
      (v: VentaConPagos) => v.fechaVencimiento && new Date(v.fechaVencimiento) < new Date()
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
      ventas: ventasFiadas.map((venta: VentaConPagos) => ({
        id: venta.id,
        createdAt: venta.createdAt,
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
            fecha: ventaMasAntigua.createdAt,
            saldo: Number(ventaMasAntigua.saldoPendiente || 0),
          }
        : null,
      ventaMasReciente: ventaMasReciente
        ? {
            id: ventaMasReciente.id,
            fecha: ventaMasReciente.createdAt,
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
