import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// Función auxiliar para convertir Decimal a number
function toNumber(value: number | Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}

// GET - Obtener análisis y estadísticas avanzadas de ventas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado
    const tipoAnalisis = searchParams.get("tipo") || "general";
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const periodo = searchParams.get("periodo") || "mes";
    const quick = searchParams.get("quick") === "true";

    // Fechas por defecto según el período - MEJORADAS
    const fechaFinDefault = new Date();
    const fechaInicioDefault = calcularFechaInicio(periodo);

    const fechaInicioFiltro = fechaInicio ? new Date(fechaInicio) : fechaInicioDefault;
    const fechaFinFiltro = fechaFin ? new Date(fechaFin) : fechaFinDefault;

    // Log para debugging
    const whereClause = {
      empresaId,
      createdAt: {
        gte: fechaInicioFiltro,
        lte: fechaFinFiltro,
      },
    };

    let resultado = {};

    // Si es consulta rápida, devolver solo estadísticas básicas
    if (quick) {
      resultado = await obtenerEstadisticasRapidas(empresaId);
    } else {
      switch (tipoAnalisis) {
        case "general":
          // Para el caso general, incluir todos los datos necesarios para el dashboard
          const [estadisticasGenerales, tendencias, comparativo] = await Promise.all([
            obtenerEstadisticasGenerales(empresaId, whereClause),
            obtenerTendenciasVentas(empresaId, periodo, fechaInicioFiltro, fechaFinFiltro),
            obtenerAnalisisComparativo(empresaId, periodo)
          ]);
          
          resultado = {
            ...estadisticasGenerales,
            ...tendencias,
            ...comparativo
          };
          break;
        case "tendencias":
          resultado = await obtenerTendenciasVentas(empresaId, periodo, fechaInicioFiltro, fechaFinFiltro);
          break;
        case "productos":
          resultado = await obtenerAnalisisProductos(empresaId, whereClause);
          break;
        case "vendedores":
          resultado = await obtenerAnalisisVendedores(empresaId, whereClause);
          break;
        case "metodos-pago":
          resultado = await obtenerAnalisisMetodosPago(empresaId, whereClause);
          break;
        case "comparativo":
          resultado = await obtenerAnalisisComparativo(empresaId, periodo);
          break;
        default:
          // Caso por defecto también incluye todos los datos
          const [estadisticasDefault, tendenciasDefault, comparativoDefault] = await Promise.all([
            obtenerEstadisticasGenerales(empresaId, whereClause),
            obtenerTendenciasVentas(empresaId, periodo, fechaInicioFiltro, fechaFinFiltro),
            obtenerAnalisisComparativo(empresaId, periodo)
          ]);
          
          resultado = {
            ...estadisticasDefault,
            ...tendenciasDefault,
            ...comparativoDefault
          };
      }
    }

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error al obtener análisis de ventas:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener análisis de ventas" },
      { status: 500 }
    );
  }
}

// Función para calcular fecha de inicio según el período - MEJORADA
function calcularFechaInicio(periodo: string): Date {
  const ahora = new Date();
  const fecha = new Date(ahora);
  fecha.setHours(0, 0, 0, 0); // Limpiar horas

  switch (periodo) {
    case "dia":
      fecha.setDate(fecha.getDate() - 30); // Últimos 30 días (no 7)
      break;
    case "semana":
      fecha.setDate(fecha.getDate() - 84); // Últimas 12 semanas
      break;
    case "año":
      fecha.setFullYear(fecha.getFullYear() - 2); // Últimos 2 años (no 3)
      break;
    default: // mes
      fecha.setMonth(fecha.getMonth() - 6); // Últimos 6 meses (no 12)
  }

  return fecha;
}

// Función para estadísticas rápidas (para el dashboard)
async function obtenerEstadisticasRapidas(empresaId: string) {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  
  const [ventasHoy, ventasSemana, ventasMes] = await Promise.all([
    // Ventas de hoy
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: inicioHoy },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    
    // Ventas de la semana
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000) },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    
    // Ventas del mes
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1) },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  return {
    hoy: {
      ventas: ventasHoy._count.id || 0,
      ingresos: toNumber(ventasHoy._sum.total),
    },
    semana: {
      ventas: ventasSemana._count.id || 0,
      ingresos: toNumber(ventasSemana._sum.total),
    },
    mes: {
      ventas: ventasMes._count.id || 0,
      ingresos: toNumber(ventasMes._sum.total),
    },
  };
}

