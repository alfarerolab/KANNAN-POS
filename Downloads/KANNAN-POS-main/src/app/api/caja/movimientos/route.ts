// src/app/api/caja/movimientos/route.ts
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
    const terminalesParam = searchParams.get("terminales"); // Comma-separated list of terminal IDs
    const cajaId = searchParams.get("cajaId") || undefined;

    const inicio = new Date(`${fechaFiltro}T00:00:00-05:00`);
    const fin = new Date(`${fechaFiltro}T23:59:59.999-05:00`);
    const empresaId = session.user.empresaId;

    let terminalesIds: string[] = [];
    if (terminalesParam && terminalesParam !== "all" && terminalesParam.trim() !== "") {
      terminalesIds = terminalesParam.split(",");
    }

    // 1. Obtener todas las ventas completadas hoy del negocio
    const whereVenta: any = {
      empresaId,
      estado: "COMPLETADA",
      createdAt: { gte: inicio, lte: fin },
      ...(cajaId && { cajaId })
    };

    if (terminalesIds.length > 0) {
      const principalSelected = await db.terminal.findFirst({
        where: {
          id: { in: terminalesIds },
          esTerminalPrincipal: true,
        },
      });

      if (principalSelected) {
        whereVenta.OR = [
          { terminalId: { in: terminalesIds } },
          { terminalId: null },
        ];
      } else {
        whereVenta.terminalId = { in: terminalesIds };
      }
    }

    const ventas = await db.venta.findMany({
      where: whereVenta,
      include: {
        cliente: true,
        usuario: true,
        terminal: true,
        pagos: true,
      },
    });

    // 2. Obtener todos los gastos registrados hoy
    const gastos = await db.gasto.findMany({
      where: {
        empresaId,
        fecha: { gte: inicio, lte: fin },
        ...(cajaId && { cajaId })
      },
      include: {
        usuario: true,
        categoria: true,
      },
    });

    // 3. Obtener pagos de deudas (ventas fiadas) cobrados hoy
    const wherePagosDeudas: any = {
      fechaPago: { gte: inicio, lte: fin },
      venta: {
        empresaId,
        ...(cajaId && { cajaId })
      },
    };

    if (terminalesIds.length > 0) {
      const principalSelected = await db.terminal.findFirst({
        where: {
          id: { in: terminalesIds },
          esTerminalPrincipal: true,
        },
      });

      if (principalSelected) {
        wherePagosDeudas.venta.OR = [
          { terminalId: { in: terminalesIds } },
          { terminalId: null },
        ];
      } else {
        wherePagosDeudas.venta.terminalId = { in: terminalesIds };
      }
    }

    const pagosDeudas = await db.pagoVentaFiada.findMany({
      where: wherePagosDeudas,
      include: {
        venta: {
          include: {
            cliente: true,
            usuario: true,
            terminal: true,
          },
        },
      },
    });

    // Agrupación de ingresos por método de pago
    const ingresosPorMetodo = {
      EFECTIVO: 0,
      BANCOLOMBIA: 0,
      NEQUI: 0,
      DAVIPLATA: 0,
      TARJETA: 0,
      OTRO: 0,
    };

    const categorizarMetodoPago = (metodo: string): keyof typeof ingresosPorMetodo => {
      const m = String(metodo).toUpperCase();
      if (m.includes("EFECTIVO")) return "EFECTIVO";
      if (m.includes("BANCOLOMBIA") || m.includes("TRANSFERENCIA")) return "BANCOLOMBIA";
      if (m.includes("NEQUI")) return "NEQUI";
      if (m.includes("DAVIPLATA")) return "DAVIPLATA";
      if (m.includes("TARJETA")) return "TARJETA";
      return "OTRO";
    };

    // Procesar ventas directas
    const ventasDirectas = ventas.filter((v: any) => !v.esVentaFiada);
    for (const v of ventasDirectas) {
      const monto = parseFloat(v.total.toString());
      if (v.metodoPago === "MIXTO" && v.pagos && v.pagos.length > 0) {
        for (const pago of v.pagos) {
          const cat = categorizarMetodoPago(pago.metodoPago);
          ingresosPorMetodo[cat] += parseFloat(pago.monto.toString());
        }
      } else {
        const cat = categorizarMetodoPago(v.metodoPago);
        ingresosPorMetodo[cat] += monto;
      }
    }

    // Procesar cobros de deudas
    for (const p of pagosDeudas) {
      const monto = parseFloat(p.monto.toString());
      const cat = categorizarMetodoPago(p.metodoPago);
      ingresosPorMetodo[cat] += monto;
    }

    // Agrupación de gastos
    let totalGastosEfectivo = 0;
    let totalGastosDigital = 0;
    for (const g of gastos) {
      const monto = parseFloat(g.monto.toString());
      if (String(g.metodoPago).toUpperCase().includes("EFECTIVO")) {
        totalGastosEfectivo += monto;
      } else {
        totalGastosDigital += monto;
      }
    }

    // Construcción del listado unificado de movimientos
    const movimientos: any[] = [];

    // Agregar ventas directas
    for (const v of ventasDirectas) {
      movimientos.push({
        id: `v-${v.id}`,
        ventaId: v.id,
        fecha: v.createdAt.toISOString(),
        cliente: v.cliente?.nombre || "Desconocido",
        cobradoPor: v.usuario.nombre,
        tipo: "Cobro",
        en: v.metodoPago === "MIXTO" 
          ? `Mixto (${v.pagos.map((p: any) => p.metodoPago).join(", ")})`
          : v.metodoPago,
        importe: parseFloat(v.total.toString()),
        terminal: v.terminal?.nombre || "Principal",
      });
    }

    // Agregar pagos de deudas (cobros)
    for (const p of pagosDeudas) {
      movimientos.push({
        id: `pd-${p.id}`,
        ventaId: p.venta.id,
        fecha: p.fechaPago.toISOString(),
        cliente: p.venta.cliente?.nombre || "Desconocido",
        cobradoPor: p.venta.usuario.nombre,
        tipo: "Cobro (Abono deuda)",
        en: p.metodoPago,
        importe: parseFloat(p.monto.toString()),
        terminal: p.venta.terminal?.nombre || "Principal",
      });
    }

    // Agregar gastos (egresos)
    for (const g of gastos) {
      movimientos.push({
        id: `g-${g.id}`,
        fecha: g.fecha.toISOString(),
        cliente: g.concepto, // En gastos el concepto se muestra como el receptor/detalle
        cobradoPor: g.usuario.nombre,
        tipo: "Gasto",
        en: g.metodoPago || "EFECTIVO",
        importe: -parseFloat(g.monto.toString()),
        terminal: "General",
      });
    }

    // Ordenar movimientos por fecha de forma descendente
    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Obtener turno de caja abierto para calcular base
    const turnoAbierto = await db.cajaTurno.findFirst({
      where: {
        empresaId,
        cerradaEn: null,
        ...(cajaId && { cajaId })
      },
    });

    const montoInicial = turnoAbierto ? parseFloat(turnoAbierto.montoInicial.toString()) : 0;
    // Caja (Efectivo) esperado = montoInicial + ingresosEfectivo - gastosEfectivo
    const efectivoEsperado = montoInicial + ingresosPorMetodo.EFECTIVO - totalGastosEfectivo;

    const totalIngresos = Object.values(ingresosPorMetodo).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      resumen: {
        caja: ingresosPorMetodo.EFECTIVO,
        bancolombia: ingresosPorMetodo.BANCOLOMBIA,
        nequi: ingresosPorMetodo.NEQUI,
        daviplata: ingresosPorMetodo.DAVIPLATA,
        tarjeta: ingresosPorMetodo.TARJETA,
        otro: ingresosPorMetodo.OTRO,
        total: totalIngresos,
        efectivoEsperado,
        montoInicial,
        turnoAbierto: turnoAbierto ? {
          id: turnoAbierto.id,
          abiertaEn: turnoAbierto.abiertaEn,
          montoInicial: parseFloat(turnoAbierto.montoInicial.toString()),
        } : null,
      },
      movimientos,
    });

  } catch (error: any) {
    console.error("[CAJA_MOVIMIENTOS_GET]", error);
    return NextResponse.json({ error: error.message || "Error al obtener movimientos de caja" }, { status: 500 });
  }
}
