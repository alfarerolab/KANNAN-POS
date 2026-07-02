import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const alertas = [];

    // Verificar stock bajo
    const productosStockBajo = await db.producto.findMany({
      where: {
        empresaId,
        enStock: { lte: 5 }, // Stock menor o igual a 5
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        enStock: true,
        stockMinimo: true,
      },
    });

    // @ts-expect-error Autofix Next15 o tipos implícitos
    productosStockBajo.forEach(producto => {
      const stockActual = Number(producto.enStock); // Convertir Decimal a number
      alertas.push({
        id: `stock_${producto.id}`,
        tipo: stockActual === 0 ? 'critica' : 'advertencia',
        titulo: stockActual === 0 ? 'Producto sin stock' : 'Stock bajo',
        descripcion: `${producto.nombre}: ${stockActual} unidades restantes`,
        timestamp: new Date(),
        accion: 'Reabastecer inventario'
      });
    });

    // Verificar ventas pendientes antiguas (más de 24 horas)
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ventasPendientesAntiguas = await db.venta.findMany({
      where: {
        empresaId,
        estado: 'PENDIENTE',
        createdAt: { lt: hace24Horas },
      },
      include: {
        cliente: { select: { nombre: true } },
      },
    });

    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasPendientesAntiguas.forEach(venta => {
      alertas.push({
        id: `venta_pendiente_${venta.id}`,
        tipo: 'advertencia',
        titulo: 'Venta pendiente antigua',
        descripcion: `Venta #${venta.id.slice(-8)} lleva más de 24h pendiente${venta.cliente ? ` - Cliente: ${venta.cliente.nombre}` : ''}`,
        timestamp: new Date(),
        accion: 'Revisar estado de venta'
      });
    });

    // Verificar objetivos de ventas del día
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    const ventasHoy = await db.venta.aggregate({
      where: {
        empresaId,
        createdAt: { gte: inicioHoy },
        estado: 'COMPLETADA',
      },
      _sum: { total: true },
      _count: { id: true },
    });

    // Supongamos un objetivo diario de $10,000 (esto debería venir de configuración)
    const objetivoDiario = 10000;
    const ingresosHoy = Number(ventasHoy._sum.total || 0); // Convertir Decimal a number
    const hora = hoy.getHours();

    // Solo alertar si es después de las 16:00 y no se ha alcanzado el 70% del objetivo
    if (hora >= 16 && ingresosHoy < (objetivoDiario * 0.7)) {
      alertas.push({
        id: 'objetivo_diario',
        tipo: 'advertencia',
        titulo: 'Objetivo diario en riesgo',
        descripcion: `Ingresos actuales: $${ingresosHoy.toFixed(2)}. Objetivo: $${objetivoDiario}`,
        timestamp: new Date(),
        accion: 'Impulsar ventas'
      });
    }

    // Verificar productos sin ventas en los últimos 30 días
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const productosSinVentas = await db.producto.findMany({
      where: {
        empresaId,
        activo: true,
        // Corregir la consulta de productos sin ventas
        NOT: {
          itemsVenta: {
            some: {
              venta: {
                createdAt: { gte: hace30Dias },
                estado: 'COMPLETADA',
              },
            },
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        precio: true,
      },
      take: 5, // Limitar a 5 productos
    });

    if (productosSinVentas.length > 0) {
      alertas.push({
        id: 'productos_sin_ventas',
        tipo: 'info',
        titulo: 'Productos sin ventas recientes',
        descripcion: `${productosSinVentas.length} productos no han tenido ventas en los últimos 30 días`,
        timestamp: new Date(),
        accion: 'Revisar estrategia de productos'
      });
    }

    // Verificar picos de cancelaciones
    const cancelacionesRecientes = await db.venta.count({
      where: {
        empresaId,
        estado: 'CANCELADA',
        createdAt: { gte: hace24Horas },
      },
    });

    if (cancelacionesRecientes > 5) {
      alertas.push({
        id: 'cancelaciones_altas',
        tipo: 'advertencia',
        titulo: 'Alto número de cancelaciones',
        descripcion: `${cancelacionesRecientes} ventas canceladas en las últimas 24 horas`,
        timestamp: new Date(),
        accion: 'Investigar causas'
      });
    }

    // Ordenar alertas por prioridad (críticas primero)
    alertas.sort((a, b) => {
      const prioridad = { 'critica': 3, 'advertencia': 2, 'info': 1 };
      return prioridad[b.tipo as keyof typeof prioridad] - prioridad[a.tipo as keyof typeof prioridad];
    });

    return NextResponse.json(alertas);

  } catch (error) {
    console.error("Error al obtener alertas:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener alertas" },
      { status: 500 }
    );
  }
}