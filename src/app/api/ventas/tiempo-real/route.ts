// src/app/api/ventas/tiempo-real/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const now = new Date();
    const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hace30Min = new Date(now.getTime() - (30 * 60 * 1000));
    const hace1Hora = new Date(now.getTime() - (60 * 60 * 1000));

    // Ventas recientes (últimas 2 horas)
    const ventasRecientes = await db.venta.findMany({
      where: {
        empresaId,
        createdAt: {
          gte: hace1Hora
        },
        estado: 'COMPLETADA'
      },
      include: {
        usuario: {
          select: { nombre: true }
        },
        cliente: {
          select: { nombre: true }
        },
        items: {
          include: {
            producto: {
              select: { nombre: true }
            },
            servicio: {
              select: { nombre: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 15
    });

    // Métricas de actividad en tiempo real
    const [
      ventasUltimos30Min,
      ventasUltimaHora,
      ventasHoy,
      usuariosActivos,
      productosVendidosHoy,
      ventasDelDia // Reemplazamos la consulta SQL raw
    ] = await Promise.all([
      // Ventas últimos 30 minutos
      db.venta.count({
        where: {
          empresaId,
          createdAt: { gte: hace30Min },
          estado: 'COMPLETADA'
        }
      }),
      
      // Ventas última hora
      db.venta.count({
        where: {
          empresaId,
          createdAt: { gte: hace1Hora },
          estado: 'COMPLETADA'
        }
      }),
      
      // Ventas del día
      db.venta.count({
        where: {
          empresaId,
          createdAt: { gte: inicioHoy },
          estado: 'COMPLETADA'
        }
      }),
      
      // Usuarios que han hecho ventas hoy
      db.venta.findMany({
        where: {
          empresaId,
          createdAt: { gte: inicioHoy },
          estado: 'COMPLETADA'
        },
        select: {
          usuarioId: true
        },
        distinct: ['usuarioId']
      }),
      
      // Productos más vendidos hoy
      db.itemVenta.groupBy({
        by: ['productoId'],
        where: {
          venta: {
            empresaId,
            createdAt: { gte: inicioHoy },
            estado: 'COMPLETADA'
          },
          productoId: { not: null }
        },
        _sum: {
          cantidad: true
        },
        orderBy: {
          _sum: {
            cantidad: 'desc'
          }
        },
        take: 5
      }),
      
      // Obtener todas las ventas del día para procesar por hora
      db.venta.findMany({
        where: {
          empresaId,
          createdAt: { gte: inicioHoy },
          estado: 'COMPLETADA'
        },
        select: {
          createdAt: true,
          total: true
        }
      })
    ]);

    // Procesar los datos para agrupar por hora
    const ingresosPorHora = Array.from({ length: 24 }, (_, hora) => ({
      hora,
      ventas: 0,
      ingresos: 0
    }));

    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasDelDia.forEach(venta => {
      const hora = venta.createdAt.getHours();
      ingresosPorHora[hora].ventas += 1;
      ingresosPorHora[hora].ingresos += Number(venta.total);
    });

    // Filtrar solo las horas que tienen datos
    const ingresosPorHoraConDatos = ingresosPorHora
      .filter(hora => hora.ventas > 0)
      .sort((a, b) => a.hora - b.hora);

    // Calcular tendencias de manera más robusta
    const ventasAnterior30Min = ventasUltimaHora - ventasUltimos30Min;
    const tendenciaVentas = ventasAnterior30Min > 0 
      ? ((ventasUltimos30Min - ventasAnterior30Min) / ventasAnterior30Min) * 100
      : ventasUltimos30Min > 0 ? 100 : 0;

    // Productos con stock bajo
    const productosStockBajo = await db.producto.findMany({
      where: {
        empresaId,
        AND: [
          {
            enStock: {
              lte: db.producto.fields.stockMinimo
            }
          }
        ],
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        enStock: true,
        stockMinimo: true
      },
      take: 10
    });

    // Alertas del sistema mejoradas
    const alertas = [];
    
    if (productosStockBajo.length > 0) {
      alertas.push({
        id: 'stock-bajo-' + Date.now(),
        tipo: productosStockBajo.length > 5 ? 'critica' : 'advertencia',
        titulo: 'Stock bajo detectado',
        descripcion: `${productosStockBajo.length} producto${productosStockBajo.length > 1 ? 's' : ''} con stock bajo`,
        timestamp: now.toISOString(),
        datos: productosStockBajo
      });
    }

    if (ventasUltimos30Min === 0 && now.getHours() >= 9 && now.getHours() <= 20) {
      alertas.push({
        id: 'sin-ventas-' + Date.now(),
        tipo: 'info',
        titulo: 'Sin actividad reciente',
        descripcion: 'No hay ventas registradas en los últimos 30 minutos',
        timestamp: now.toISOString()
      });
    }

    // Alerta por baja tendencia
    if (tendenciaVentas < -20 && ventasUltimos30Min > 0) {
      alertas.push({
        id: 'tendencia-baja-' + Date.now(),
        tipo: 'advertencia',
        titulo: 'Tendencia de ventas decreciente',
        descripcion: `Las ventas han disminuido ${Math.abs(tendenciaVentas).toFixed(1)}% en los últimos 30 minutos`,
        timestamp: now.toISOString()
      });
    }

    // Formatear ventas recientes para el frontend
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const ventasFormateadas = ventasRecientes.map(venta => ({
      id: venta.id,
      total: Number(venta.total),
      fecha: venta.createdAt.toISOString(),
      usuario: venta.usuario?.nombre || 'Usuario',
      cliente: venta.cliente?.nombre || 'Cliente general',
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productos: venta.items?.map(item => ({
        nombre: item.producto?.nombre || item.servicio?.nombre || 'Item',
        cantidad: Number(item.cantidad),
        precio: Number(item.precio)
      })) || [],
      metodoPago: venta.metodoPago,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      tipo: venta.items?.some(item => item.servicioId) ? 'mixta' as const : 'producto' as const
    }));

    // Respuesta estructurada
    const response = {
      timestamp: now.toISOString(),
      metricas: {
        ventasUltimos30Min,
        ventasUltimaHora,
        ventasHoy,
        usuariosActivos: usuariosActivos.length,
        tendenciaVentas: Math.round(tendenciaVentas * 100) / 100,
        ingresosPorHora: ingresosPorHoraConDatos // Usando los datos procesados
      },
      ventasRecientes: ventasFormateadas,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productosTop: productosVendidosHoy.map(item => ({
        productoId: item.productoId,
        _sum: {
          cantidad: Number(item._sum.cantidad || 0)
        }
      })),
      estadoSistema: {
        conectado: true,
        ultimaActualizacion: now.toISOString(),
        rendimiento: Math.min(100, Math.max(0, 100 - (ventasUltimos30Min === 0 ? 10 : 0) - (productosStockBajo.length * 2)))
      },
      alertas: alertas
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error en API tiempo real:', error);
    
    // Respuesta de error más detallada
    const errorResponse = {
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Endpoint para actualizaciones por Server-Sent Events y acciones POST
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { accion, datos } = body;

    // Manejar diferentes acciones en tiempo real
    switch (accion) {
      case 'registrar_actividad':
        // Registrar actividad del usuario
        await db.actividadUsuario.create({
          data: {
            usuarioId: session.user.id,
            empresaId: session.user.empresaId,
            accion: datos.accion || 'actividad_desconocida',
            detalles: datos.detalles || {},
            timestamp: new Date(),
            userAgent: request.headers.get('user-agent') || 'unknown'
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Actividad registrada correctamente',
          timestamp: new Date().toISOString()
        });
        
      case 'actualizar_estado':
        // Actualizar estado del sistema
        // Implementar lógica según necesidades específicas
        return NextResponse.json({ 
          success: true, 
          message: 'Estado actualizado correctamente',
          timestamp: new Date().toISOString()
        });
        
      case 'configurar_notificaciones':
        // Guardar configuración de notificaciones del usuario
        // Esto podría guardarse en la base de datos o en la sesión
        return NextResponse.json({ 
          success: true, 
          message: 'Notificaciones configuradas correctamente',
          configuracion: datos,
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({ 
          error: 'Acción no válida',
          accionesValidas: ['registrar_actividad', 'actualizar_estado', 'configurar_notificaciones']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en POST tiempo real:', error);
    
    return NextResponse.json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}