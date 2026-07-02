// src/app/api/clientes/[id]/pagar-deuda/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { EstadoPagoFiado } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface PagoDistribucion {
  ventaId: string;
  montoAplicado: number;
  saldoAnterior: number;
  nuevoSaldo: number;
}

// POST - Procesar pago de deuda total con distribución automática
export async function POST(
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

    // Obtener todas las ventas fiadas pendientes ordenadas por antigüedad
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
      orderBy: {
        fechaCreacion: "asc", // Más antiguas primero
      },
    });

    if (ventasFiadas.length === 0) {
      return NextResponse.json(
        { mensaje: "El cliente no tiene deudas pendientes" },
        { status: 400 }
      );
    }

    // Calcular deuda total
    const deudaTotal = ventasFiadas.reduce(
      (sum, venta) => sum + Number(venta.saldoPendiente || 0),
      0
    );

    // Validar que el monto no exceda la deuda total
    if (monto > deudaTotal) {
      return NextResponse.json(
        {
          mensaje: `El monto del pago ($${monto.toFixed(2)}) no puede ser mayor a la deuda total ($${deudaTotal.toFixed(2)})`,
        },
        { status: 400 }
      );
    }

    // Procesar la distribución del pago
    let montoRestante = monto;
    const distribucion: PagoDistribucion[] = [];
    const ventasActualizadas: string[] = [];

    // Usar transacción para garantizar atomicidad
    const resultado = await db.$transaction(async (prisma) => {
      for (const venta of ventasFiadas) {
        if (montoRestante <= 0) break;

        const saldoAnterior = Number(venta.saldoPendiente || 0);
        const montoAplicado = Math.min(montoRestante, saldoAnterior);
        const nuevoSaldo = saldoAnterior - montoAplicado;
        const nuevoMontoPagado = Number(venta.montoPagado || 0) + montoAplicado;

        // Determinar nuevo estado de pago
        let nuevoEstadoPago: EstadoPagoFiado;
        if (nuevoSaldo <= 0) {
          nuevoEstadoPago = "PAGADO";
        } else if (nuevoMontoPagado > 0) {
          nuevoEstadoPago = "PAGO_PARCIAL";
        } else {
          // Verificar si está vencido
          if (venta.fechaVencimiento && new Date(venta.fechaVencimiento) < new Date()) {
            nuevoEstadoPago = "VENCIDO";
          } else {
            nuevoEstadoPago = "PENDIENTE";
          }
        }

        // Crear registro de pago para esta venta
        await prisma.pagoVentaFiada.create({
          data: {
            ventaId: venta.id,
            monto: new Decimal(montoAplicado),
            metodoPago,
            referencia: referencia || null,
            notas: notas
              ? `${notas} (Pago distribuido - ${ventasActualizadas.length + 1}/${ventasFiadas.length})`
              : `Pago distribuido automáticamente (${ventasActualizadas.length + 1}/${ventasFiadas.length})`,
            usuarioId,
            fechaPago: new Date(),
          },
        });

        // Actualizar la venta
        await prisma.venta.update({
          where: { id: venta.id },
          data: {
            saldoPendiente: new Decimal(nuevoSaldo),
            montoPagado: new Decimal(nuevoMontoPagado),
            estadoPago: nuevoEstadoPago,
            fechaUltimoPago: new Date(),
          },
        });

        // Guardar información de la distribución
        distribucion.push({
          ventaId: venta.id,
          montoAplicado,
          saldoAnterior,
          nuevoSaldo,
        });

        ventasActualizadas.push(venta.id);
        montoRestante -= montoAplicado;
      }

      return {
        distribucion,
        ventasActualizadas,
        montoAplicado: monto - montoRestante,
      };
    });

    // Calcular nueva deuda total
    const nuevaDeudaTotal = deudaTotal - resultado.montoAplicado;
    const ventasSaldadas = distribucion.filter((d) => d.nuevoSaldo === 0).length;

    return NextResponse.json({
      exito: true,
      mensaje: `Pago de $${resultado.montoAplicado.toFixed(2)} aplicado correctamente`,
      resumen: {
        montoPagado: resultado.montoAplicado,
        deudaAnterior: deudaTotal,
        nuevaDeuda: nuevaDeudaTotal,
        ventasAfectadas: resultado.ventasActualizadas.length,
        ventasSaldadas,
      },
      distribucion: distribucion.map((d) => ({
        ventaId: d.ventaId,
        montoAplicado: d.montoAplicado,
        saldoAnterior: d.saldoAnterior,
        nuevoSaldo: d.nuevoSaldo,
        saldada: d.nuevoSaldo === 0,
      })),
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
      },
    });
  } catch (error) {
    console.error("Error al procesar pago de deuda:", error);
    return NextResponse.json(
      { mensaje: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
