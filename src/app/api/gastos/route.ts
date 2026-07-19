import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

// GET — listar gastos con filtros de fecha
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Sin permisos para ver gastos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const categoriaId = searchParams.get("categoriaId");

    // Construir filtro de fechas
    const fechaFiltro: any = {};
    if (desde) fechaFiltro.gte = new Date(desde);
    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setUTCHours(23, 59, 59, 999);
      fechaFiltro.lte = hastaDate;
    }

    const whereClause: any = { empresaId };
    if (Object.keys(fechaFiltro).length > 0) whereClause.fecha = fechaFiltro;
    if (categoriaId) whereClause.categoriaId = categoriaId;

    const gastos = await db.gasto.findMany({
      where: whereClause,
      include: {
        categoria: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    // Calcular totales
    const totalMonto = gastos.reduce(
      (sum: number, g: { monto: { toString: () => string } }) => sum + parseFloat(g.monto.toString()),
      0
    );

    // Agrupar por categoría para encontrar la más frecuente
    const conteoCategoria: Record<string, { nombre: string; count: number }> = {};
    for (const g of gastos) {
      const catId = g.categoriaId;
      if (!conteoCategoria[catId]) {
        conteoCategoria[catId] = { nombre: g.categoria.nombre, count: 0 };
      }
      conteoCategoria[catId].count++;
    }

    const categoriaMasFrecuente = Object.values(conteoCategoria).sort(
      (a: { nombre: string; count: number }, b: { nombre: string; count: number }) => b.count - a.count
    )[0]?.nombre || null;

    return NextResponse.json({
      gastos: gastos.map((g: typeof gastos[number]) => ({
        id: g.id,
        concepto: g.concepto,
        monto: parseFloat(g.monto.toString()),
        fecha: g.fecha,
        metodoPago: g.metodoPago,
        categoria: g.categoria,
        registradoPor: g.usuario,
        createdAt: g.createdAt,
      })),
      resumen: {
        totalMonto,
        totalGastos: gastos.length,
        categoriaMasFrecuente,
      },
    });
  } catch (error) {
    console.error("Error al obtener gastos:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}

// POST — registrar un nuevo gasto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Solo administradores y gerentes pueden registrar gastos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id as string;

    const { concepto, monto, fecha, metodoPago, categoriaId } = await request.json();

    // Validaciones
    if (!concepto?.trim()) {
      return NextResponse.json({ mensaje: "El concepto es requerido" }, { status: 400 });
    }
    if (!monto || parseFloat(monto) <= 0) {
      return NextResponse.json({ mensaje: "El monto debe ser mayor a 0" }, { status: 400 });
    }
    if (!categoriaId) {
      return NextResponse.json({ mensaje: "La categoría es requerida" }, { status: 400 });
    }

    // Verificar que la categoría pertenece a la empresa
    const categoria = await db.categoriaGasto.findFirst({
      where: { id: categoriaId, empresaId },
    });
    if (!categoria) {
      return NextResponse.json({ mensaje: "Categoría no válida" }, { status: 400 });
    }

    const gasto = await db.gasto.create({
      data: {
        concepto: concepto.trim(),
        monto: new Decimal(parseFloat(monto)),
        fecha: fecha ? new Date(fecha.includes("T") ? fecha : fecha + "T12:00:00") : new Date(),
        metodoPago: metodoPago || "EFECTIVO",
        categoriaId,
        usuarioId,
        empresaId,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({
      id: gasto.id,
      concepto: gasto.concepto,
      monto: parseFloat(gasto.monto.toString()),
      fecha: gasto.fecha,
      metodoPago: gasto.metodoPago,
      categoria: gasto.categoria,
      registradoPor: gasto.usuario,
      createdAt: gasto.createdAt,
      mensaje: "Gasto registrado exitosamente",
    }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar gasto:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
