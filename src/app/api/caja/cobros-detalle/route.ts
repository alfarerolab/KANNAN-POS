// src/app/api/caja/cobros-detalle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const desdeParam = searchParams.get("desde");
    const hastaParam = searchParams.get("hasta");
    const usuarioId = searchParams.get("usuarioId");
    const terminalId = searchParams.get("terminalId");
    const cajaId = searchParams.get("cajaId");
    const metodoPago = searchParams.get("metodoPago");
    const estadoPago = searchParams.get("estadoPago"); // PAGADO, PENDIENTE (Deuda)

    const empresaId = session.user.empresaId;

    // Rango de fechas
    let inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    let fin = new Date();
    fin.setHours(23, 59, 59, 999);

    if (desdeParam) {
      inicio = new Date(desdeParam);
    }
    if (hastaParam) {
      fin = new Date(hastaParam);
    }

    // Filtros
    const whereVenta: any = {
      empresaId,
      estado: "COMPLETADA",
      createdAt: { gte: inicio, lte: fin },
    };

    if (usuarioId && usuarioId !== "todos") {
      whereVenta.usuarioId = usuarioId;
    }

    if (terminalId && terminalId !== "todos") {
      const principal = await db.terminal.findFirst({
        where: { id: terminalId, esTerminalPrincipal: true }
      });
      if (principal) {
        whereVenta.OR = [
          { terminalId: terminalId },
          { terminalId: null }
        ];
      } else {
        whereVenta.terminalId = terminalId;
      }
    }

    if (cajaId && cajaId !== "todos") {
      whereVenta.cajaId = cajaId;
    }

    if (metodoPago && metodoPago !== "todos") {
      whereVenta.metodoPago = metodoPago;
    }

    if (estadoPago && estadoPago !== "todos") {
      if (estadoPago === "DEUDA" || estadoPago === "FIADO") {
        whereVenta.esVentaFiada = true;
        whereVenta.estadoPago = { in: ["PENDIENTE", "PAGO_PARCIAL"] };
      } else if (estadoPago === "PAGADO") {
        whereVenta.estadoPago = "PAGADO";
      }
    }

    // Obtener ventas
    const ventas = await db.venta.findMany({
      where: whereVenta,
      include: {
        cliente: true,
        usuario: true,
        terminal: true,
        caja: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calcular estadísticas
    let totalImporte = 0; // total de subtotal o total antes de impuestos si aplica, aquí sumamos subtotal
    let totalImpuestos = 0;
    let totalDeuda = 0;
    let totalNeto = 0;

    const cobrosList = ventas.map((v: any) => {
      const total = parseFloat(v.total.toString());
      const impuesto = parseFloat(v.impuesto.toString());
      const subtotal = parseFloat(v.subtotal.toString());
      
      const pagado = parseFloat(v.montoPagado.toString());
      const saldoPendiente = v.esVentaFiada 
        ? parseFloat((v.saldoPendiente ?? 0).toString()) 
        : 0;

      totalImporte += subtotal;
      totalImpuestos += impuesto;
      totalDeuda += saldoPendiente;
      totalNeto += total;

      return {
        id: v.id,
        fecha: v.createdAt.toISOString(),
        cliente: v.cliente?.nombre || "Desconocido",
        cobrador: v.usuario.nombre,
        caja: v.caja?.nombre || v.terminal?.nombre || "Principal",
        factura: v.reciboImpreso ? "Sí" : "No", // O ID de factura
        formaPago: v.esVentaFiada ? `Fiado (Abonado: $${pagado})` : v.metodoPago,
        importe: subtotal,
        impuesto: impuesto,
        deuda: saldoPendiente,
        total: total,
      };
    });

    return NextResponse.json({
      estadisticas: {
        cobrosCount: ventas.length,
        importe: totalImporte,
        impuestos: totalImpuestos,
        deuda: totalDeuda,
        total: totalNeto,
      },
      cobros: cobrosList,
    });

  } catch (error: any) {
    console.error("[COBROS_DETALLE_GET]", error);
    return NextResponse.json({ error: error.message || "Error al obtener cobros detallados" }, { status: 500 });
  }
}
