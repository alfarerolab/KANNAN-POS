// src/app/api/inventario/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Obtener todos los productos activos con información de inventario
    const productos = await db.producto.findMany({
      where: {
        empresaId,
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        sku: true,
        codigoBarras: true,
        enStock: true,
        stockMinimo: true,
        precio: true,
        precioCosto: true,
        updatedAt: true,
        categoria: {
          select: {
            nombre: true
          }
        },
        movimientosInventario: {
          orderBy: {
            fechaMovimiento: 'desc'
          },
          take: 1,
          select: {
            fechaMovimiento: true
          }
        }
      }
    });

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    // Obtener ventas de los últimos 30 días para calcular velocidad
    const ventasRecientes = await db.itemVenta.findMany({
      where: {
        venta: { empresaId },
        productoId: { not: null },
        createdAt: { gte: hace30Dias }
      },
      select: {
        productoId: true,
        cantidad: true,
        peso: true,
        medida: true
      }
    });

    // Agrupar ventas por producto
    const ventasPorProducto = (ventasRecientes as any[]).reduce((acc: Record<string, number>, item: any) => {
       if (!item.productoId) return acc;
       const cant = Number(item.cantidad || 0) + Number(item.peso || 0) + Number(item.medida || 0);
       acc[item.productoId] = (acc[item.productoId] || 0) + cant;
       return acc;
    }, {} as Record<string, number>);

    // Transformar y calcular estadísticas
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const inventario = productos.map(producto => {
      const stock = Number(producto.enStock);
      const stockMinimo = Number(producto.stockMinimo);
      
      let estado: "normal" | "bajo" | "agotado" | "riesgo" = "normal";
      if (stock === 0) {
        estado = "agotado";
      } else if (stock <= stockMinimo) {
        estado = "bajo";
      }

      const velocidadVentas30d = ventasPorProducto[producto.id] || 0;
      const promedioDiario = velocidadVentas30d / 30;
      
      let diasParaAgotarse: number | null = null;
      if (promedioDiario > 0 && stock > 0) {
        diasParaAgotarse = Math.ceil(stock / promedioDiario);
        if (estado === "normal" && diasParaAgotarse <= 7) {
          estado = "riesgo";
        }
      }

      return {
        id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre || "Sin categoría",
        stock,
        stockMinimo,
        precio: Number(producto.precio),
        precioCosto: Number(producto.precioCosto ?? 0),
        ultimaActualizacion: producto.movimientosInventario[0]?.fechaMovimiento?.toISOString() 
                            || producto.updatedAt.toISOString(),
        estado,
        sku: producto.sku,
        codigoBarras: producto.codigoBarras,
        valorInventario: stock * Number(producto.precioCosto ?? 0),
        gananciaUnitaria: Number(producto.precio ?? 0) - Number(producto.precioCosto ?? 0),
        gananciaTotal: stock * (Number(producto.precio ?? 0) - Number(producto.precioCosto ?? 0)),
        valorVenta: stock * Number(producto.precio ?? 0),
        velocidadVentas30d,
        promedioDiario,
        diasParaAgotarse
      };
    });

    // Calcular estadísticas generales
    const estadisticas = {
      totalProductos: inventario.length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productosConStockBajo: inventario.filter(p => p.estado === "bajo").length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productosAgotados: inventario.filter(p => p.estado === "agotado").length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productosEnRiesgo: inventario.filter(p => p.estado === "riesgo").length,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      valorTotalInventario: inventario.reduce((total: number, p) => total + p.valorInventario, 0),
      // @ts-expect-error Autofix Next15 o tipos implícitos
      valorTotalVenta: inventario.reduce((total: number, p) => total + p.valorVenta, 0),
      // @ts-expect-error Autofix Next15 o cooling tipos implícitos
      gananciaTotal: inventario.reduce((total: number, p) => total + p.gananciaTotal, 0),
      // @ts-expect-error Autofix Next15 o tipos implícitos
      productosNormales: inventario.filter(p => p.estado === "normal").length
    };

    // Obtener movimientos recientes para dashboard
    const movimientosRecientes = await db.movimientoInventario.findMany({
      where: {
        producto: {
          empresaId
        }
      },
      include: {
        producto: {
          select: {
            nombre: true,
            sku: true
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: {
        fechaMovimiento: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      inventario,
      estadisticas,
      // @ts-expect-error Autofix Next15 o tipos implícitos
      movimientosRecientes: movimientosRecientes.map(mov => ({
        id: mov.id,
        fechaMovimiento: mov.fechaMovimiento.toISOString(),
        producto: mov.producto.nombre,
        sku: mov.producto.sku,
        tipo: mov.tipo,
        cantidad: mov.cantidad,
        stockAnterior: mov.stockPrevio,
        stockNuevo: mov.stockNuevo,
        usuario: mov.usuario.nombre
      }))
    });

  } catch (error) {
    console.error("Error al obtener inventario:", error);
    return NextResponse.json(
      { message: "Error al obtener información del inventario" },
      { status: 500 }
    );
  }
}