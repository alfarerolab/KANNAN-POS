import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { montoFinalReal, notas, cajaId } = body;

    // Obtener turno abierto
    const whereCondition: any = {
      empresaId: session.user.empresaId,
      cerradaEn: null
    };

    if (cajaId) {
      whereCondition.cajaId = cajaId;
    }

    let turnoAbierto = await db.cajaTurno.findFirst({
      where: whereCondition
    });

    let efectivoInicial = 0;
    let fechaApertura = new Date();
    fechaApertura.setHours(0, 0, 0, 0);

    if (!turnoAbierto) {
      // Crear un turno automático iniciado hoy en 0
      turnoAbierto = await db.cajaTurno.create({
        data: {
          empresaId: session.user.empresaId,
          usuarioId: session.user.id,
          cajaId: cajaId || null,
          montoInicial: 0,
          abiertaEn: fechaApertura,
        }
      });
    } else {
      efectivoInicial = Number(turnoAbierto.montoInicial) || 0;
      fechaApertura = turnoAbierto.abiertaEn;
    }

    // Calcular el montoFinalEsperado
    // 1. Efectivo inicial

    // 2. Ingresos en efectivo (ventas directas + pagos de fiados)
    const ventasEfectivo = await db.venta.findMany({
      where: {
        empresaId: session.user.empresaId,
        estado: "COMPLETADA",
        createdAt: {
          gte: fechaApertura
        },
        esVentaFiada: false,
        metodoPago: "EFECTIVO",
        ...(turnoAbierto.cajaId && { cajaId: turnoAbierto.cajaId })
      },
      select: {
        total: true
      }
    });
    
    const pagosDeudas = await db.pagoVentaFiada.findMany({
      where: {
        venta: { 
          empresaId: session.user.empresaId,
          ...(turnoAbierto.cajaId && { cajaId: turnoAbierto.cajaId })
        },
        fechaPago: { gte: fechaApertura },
        metodoPago: "EFECTIVO"
      },
      select: { monto: true }
    });

    let ingresosEfectivo = 0;
    ventasEfectivo.forEach((v: any) => ingresosEfectivo += parseFloat(v.total.toString()));
    pagosDeudas.forEach((p: any) => ingresosEfectivo += parseFloat(p.monto.toString()));

    // 3. Gastos en efectivo
    const gastosEfectivo = await db.gasto.aggregate({
      where: {
        empresaId: session.user.empresaId,
        fecha: {
          gte: fechaApertura
        },
        metodoPago: "EFECTIVO",
        ...(turnoAbierto.cajaId && { cajaId: turnoAbierto.cajaId })
      },
      _sum: {
        monto: true
      }
    });
    const salidasEfectivo = Number(gastosEfectivo._sum.monto) || 0;

    const montoFinalEsperado = efectivoInicial + ingresosEfectivo - salidasEfectivo;
    const diferencia = Number(montoFinalReal) - montoFinalEsperado;

    const turnoCerrado = await db.cajaTurno.update({
      where: { id: turnoAbierto.id },
      data: {
        cerradaEn: new Date(),
        montoFinalEsperado,
        montoFinalReal: Number(montoFinalReal),
        diferencia,
        notas
      }
    });

    return NextResponse.json({ success: true, turno: turnoCerrado });
  } catch (error: any) {
    console.error("[CERRAR CAJA]", error);
    return NextResponse.json({ error: "Error al cerrar la caja", details: error.message }, { status: 500 });
  }
}
