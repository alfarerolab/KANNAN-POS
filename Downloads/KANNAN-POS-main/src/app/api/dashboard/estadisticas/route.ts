import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo') || 'hoy';

    // Fechas para consultas
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const finHoy = new Date(inicioHoy);
    finHoy.setDate(finHoy.getDate() + 1);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - 7);

    const inicioMes = new Date(hoy);
    inicioMes.setMonth(hoy.getMonth() - 1);

    // Consultas optimizadas en paralelo
    const [
      ventasHoy,
      ventasSemana,
      ventasMes,
      productosInfo,
      clientesInfo,
      citasInfo,
      serviciosInfo,
      ventasRecientes,
      productosMasVendidos,
    ] = await Promise.allSettled([
      // Ventas de hoy
      db.venta.aggregate({
        where: {
          empresaId: session.user.empresaId,
          createdAt: { gte: inicioHoy, lt: finHoy },
          estado: 'COMPLETADA'
        },
        _sum: { total: true },
        _count: true
      }),

      // Ventas de la semana
      db.venta.aggregate({
        where: {
          empresaId: session.user.empresaId,
          createdAt: { gte: inicioSemana },
          estado: 'COMPLETADA'
        },
        _sum: { total: true },
        _count: true
      }),

      // Ventas del mes
      db.venta.aggregate({
        where: {
          empresaId: session.user.empresaId,
          createdAt: { gte: inicioMes },
          estado: 'COMPLETADA'
        },
        _sum: { total: true },
        _count: true
      }),

      // Información de productos
      db.producto.aggregate({
        where: { empresaId: session.user.empresaId, activo: true },
        _count: true
      }).then(async (result: { _count: number }) => {
        const stockBajo = await db.producto.count({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
            enStock: { lte: 5 }
          }
        });

        const sinStock = await db.producto.count({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
            enStock: { lte: 0 }
          }
        });

        let vencenProximamente = 0;
        try {
          vencenProximamente = await db.producto.count({
            where: {
              empresaId: session.user.empresaId,
              activo: true,
              fechaVencimiento: {
                gte: hoy,
                lte: new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
              }
            }
          });
        } catch (e) {
        }

        return {
          total: result._count,
          stockBajo,
          sinStock,
          vencenProximamente
        };
      }),

      // Información de clientes
      db.cliente.aggregate({
        where: { empresaId: session.user.empresaId },
        _count: true
      }).then(async (result: { _count: number }) => {
        const nuevosEsteMes = await db.cliente.count({
          where: {
            empresaId: session.user.empresaId,
            createdAt: { gte: inicioMes }
          }
        });

        const nuevosHoy = await db.cliente.count({
          where: {
            empresaId: session.user.empresaId,
            createdAt: { gte: inicioHoy }
          }
        });

        return {
          total: result._count,
          nuevosMes: nuevosEsteMes,
          nuevosHoy
        };
      }),

      // Información de citas
      db.cita.count({
        where: { empresaId: session.user.empresaId }
      }).then(async (total: number) => {
        const [hoy, pendientes, completadas] = await Promise.all([
          db.cita.count({
            where: {
              empresaId: session.user.empresaId,
              fechaHora: { gte: inicioHoy, lt: finHoy }
            }
          }),
          db.cita.count({
            where: {
              empresaId: session.user.empresaId,
              estado: { in: ['PROGRAMADA', 'CONFIRMADA'] }
            }
          }),
          db.cita.count({
            where: {
              empresaId: session.user.empresaId,
              estado: 'COMPLETADA'
            }
          })
        ]);

        return { total, hoy, pendientes, completadas };
      }).catch(() => ({ total: 0, hoy: 0, pendientes: 0, completadas: 0 })),

      // Información de servicios
      db.servicio.count({
        where: {
          empresaId: session.user.empresaId,
          activo: true
        }
      }).catch(() => 0),

      // Ventas recientes (últimas 10)
      db.venta.findMany({
        where: {
          empresaId: session.user.empresaId,
          estado: 'COMPLETADA'
        },
        include: {
          cliente: {
            select: { nombre: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Productos más vendidos
      db.itemVenta.groupBy({
        by: ['productoId'],
        where: {
          venta: {
            empresaId: session.user.empresaId,
            estado: 'COMPLETADA',
            createdAt: { gte: inicioMes }
          }
        },
        _sum: {
          cantidad: true
        },
        orderBy: {
          _sum: {
            cantidad: 'desc'
          }
        },
        take: 10
      }).then(async (items: { productoId: string | null; _sum: { cantidad: number | null } }[]) => {
        const productosIds = items.map(item => item.productoId).filter(Boolean);
        if (productosIds.length === 0) return [];

        const productos = await db.producto.findMany({
          where: { id: { in: productosIds } },
          select: { id: true, nombre: true, precio: true }
        });

        return items.map(item => {
          const producto = productos.find((p: { id: string; nombre: string; precio: unknown }) => p.id === item.productoId);
          return {
            id: item.productoId,
            nombre: producto?.nombre || 'Producto eliminado',
            precio: producto?.precio || 0,
            cantidadVendida: item._sum.cantidad || 0
          };
        });
      })
    ]);

    // Procesar resultados
    const ventasHoyData = ventasHoy.status === 'fulfilled' ? ventasHoy.value : { _sum: { total: 0 }, _count: 0 };
    const ventasSemanaData = ventasSemana.status === 'fulfilled' ? ventasSemana.value : { _sum: { total: 0 }, _count: 0 };
    const ventasMesData = ventasMes.status === 'fulfilled' ? ventasMes.value : { _sum: { total: 0 }, _count: 0 };
    const productosData = productosInfo.status === 'fulfilled' ? productosInfo.value : { total: 0, stockBajo: 0, sinStock: 0, vencenProximamente: 0 };
    const clientesData = clientesInfo.status === 'fulfilled' ? clientesInfo.value : { total: 0, nuevosMes: 0, nuevosHoy: 0 };
    const citasData = citasInfo.status === 'fulfilled' ? citasInfo.value : { total: 0, hoy: 0, pendientes: 0, completadas: 0 };
    const serviciosData = serviciosInfo.status === 'fulfilled' ? serviciosInfo.value : 0;
    const ventasRecientesData = ventasRecientes.status === 'fulfilled' ? ventasRecientes.value : [];
    const productosMasVendidosData = productosMasVendidos.status === 'fulfilled' ? productosMasVendidos.value : [];

    // Calcular cambio porcentual
    const semanaAnterior = new Date(inicioSemana);
    semanaAnterior.setDate(semanaAnterior.getDate() - 7);

    const ventasSemanaAnterior = await db.venta.aggregate({
      where: {
        empresaId: session.user.empresaId,
        createdAt: { gte: semanaAnterior, lt: inicioSemana },
        estado: 'COMPLETADA'
      },
      _sum: { total: true }
    }).catch(() => ({ _sum: { total: 0 } }));

    const cambioVentas = ventasSemanaAnterior._sum.total > 0
      ? ((Number(ventasSemanaData._sum.total || 0) - Number(ventasSemanaAnterior._sum.total)) / Number(ventasSemanaAnterior._sum.total)) * 100
      : 0;

    // Generar datos para gráfico de ventas por día
    const ventasPorDia = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const finFecha = new Date(inicioFecha);
      finFecha.setDate(finFecha.getDate() + 1);

      const ventasDia = await db.venta.aggregate({
        where: {
          empresaId: session.user.empresaId,
          createdAt: { gte: inicioFecha, lt: finFecha },
          estado: 'COMPLETADA'
        },
        _sum: { total: true },
        _count: true
      }).catch(() => ({ _sum: { total: 0 }, _count: 0 }));

      ventasPorDia.push({
        fecha: inicioFecha.toISOString().split('T')[0],
        total: Number(ventasDia._sum.total || 0),
        cantidad: ventasDia._count
      });
    }

    // ✅ ESTRUCTURA TRANSFORMADA para que coincida con el hook
    const response = {
      // Formato que espera el hook
      ventasHoy: {
        total: Number(ventasHoyData._sum.total || 0),
        cantidad: ventasHoyData._count
      },
      ventasSemana: {
        total: Number(ventasSemanaData._sum.total || 0),
        cantidad: ventasSemanaData._count
      },
      ventasMes: {
        total: Number(ventasMesData._sum.total || 0),
        cantidad: ventasMesData._count
      },
      productos: {
        total: productosData.total,
        stockBajo: productosData.stockBajo,
        sinStock: productosData.sinStock,
        vencenProximamente: productosData.vencenProximamente
      },
      clientes: {
        total: clientesData.total,
        nuevosMes: clientesData.nuevosMes,
        nuevosHoy: clientesData.nuevosHoy
      },
      servicios: {
        activos: serviciosData
      },
      citas: {
        hoy: citasData.hoy,
        pendientes: citasData.pendientes,
        completadas: citasData.completadas
      },
      ventasPorDia,
      ventasRecientes: ventasRecientesData.map((v: { id: string; total: unknown; metodoPago: unknown; createdAt: Date; cliente: unknown }) => ({
        id: v.id,
        total: Number(v.total),
        metodoPago: v.metodoPago,
        createdAt: v.createdAt.toISOString(),
        cliente: v.cliente
      })),
      productosMasVendidos: productosMasVendidosData,
      cambioVentas: Math.round(cambioVentas * 100) / 100
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error al obtener estadísticas del dashboard:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al obtener estadísticas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}