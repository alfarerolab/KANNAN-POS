import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "mes"; // semana, mes, trimestre, año
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json({ message: "Empresa no encontrada" }, { status: 404 });
    }

    // Calcular fechas según período
    const fechaFin = new Date();
    let fechaInicio: Date;
    let fechaInicioAnterior: Date;
    let fechaFinAnterior: Date;

    switch (periodo) {
      case "semana":
        fechaInicio = subDays(fechaFin, 7);
        fechaInicioAnterior = subDays(fechaInicio, 7);
        fechaFinAnterior = subDays(fechaFin, 7);
        break;
      case "mes":
        fechaInicio = startOfMonth(fechaFin);
        fechaInicioAnterior = startOfMonth(subDays(fechaInicio, 1));
        fechaFinAnterior = endOfMonth(subDays(fechaInicio, 1));
        break;
      case "trimestre":
        fechaInicio = subDays(fechaFin, 90);
        fechaInicioAnterior = subDays(fechaInicio, 90);
        fechaFinAnterior = subDays(fechaFin, 90);
        break;
      case "año":
        fechaInicio = startOfYear(fechaFin);
        fechaInicioAnterior = startOfYear(subDays(fechaInicio, 1));
        fechaFinAnterior = endOfYear(subDays(fechaInicio, 1));
        break;
      default:
        fechaInicio = startOfMonth(fechaFin);
        fechaInicioAnterior = startOfMonth(subDays(fechaInicio, 1));
        fechaFinAnterior = endOfMonth(subDays(fechaInicio, 1));
    }

    // Ejecutar consultas en paralelo para mejor rendimiento
    const [
      // Métricas período actual
      ventasPeriodoActual,
      clientesUnicos,
      productosVendidos,
      
      // Métricas período anterior
      ventasPeriodoAnterior,
      clientesUnicosAnterior,
      productosVendidosAnterior,
      
      // Datos detallados
      ventasDetalladas,
      ventasDetalladasAnteriores,
      ventasPorDia,
      clientesActivos,
      
      // Análisis de productos/servicios
      itemsVentas,
      itemsVentasAnteriores
    ] = await Promise.all([
      // Ventas período actual
      db.venta.aggregate({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicio, lte: fechaFin }
        },
        _sum: { total: true },
        _count: true
      }),

      // Clientes únicos período actual
      db.venta.findMany({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicio, lte: fechaFin }
        },
        select: { clienteId: true },
        distinct: ["clienteId"]
      }),

      // Productos vendidos período actual
      db.itemVenta.aggregate({
        where: {
          venta: {
            empresaId,
            estado: "COMPLETADA",
            createdAt: { gte: fechaInicio, lte: fechaFin }
          }
        },
        _sum: { cantidad: true }
      }),

      // Ventas período anterior
      db.venta.aggregate({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicioAnterior, lte: fechaFinAnterior }
        },
        _sum: { total: true },
        _count: true
      }),

      // Clientes únicos período anterior
      db.venta.findMany({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicioAnterior, lte: fechaFinAnterior }
        },
        select: { clienteId: true },
        distinct: ["clienteId"]
      }),

      // Productos vendidos período anterior
      db.itemVenta.aggregate({
        where: {
          venta: {
            empresaId,
            estado: "COMPLETADA",
            createdAt: { gte: fechaInicioAnterior, lte: fechaFinAnterior }
          }
        },
        _sum: { cantidad: true }
      }),

      // Ventas detalladas período actual
      db.venta.findMany({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicio, lte: fechaFin }
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          clienteId: true,
          metodoPago: true
        }
      }),

      // Ventas detalladas período anterior
      db.venta.findMany({
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: fechaInicioAnterior, lte: fechaFinAnterior }
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          clienteId: true
        }
      }),

      // Ventas por día (últimos 30 días para gráfico)
      db.venta.groupBy({
        by: ["createdAt"],
        where: {
          empresaId,
          estado: "COMPLETADA",
          createdAt: { gte: subDays(fechaFin, 30) }
        },
        _sum: { total: true },
        _count: true
      }),

      // Total de clientes
      db.cliente.count({
        where: { empresaId }
      }),

      // Items vendidos período actual con detalles
      db.itemVenta.findMany({
        where: {
          venta: {
            empresaId,
            estado: "COMPLETADA",
            createdAt: { gte: fechaInicio, lte: fechaFin }
          }
        },
        include: {
          producto: { select: { id: true, nombre: true, precioCosto: true } },
          servicio: { select: { id: true, nombre: true } }
        }
      }),

      // Items vendidos período anterior
      db.itemVenta.findMany({
        where: {
          venta: {
            empresaId,
            estado: "COMPLETADA",
            createdAt: { gte: fechaInicioAnterior, lte: fechaFinAnterior }
          }
        },
        include: {
          producto: { select: { id: true, nombre: true, precioCosto: true } },
          servicio: { select: { id: true, nombre: true } }
        }
      })
    ]);

    // Cálculos de métricas principales
    const ingresosTotales = Number(ventasPeriodoActual._sum.total || 0);
    const ingresosAnteriores = Number(ventasPeriodoAnterior._sum.total || 0);
    
    const totalVentas = ventasPeriodoActual._count;
    const totalVentasAnteriores = ventasPeriodoAnterior._count;
    
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clientesUnicosCount = clientesUnicos.filter(c => c.clienteId !== null).length;
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const clientesUnicosAnteriorCount = clientesUnicosAnterior.filter(c => c.clienteId !== null).length;
    
    const totalProductosVendidos = Number(productosVendidos._sum.cantidad || 0);
    const totalProductosVendidosAnterior = Number(productosVendidosAnterior._sum.cantidad || 0);

    // Calcular tasa de conversión
    const tasaConversion = clientesActivos > 0 ? (clientesUnicosCount / clientesActivos) * 100 : 0;
    const tasaConversionAnterior = clientesActivos > 0 ? (clientesUnicosAnteriorCount / clientesActivos) * 100 : 0;

    // Valor promedio por venta
    const valorPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;
    const valorPromedioAnterior = totalVentasAnteriores > 0 ? ingresosAnteriores / totalVentasAnteriores : 0;

    // Separar productos y servicios
    const separacionItems = (items: typeof itemsVentas) => {
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const productos = items.filter(item => item.producto);
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const servicios = items.filter(item => item.servicio);
      
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const ingresosProductos = productos.reduce((sum: number, item) => sum + Number(item.subtotal), 0);
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const ingresosServicios = servicios.reduce((sum: number, item) => sum + Number(item.subtotal), 0);
      
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const cantidadProductos = productos.reduce((sum: number, item) => sum + Number(item.cantidad), 0);
      // @ts-expect-error Autofix Next15 o tipos implícitos
      const cantidadServicios = servicios.reduce((sum: number, item) => sum + Number(item.cantidad), 0);

      return {
        productos: { ingresos: ingresosProductos, cantidad: cantidadProductos },
        servicios: { ingresos: ingresosServicios, cantidad: cantidadServicios }
      };
    };

    const itemsActuales = separacionItems(itemsVentas);
    const itemsAnteriores = separacionItems(itemsVentasAnteriores);

   // Análisis de rendimiento por categoría
      const categorias = [];

      // Siempre agregar productos si hay ventas
      if (itemsActuales.productos.cantidad > 0 || itemsActuales.productos.ingresos > 0) {
        categorias.push({
          categoria: "Productos",
          ventas: itemsActuales.productos.cantidad,
          ingresos: itemsActuales.productos.ingresos,
          crecimiento: itemsAnteriores.productos.ingresos > 0 
            ? ((itemsActuales.productos.ingresos - itemsAnteriores.productos.ingresos) / itemsAnteriores.productos.ingresos) * 100
            : 0,
          color: "#10b981"
        });
      }

      // Solo agregar servicios si realmente hay servicios vendidos
      if (itemsActuales.servicios.cantidad > 0 || itemsActuales.servicios.ingresos > 0) {
        categorias.push({
          categoria: "Servicios",
          ventas: itemsActuales.servicios.cantidad,
          ingresos: itemsActuales.servicios.ingresos,
          crecimiento: itemsAnteriores.servicios.ingresos > 0
            ? ((itemsActuales.servicios.ingresos - itemsAnteriores.servicios.ingresos) / itemsAnteriores.servicios.ingresos) * 100
            : 0,
          color: "#3b82f6"
        });
      }

    // Distribución por método de pago
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const distribucionPagos = ventasDetalladas.reduce((acc: any, venta) => {
      const metodo = venta.metodoPago || "Sin especificar";
      if (!acc[metodo]) {
        acc[metodo] = { total: 0, count: 0 };
      }
      acc[metodo].total += Number(venta.total);
      acc[metodo].count += 1;
      return acc;
    }, {});

    const totalIngresosPagos = Object.values(distribucionPagos).reduce((sum: number, metodo: any) => sum + metodo.total, 0);
    
    const distribucionVentas = Object.entries(distribucionPagos).map(([nombre, data]: [string, any]) => ({
      nombre,
      valor: totalIngresosPagos > 0 ? Math.round((data.total / totalIngresosPagos) * 100) : 0,
      color: nombre === "EFECTIVO" ? "#10b981" : 
             nombre === "TARJETA_CREDITO" ? "#3b82f6" :
             nombre === "TARJETA_DEBITO" ? "#f59e0b" :
             nombre === "TRANSFERENCIA" ? "#8b5cf6" : "#6b7280"
    }));

    // Tendencias diarias
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const tendenciaVentas = ventasPorDia.map(venta => ({
      fecha: format(new Date(venta.createdAt), 'dd/MM'),
      actual: Number(venta._sum.total || 0),
      anterior: 0, // Simplificado - podrías calcular el mismo día del período anterior
      meta: valorPromedio * 1.1 // Meta 10% superior al promedio
    })).slice(-30);

    // Objetivos (simulados basados en datos reales)
    const metaMensual = ingresosTotales * 1.2;
    const metaVentas = totalVentas * 1.15;
    const metaClientes = clientesUnicosCount * 1.1;
    
    

    // Respuesta final
    return NextResponse.json({
      metricas: [
        {
          titulo: "Ingresos Totales",
          valor: ingresosTotales,
          valorAnterior: ingresosAnteriores,
          formato: "currency",
          icono: "DollarSign",
          color: "text-green-600",
          descripcion: "Ingresos generados en el período"
        },
        {
          titulo: "Tasa de Conversión",
          valor: tasaConversion,
          valorAnterior: tasaConversionAnterior,
          formato: "percentage",
          icono: "Target",
          color: "text-blue-600",
          descripcion: "Porcentaje de clientes que compran"
        },
        {
          titulo: "Valor Promedio por Venta",
          valor: valorPromedio,
          valorAnterior: valorPromedioAnterior,
          formato: "currency",
          icono: "TrendingUp",
          color: "text-purple-600",
          descripcion: "Ticket promedio por transacción"
        },
        {
          titulo: "Clientes Activos",
          valor: clientesUnicosCount,
          valorAnterior: clientesUnicosAnteriorCount,
          formato: "number",
          icono: "Users",
          color: "text-orange-600",
          descripcion: "Clientes que han comprado este período"
        }
      ],
      tendenciaVentas,
      rendimientoCategorias: categorias,
      distribucionVentas,
      periodo,
      fechaInicio,
      fechaFin
    });

  } catch (error) {
    console.error("Error al generar reportes avanzados:", error);
    return NextResponse.json(
      { message: "Error al generar reportes avanzados" },
      { status: 500 }
    );
  }
}