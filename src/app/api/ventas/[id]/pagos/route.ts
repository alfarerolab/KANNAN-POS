// src/app/api/ventas/[id]/pagos/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { EstadoPagoFiado } from "@/lib/prisma-types";

// GET - Obtener todos los pagos de una venta fiada
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const ventaId = resolvedParams.id;
    const empresaId = session.user.empresaId;

    // Verificar que la venta pertenece a la empresa
    const venta = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
    });

    if (!venta) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada" },
        { status: 404 }
      );
    }

    // Obtener todos los pagos de la venta
    const pagos = await db.pagoVentaFiada.findMany({
      where: {
        ventaId,
      },
      orderBy: {
        fechaPago: "desc",
      },
    });

    return NextResponse.json({
      pagos,
      resumen: {
        totalPagos: pagos.length,
        montoPagado: pagos.reduce((sum: number, pago: import("@prisma/client").PagoVentaFiada) => sum + Number(pago.monto), 0),
        saldoPendiente: venta.saldoPendiente || 0,
        totalVenta: venta.total,
      },
    });
  } catch (error) {
    console.error("Error al obtener pagos:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener pagos" },
      { status: 500 }
    );
  }
}

// POST - Registrar un nuevo pago parcial
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const ventaId = resolvedParams.id;
    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id;
    const body = await request.json();

    const { monto, metodoPago, referencia, notas } = body;

    // Validaciones
    if (!monto || monto <= 0) {
      return NextResponse.json(
        { mensaje: "El monto del pago debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!metodoPago) {
      return NextResponse.json(
        { mensaje: "El método de pago es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la venta existe y pertenece a la empresa
    const venta = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
      include: {
        cliente: true,
      },
    });

    if (!venta) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que es una venta fiada
    if (!venta.esVentaFiada) {
      return NextResponse.json(
        { mensaje: "Esta venta no es una venta fiada" },
        { status: 400 }
      );
    }

    // Verificar que el monto no exceda el saldo pendiente
    const saldoPendiente = Number(venta.saldoPendiente || 0);
    if (monto > saldoPendiente) {
      return NextResponse.json(
        { 
          mensaje: `El monto del pago ($${monto}) no puede ser mayor al saldo pendiente ($${saldoPendiente})` 
        },
        { status: 400 }
      );
    }

    // Registrar el pago en una transacción
    const resultado = await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
      // 1. Crear el registro del pago
      const pago = await prisma.pagoVentaFiada.create({
        data: {
          ventaId,
          monto,
          metodoPago,
          referencia,
          notas,
          usuarioId,
        },
      });

      // 2. Actualizar la venta
      const nuevoMontoPagado = Number(venta.montoPagado) + monto;
      const nuevoSaldoPendiente = Number(venta.total) - nuevoMontoPagado;
      
      // CORREGIDO: Determinar el nuevo estado de pago usando el enum
      let nuevoEstadoPago: EstadoPagoFiado;
      if (nuevoSaldoPendiente <= 0) {
        nuevoEstadoPago = EstadoPagoFiado.PAGADO;
      } else {
        nuevoEstadoPago = EstadoPagoFiado.PAGO_PARCIAL;
      }

      const ventaActualizada = await prisma.venta.update({
        where: { id: ventaId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoPago: nuevoEstadoPago,
          fechaUltimoPago: new Date(),
          // Si se pagó completamente, actualizar el estado general
          ...(nuevoEstadoPago === EstadoPagoFiado.PAGADO && { estado: "COMPLETADA" }),
        },
      });

      // 3. Crear recordatorio automático si es pago parcial
      if (nuevoEstadoPago === EstadoPagoFiado.PAGO_PARCIAL) {
        await prisma.recordatorioVentaFiada.create({
          data: {
            ventaId,
            tipo: "PAGO_PARCIAL",
            mensaje: `Pago parcial de $${monto} registrado. Saldo pendiente: $${nuevoSaldoPendiente.toFixed(2)}`,
            fechaRecordatorio: new Date(),
            enviado: false,
          },
        });
      }

      return {
        pago,
        ventaActualizada,
        nuevoSaldoPendiente,
        nuevoEstadoPago,
      };
    });

    return NextResponse.json({
      mensaje: "Pago registrado exitosamente",
      pago: resultado.pago,
      venta: {
        id: venta.id,
        montoPagado: resultado.ventaActualizada.montoPagado,
        saldoPendiente: resultado.nuevoSaldoPendiente,
        estadoPago: resultado.nuevoEstadoPago,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("Error al registrar pago:", error);
    return NextResponse.json(
      { mensaje: "Error al registrar pago" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un pago (solo administradores)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    // Solo administradores pueden eliminar pagos
    if (session.user.role !== "ADMINISTRADOR" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { mensaje: "No tiene permisos para eliminar pagos" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pagoId = searchParams.get("pagoId");

    if (!pagoId) {
      return NextResponse.json(
        { mensaje: "ID del pago requerido" },
        { status: 400 }
      );
    }

    const ventaId = resolvedParams.id;
    const empresaId = session.user.empresaId;

    // Verificar que la venta pertenece a la empresa
    const venta = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
    });

    if (!venta) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada" },
        { status: 404 }
      );
    }

    // Obtener el pago a eliminar
    const pago = await db.pagoVentaFiada.findUnique({
      where: { id: pagoId },
    });

    if (!pago || pago.ventaId !== ventaId) {
      return NextResponse.json(
        { mensaje: "Pago no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el pago y recalcular totales en transacción
    await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
      // 1. Eliminar el pago
      await prisma.pagoVentaFiada.delete({
        where: { id: pagoId },
      });

      // 2. Recalcular totales de la venta
      const pagosRestantes = await prisma.pagoVentaFiada.findMany({
        where: { ventaId },
      });

      const nuevoMontoPagado = pagosRestantes.reduce(
        (sum: number, p: import("@prisma/client").PagoVentaFiada) => sum + Number(p.monto),
        0
      );
      const nuevoSaldoPendiente = Number(venta.total) - nuevoMontoPagado;

      // CORREGIDO: Determinar nuevo estado usando el enum
      let nuevoEstadoPago: EstadoPagoFiado;
      if (nuevoSaldoPendiente >= Number(venta.total)) {
        nuevoEstadoPago = EstadoPagoFiado.PENDIENTE;
      } else if (nuevoSaldoPendiente > 0) {
        nuevoEstadoPago = EstadoPagoFiado.PAGO_PARCIAL;
      } else {
        nuevoEstadoPago = EstadoPagoFiado.PAGADO;
      }

      // 3. Actualizar la venta
      await prisma.venta.update({
        where: { id: ventaId },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoPago: nuevoEstadoPago,
        },
      });
    });

    return NextResponse.json({
      mensaje: "Pago eliminado exitosamente",
    });

  } catch (error) {
    console.error("Error al eliminar pago:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar pago" },
      { status: 500 }
    );
  }
}