// Función para obtener estadísticas generales
async function obtenerEstadisticasGenerales(empresaId: string, whereClause: any) {
  // Estadísticas básicas del período
  const estadisticasPeriodo = await db.venta.aggregate({
    where: { ...whereClause, estado: 'COMPLETADA' },
    _count: { id: true },
    _sum: { total: true, subtotal: true, impuesto: true, descuento: true },
    _avg: { total: true },
  });

  // Ventas por estado
  const ventasPorEstado = await db.venta.groupBy({
    by: ['estado'],
    where: whereClause,
    _count: { id: true },
    _sum: { total: true },
  });

  // Ventas de hoy vs ayer para comparación
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);
  
  const ayer = new Date(inicioHoy.getTime() - 24 * 60 * 60 * 1000);

  const [ventasHoy, ventasAyer] = await Promise.all([
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: inicioHoy, lt: finHoy },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
    }),
    
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: ayer, lt: inicioHoy },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
    }),
  ]);

  // Calcular crecimiento diario - CORREGIDO
  const ventasAyerCount = ventasAyer._count.id || 0;
  const ventasHoyCount = ventasHoy._count.id || 0;
  const ingresosAyer = toNumber(ventasAyer._sum.total);
  const ingresosHoy = toNumber(ventasHoy._sum.total);

  const crecimientoVentas = ventasAyerCount > 0 
    ? (((ventasHoyCount - ventasAyerCount) / ventasAyerCount) * 100)
    : 0;

  const crecimientoIngresos = ingresosAyer > 0 
    ? (((ingresosHoy - ingresosAyer) / ingresosAyer) * 100)
    : 0;

  // Top 5 clientes por volumen de compras
  const topClientesData = await db.venta.groupBy({
    by: ['clienteId'],
    where: { ...whereClause, clienteId: { not: null }, estado: 'COMPLETADA' },
    _count: { id: true },
    _sum: { total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 5,
  });

  // Obtener detalles de los clientes
  const topClientes = await Promise.all(
    // @ts-expect-error Autofix Next15 o tipos implícitos
    topClientesData.map(async (cliente) => {
      const detalleCliente = await db.cliente.findUnique({
        where: { id: cliente.clienteId! },
        select: { id: true, nombre: true, email: true },
      });
      return {
        ...detalleCliente,
        cantidadVentas: cliente._count.id,
        totalCompras: toNumber(cliente._sum.total),
      };
    })
  );

  return {
    resumen: {
      totalVentas: estadisticasPeriodo._count.id || 0,
      ingresosTotales: toNumber(estadisticasPeriodo._sum.total),
      ticketPromedio: toNumber(estadisticasPeriodo._avg.total),
      totalDescuentos: toNumber(estadisticasPeriodo._sum.descuento),
      totalImpuestos: toNumber(estadisticasPeriodo._sum.impuesto),
    },
    ventasHoy: {
      cantidad: ventasHoyCount,
      ingresos: ingresosHoy,
      crecimientoVentas: Number(crecimientoVentas.toFixed(1)),
      crecimientoIngresos: Number(crecimientoIngresos.toFixed(1)),
    },
    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasPorEstado: ventasPorEstado.map(item => ({
      estado: item.estado,
      cantidad: item._count.id,
      ingresos: toNumber(item._sum.total),
    })),
    topClientes,
  };
}

