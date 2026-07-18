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
    const fechaFiltro = searchParams.get("fecha") || new Date().toISOString().split('T')[0];

    const inicio = new Date(`${fechaFiltro}T00:00:00-05:00`);
    const fin = new Date(`${fechaFiltro}T23:59:59.999-05:00`);

    const empresaId = session.user.empresaId;

    // 1. Obtener todas las ventas completadas en el rango
    const ventas = await db.venta.findMany({
      where: {
        empresaId,
        estado: "COMPLETADA",
        createdAt: { gte: inicio, lte: fin },
      },
      select: {
        total: true,
        metodoPago: true,
        createdAt: true,
        esVentaFiada: true,
        pagosFiados: {
          select: { monto: true, metodoPago: true, fechaPago: true }
        },
        pagos: {
          select: { monto: true, metodoPago: true }
        }
      }
    });

    // 2. Obtener todos los gastos en el rango
    const gastos = await db.gasto.findMany({
      where: {
        empresaId,
        fecha: { gte: inicio, lte: fin },
      },
      select: {
        monto: true,
        metodoPago: true,
        concepto: true,
        fecha: true,
        categoria: { select: { nombre: true } }
      }
    });

    // Procesar ingresos por método de pago
    const ingresosPorMetodo: Record<string, number> = {
      EFECTIVO: 0,
      TRANSFERENCIA: 0,
      TARJETA: 0,
      OTRO: 0
    };

    let totalVentas = 0;

    for (const v of ventas) {
      if (v.esVentaFiada && v.pagosFiados.length > 0) {
        // Solo sumamos los pagos realizados hoy de ventas fiadas (pueden ser de días anteriores)
        for (const pago of v.pagosFiados) {
          if (pago.fechaPago >= inicio && pago.fechaPago <= fin) {
            const monto = parseFloat(pago.monto.toString());
            const metodo = pago.metodoPago || "OTRO";
            ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + monto;
            totalVentas += monto;
          }
        }
      } else if (!v.esVentaFiada) {
        const monto = parseFloat(v.total.toString());
        const metodo = v.metodoPago || "OTRO";
        ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + monto;
        totalVentas += monto;
      }
    }

    // Si hay pagos de ventas fiadas de fechas anteriores que se pagaron hoy, necesitamos obtenerlos también.
    const pagosDeudas = await db.pagoVentaFiada.findMany({
      where: {
        venta: { empresaId },
        fechaPago: { gte: inicio, lte: fin }
      }
    });

    // Evitar sumar doble si el pago es de una venta que ya entró en el ciclo anterior
    // Para simplificar, reemplazamos la lógica anterior:
    // Mejor sumar: ventas directas hoy + pagos de deudas de cualquier fecha realizados hoy

    // Recalcular limpio:
    let ingresosEfectivo = 0;
    let ingresosTransf = 0;
    let totalIngresos = 0;

    // Ventas completadas hoy que NO son fiadas (o fueron pagadas el mismo día de contado)
    const ventasDirectas = ventas.filter((v: any) => !v.esVentaFiada);
    for (const v of ventasDirectas) {
      if (v.metodoPago === "MIXTO" && v.pagos?.length > 0) {
        for (const pago of v.pagos) {
          const m = parseFloat(pago.monto.toString());
          if (pago.metodoPago === "EFECTIVO") ingresosEfectivo += m;
          else ingresosTransf += m;
        }
        totalIngresos += parseFloat(v.total.toString());
      } else {
        const monto = parseFloat(v.total.toString());
        if (v.metodoPago === "EFECTIVO") ingresosEfectivo += monto;
        else ingresosTransf += monto;
        totalIngresos += monto;
      }
    }

    // Pagos registrados hoy a cuentas fiadas
    for (const pago of pagosDeudas) {
      const monto = parseFloat(pago.monto.toString());
      if (pago.metodoPago === "EFECTIVO") ingresosEfectivo += monto;
      else ingresosTransf += monto;
      totalIngresos += monto;
    }

    // Procesar gastos por método de pago
    let gastosEfectivo = 0;
    let gastosTransf = 0;
    let totalGastos = 0;

    for (const g of gastos) {
      const monto = parseFloat(g.monto.toString());
      if (g.metodoPago === "EFECTIVO") gastosEfectivo += monto;
      else gastosTransf += monto;
      totalGastos += monto;
    }

    // 3. Obtener el turno actual si lo hay
    const turnoAbierto = await db.cajaTurno.findFirst({
      where: {
        empresaId,
        cerradaEn: null
      }
    });

    const montoInicial = turnoAbierto ? Number(turnoAbierto.montoInicial) : 0;
    const efectivoEnCaja = montoInicial + ingresosEfectivo - gastosEfectivo;

    return NextResponse.json({
      resumen: {
        ingresos: {
          efectivo: ingresosEfectivo,
          transferencia_tarjeta: ingresosTransf,
          total: totalIngresos
        },
        gastos: {
          efectivo: gastosEfectivo,
          transferencia_tarjeta: gastosTransf,
          total: totalGastos
        },
        caja: {
          efectivoEsperado: efectivoEnCaja,
          montoInicial: montoInicial
        },
        turnoAbierto: turnoAbierto
      },
      detalles: {
        ventas: ventasDirectas,
        pagosDeudas,
        gastos
      }
    });

  } catch (error: any) {
    console.error("[CAJA RESUMEN]", error);
    return NextResponse.json({ error: error.message || "Error al obtener resumen de caja" }, { status: 500 });
  }
}