// Función para obtener tendencias de ventas por período - COMPLETAMENTE REESCRITA
async function obtenerTendenciasVentas(empresaId: string, periodo: string, fechaInicio: Date, fechaFin: Date) {
  // Obtener todas las ventas del período
  const ventas = await db.venta.findMany({
    where: {
      empresaId,
      createdAt: { gte: fechaInicio, lte: fechaFin },
      estado: 'COMPLETADA',
    },
    select: {
      createdAt: true,
      total: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Si no hay ventas reales, generar estructura de períodos vacía para mostrar el rango completo
  if (ventas.length === 0) {
    const periodosVacios = generarPeriodosVacios(fechaInicio, fechaFin, periodo);
    return { 
      tendencias: periodosVacios, 
      periodo,
      mensaje: "No hay ventas registradas en este período",
      rangoFechas: {
        inicio: fechaInicio.toISOString(),
        fin: fechaFin.toISOString()
      }
    };
  }

  // Convertir Decimal a number antes de procesar
  // @ts-expect-error Autofix Next15 o tipos implícitos
  const ventasConvertidas = ventas.map(venta => ({
    createdAt: venta.createdAt,
    total: toNumber(venta.total)
  }));

  // Procesar datos por período
  const datosProcesados = procesarTendenciasPorPeriodo(ventasConvertidas, periodo);

  return { 
    tendencias: datosProcesados, 
    periodo,
    totalVentas: ventas.length,
    rangoFechas: {
      inicio: fechaInicio.toISOString(),
      fin: fechaFin.toISOString()
    }
  };
}

// NUEVA: Función para generar períodos vacíos para visualización
function generarPeriodosVacios(fechaInicio: Date, fechaFin: Date, periodo: string) {
  const periodosVacios = [];
  const fechaActual = new Date(fechaInicio);
  fechaActual.setHours(0, 0, 0, 0);

  while (fechaActual <= fechaFin) {
    periodosVacios.push({
      fecha: new Date(fechaActual),
      cantidad: 0,
      ingresos: 0,
      promedio: 0,
    });

    // Avanzar según el período
    switch (periodo) {
      case "dia":
        fechaActual.setDate(fechaActual.getDate() + 1);
        break;
      case "semana":
        fechaActual.setDate(fechaActual.getDate() + 7);
        break;
      case "mes":
        fechaActual.setMonth(fechaActual.getMonth() + 1);
        break;
      case "año":
        fechaActual.setFullYear(fechaActual.getFullYear() + 1);
        break;
      default:
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
  }

  // Limitar a máximo 50 puntos para evitar sobrecarga visual
  if (periodosVacios.length > 50) {
    const paso = Math.ceil(periodosVacios.length / 50);
    return periodosVacios.filter((_, index) => index % paso === 0);
  }

  return periodosVacios;
}

// Función para procesar tendencias por período - MEJORADA
function procesarTendenciasPorPeriodo(ventas: Array<{createdAt: Date, total: number}>, periodo: string) {
  const agrupados: { [key: string]: { cantidad: number; ingresos: number; fechaReal: Date } } = {};

  ventas.forEach(venta => {
    let clave: string;
    let fechaParaAgrupar: Date;
    const fecha = new Date(venta.createdAt);

    switch (periodo) {
      case "dia":
        fechaParaAgrupar = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        clave = fechaParaAgrupar.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case "semana":
        const inicioSemana = new Date(fecha);
        inicioSemana.setDate(fecha.getDate() - fecha.getDay()); // Domingo como inicio
        inicioSemana.setHours(0, 0, 0, 0);
        fechaParaAgrupar = inicioSemana;
        clave = inicioSemana.toISOString().split('T')[0];
        break;
      case "mes":
        fechaParaAgrupar = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        clave = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case "año":
        fechaParaAgrupar = new Date(fecha.getFullYear(), 0, 1);
        clave = fecha.getFullYear().toString();
        break;
      default:
        fechaParaAgrupar = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        clave = fechaParaAgrupar.toISOString().split('T')[0];
    }

    if (!agrupados[clave]) {
      agrupados[clave] = { cantidad: 0, ingresos: 0, fechaReal: fechaParaAgrupar };
    }

    agrupados[clave].cantidad += 1;
    agrupados[clave].ingresos += venta.total;
  });

  return Object.entries(agrupados)
    .map(([clave, datos]) => ({
      fecha: datos.fechaReal,
      cantidad: datos.cantidad,
      ingresos: datos.ingresos,
      promedio: datos.cantidad > 0 ? datos.ingresos / datos.cantidad : 0,
    }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

// Las demás funciones permanecen igual...
async function obtenerAnalisisProductos(empresaId: string, whereClause: any) {
  // Top productos más vendidos por cantidad
  const topProductosPorCantidad = await db.itemVenta.groupBy({
    by: ['productoId'],
    where: {
      venta: { ...whereClause, estado: 'COMPLETADA' },
    },
    _sum: { cantidad: true, subtotal: true },
    _count: { id: true },
    orderBy: { _sum: { cantidad: 'desc' } },
    take: 10,
  });

  // Top productos por ingresos
  const topProductosPorIngresos = await db.itemVenta.groupBy({
    by: ['productoId'],
    where: {
      venta: { ...whereClause, estado: 'COMPLETADA' },
    },
    _sum: { cantidad: true, subtotal: true },
    _count: { id: true },
    orderBy: { _sum: { subtotal: 'desc' } },
    take: 10,
  });

  // Función para obtener detalles de productos
  const obtenerProductosConDetalles = async (items: any[]) => {
    return Promise.all(
      items.map(async (item) => {
        const producto = await db.producto.findUnique({
          where: { id: item.productoId },
          select: { 
            id: true, 
            nombre: true, 
            codigoBarras: true, 
            precio: true,
            categoria: { select: { nombre: true } }
          },
        });
        
        if (!producto) return null;

        const cantidadVendida = item._sum.cantidad || 0;
        const ingresosTotales = toNumber(item._sum.subtotal);
        const numeroVentas = item._count.id || 0;

        return {
          ...producto,
          precio: toNumber(producto.precio),
          cantidadVendida,
          ingresosTotales,
          numeroVentas,
          promedioVenta: numeroVentas > 0 ? ingresosTotales / numeroVentas : 0,
        };
      })
    ).then(items => items.filter(Boolean));
  };

  const [topPorCantidad, topPorIngresos] = await Promise.all([
    obtenerProductosConDetalles(topProductosPorCantidad),
    obtenerProductosConDetalles(topProductosPorIngresos)
  ]);

  // Análisis por categorías
  const ventasPorCategoriaRaw = await db.itemVenta.groupBy({
    by: ['productoId'],
    where: { 
      venta: { ...whereClause, estado: 'COMPLETADA' },
    },
    _sum: { cantidad: true, subtotal: true },
  });

  const categorias: { [key: string]: { cantidad: number; ingresos: number; productos: Set<string> } } = {};

  await Promise.all(
    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasPorCategoriaRaw.map(async (item) => {
      const producto = await db.producto.findUnique({
        where: { id: item.productoId! },
        include: { categoria: true },
      });

      if (producto?.categoria) {
        const categoriaNombre = producto.categoria.nombre;
        if (!categorias[categoriaNombre]) {
          categorias[categoriaNombre] = { cantidad: 0, ingresos: 0, productos: new Set() };
        }

        categorias[categoriaNombre].cantidad += Number(item._sum.cantidad) || 0;
        categorias[categoriaNombre].ingresos += toNumber(item._sum.subtotal);
        if (item.productoId) {
          categorias[categoriaNombre].productos.add(item.productoId);
        }
      }
    })
  );

  const ventasPorCategoria = Object.entries(categorias).map(([nombre, datos]) => ({
    categoria: nombre,
    cantidad: datos.cantidad,
    ingresos: datos.ingresos,
    productos: datos.productos.size,
    promedioTicket: datos.cantidad > 0 ? datos.ingresos / datos.cantidad : 0,
  })).sort((a, b) => b.ingresos - a.ingresos);

  return {
    topProductosCantidad: topPorCantidad,
    topProductosIngresos: topPorIngresos,
    ventasPorCategoria,
  };
}

async function obtenerAnalisisVendedores(empresaId: string, whereClause: any) {
  const ventasPorVendedor = await db.venta.groupBy({
    by: ['usuarioId'],
    where: { ...whereClause, usuarioId: { not: null } },
    _count: { id: true },
    _sum: { total: true },
    _avg: { total: true },
    orderBy: { _sum: { total: 'desc' } },
  });

  const vendedoresConDetalles = await Promise.all(
    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasPorVendedor.map(async (vendedor) => {
      const usuario = await db.usuario.findUnique({
        where: { id: vendedor.usuarioId },
        select: { id: true, nombre: true, email: true },
      });

      if (!usuario) return null;

      const ventasCompletadas = await db.venta.count({
        where: {
          ...whereClause,
          usuarioId: vendedor.usuarioId,
          estado: 'COMPLETADA',
        },
      });

      return {
        ...usuario,
        totalVentas: vendedor._count.id,
        ingresosTotales: toNumber(vendedor._sum.total),
        ticketPromedio: toNumber(vendedor._avg.total),
        ventasCompletadas,
        tasaConversion: vendedor._count.id > 0 ? (ventasCompletadas / vendedor._count.id) * 100 : 0,
      };
    })
  );

  return { 
    vendedores: vendedoresConDetalles.filter(Boolean)
  };
}

async function obtenerAnalisisMetodosPago(empresaId: string, whereClause: any) {
  const metodosPago = await db.venta.groupBy({
    by: ['metodoPago'],
    where: { ...whereClause, estado: 'COMPLETADA', metodoPago: { not: null } },
    _count: { id: true },
    _sum: { total: true },
    _avg: { total: true },
    orderBy: { _count: { id: 'desc' } },
  });

  // @ts-expect-error Autofix Next15 o tipos implícitos
  const totalVentas = metodosPago.reduce((acc: number, metodo) => acc + metodo._count.id, 0);
  // @ts-expect-error Autofix Next15 o tipos implícitos
  const totalIngresos = metodosPago.reduce((acc: number, metodo) => acc + toNumber(metodo._sum.total), 0);

  // @ts-expect-error Autofix Next15 o tipos implícitos
  const metodosConPorcentaje = metodosPago.map(metodo => ({
    metodo: metodo.metodoPago || 'Sin especificar',
    cantidad: metodo._count.id,
    ingresos: toNumber(metodo._sum.total),
    ticketPromedio: toNumber(metodo._avg.total),
    porcentajeVentas: totalVentas > 0 ? ((metodo._count.id / totalVentas) * 100).toFixed(1) : '0.0',
    porcentajeIngresos: totalIngresos > 0 ? ((toNumber(metodo._sum.total) / totalIngresos) * 100).toFixed(1) : '0.0',
  }));

  return { metodosPago: metodosConPorcentaje };
}

async function obtenerAnalisisComparativo(empresaId: string, periodo: string) {
  const ahora = new Date();
  let fechaActualInicio: Date, fechaAnteriorInicio: Date, fechaAnteriorFin: Date;

  switch (periodo) {
    case "semana":
      fechaActualInicio = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      fechaAnteriorInicio = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000);
      fechaAnteriorFin = fechaActualInicio;
      break;
    case "año":
      fechaActualInicio = new Date(ahora.getFullYear(), 0, 1);
      fechaAnteriorInicio = new Date(ahora.getFullYear() - 1, 0, 1);
      fechaAnteriorFin = new Date(ahora.getFullYear(), 0, 1);
      break;
    default: // mes
      fechaActualInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaAnteriorInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      fechaAnteriorFin = fechaActualInicio;
  }

  const [datosActuales, datosAnteriores] = await Promise.all([
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: fechaActualInicio },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    }),
    
    db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: fechaAnteriorInicio, lt: fechaAnteriorFin },
        estado: 'COMPLETADA',
      },
      _count: { id: true },
      _sum: { total: true },
      _avg: { total: true },
    }),
  ]);

  const calcularCrecimiento = (actual: number, anterior: number) => {
    return anterior > 0 ? ((actual - anterior) / anterior) * 100 : 0;
  };

  const ventasActuales = datosActuales._count.id || 0;
  const ventasAnteriores = datosAnteriores._count.id || 0;
  const ingresosActuales = toNumber(datosActuales._sum.total);
  const ingresosAnteriores = toNumber(datosAnteriores._sum.total);
  const ticketActual = toNumber(datosActuales._avg.total);
  const ticketAnterior = toNumber(datosAnteriores._avg.total);

  return {
    comparativo: {
      ventasActuales,
      ventasAnteriores,
      crecimientoVentas: calcularCrecimiento(ventasActuales, ventasAnteriores),
      ingresosActuales,
      ingresosAnteriores,
      crecimientoIngresos: calcularCrecimiento(ingresosActuales, ingresosAnteriores),
      ticketPromedioActual: ticketActual,
      ticketPromedioAnterior: ticketAnterior,
      crecimientoTicketPromedio: calcularCrecimiento(ticketActual, ticketAnterior),
    },
    periodo,
  };
}