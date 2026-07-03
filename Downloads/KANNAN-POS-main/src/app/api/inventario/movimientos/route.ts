// src/app/api/productos/movimientos/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todos los movimientos de inventario de la empresa
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const productoId = searchParams.get("productoId");
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const limite = parseInt(searchParams.get("limite") || "50");
    const offset = (pagina - 1) * limite;

    // Construir filtros
    const whereClause: any = {
      producto: {
        empresaId: session.user.empresaId
      }
    };

    // Filtro por tipo de movimiento
    if (tipo && tipo !== "TODOS") {
      whereClause.tipo = tipo;
    }

    // Filtro por producto específico
    if (productoId) {
      whereClause.productoId = productoId;
    }

    // Filtros de fecha
    if (fechaInicio || fechaFin) {
      whereClause.fechaMovimiento = {};
      
      if (fechaInicio) {
        whereClause.fechaMovimiento.gte = new Date(fechaInicio + "T00:00:00.000Z");
      }
      
      if (fechaFin) {
        whereClause.fechaMovimiento.lte = new Date(fechaFin + "T23:59:59.999Z");
      }
    }

    // Obtener movimientos con paginación
    const [movimientos, total] = await Promise.all([
      db.movimientoInventario.findMany({
        where: whereClause,
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              codigoBarras: true,
              categoria: {
                select: {
                  nombre: true
                }
              }
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        },
        orderBy: {
          fechaMovimiento: "desc"
        },
        skip: offset,
        take: limite
      }),

      db.movimientoInventario.count({
        where: whereClause
      })
    ]);

    // Transformar datos para el frontend
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const movimientosTransformados = movimientos.map(mov => ({
      id: mov.id,
      fechaMovimiento: mov.fechaMovimiento.toISOString(),
      productoId: mov.productoId,
      usuarioId: mov.usuarioId,
      cantidad: mov.cantidad,
      tipo: mov.tipo,
      stockPrevio: mov.stockPrevio, 
      stockNuevo: mov.stockNuevo, 
      motivo: mov.motivo,
      producto: {
        id: mov.producto.id,
        nombre: mov.producto.nombre,
        sku: mov.producto.sku,
        codigoBarras: mov.producto.codigoBarras,
        categoria: mov.producto.categoria?.nombre
      },
      usuario: {
        id: mov.usuario.id,
        nombre: mov.usuario.nombre
      }
    }));

    return NextResponse.json({
      movimientos: movimientosTransformados,
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite)
      }
    });

  } catch (error) {
    console.error("Error al obtener movimientos:", error);
    return NextResponse.json(
      { message: "Error al obtener movimientos de inventario" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId || !session?.user?.id) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { productoId, cantidad, tipo, motivo } = body;

    // Validaciones
    if (!productoId || !cantidad || !tipo) {
      return NextResponse.json(
        { message: "Producto, cantidad y tipo son requeridos" },
        { status: 400 }
      );
    }

    if (!["ENTRADA", "SALIDA", "AJUSTE"].includes(tipo)) {
      return NextResponse.json(
        { message: "Tipo de movimiento inválido" },
        { status: 400 }
      );
    }

    const cantidadNumerica = parseInt(cantidad);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
      return NextResponse.json(
        { message: "La cantidad debe ser un número positivo" },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y pertenece a la empresa
    const producto = await db.producto.findFirst({
      where: {
        id: productoId,
        empresaId: session.user.empresaId
      }
    });

    if (!producto) {
      return NextResponse.json(
        { message: "Producto no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    // Obtener stock actual como número
    const stockActualNumero = producto.enStock.toNumber();
    
    // Calcular nuevo stock
    let nuevoStockNumero: number;
    
    if (tipo === "ENTRADA") {
      nuevoStockNumero = stockActualNumero + cantidadNumerica;
    } else if (tipo === "SALIDA") {
      nuevoStockNumero = stockActualNumero - cantidadNumerica;
      if (nuevoStockNumero < 0) {
        return NextResponse.json(
          { message: "Stock insuficiente para realizar la salida" },
          { status: 400 }
        );
      }
    } else if (tipo === "AJUSTE") {
      nuevoStockNumero = cantidadNumerica;
    } else {
      return NextResponse.json(
        { message: "Tipo de movimiento inválido" },
        { status: 400 }
      );
    }

    // Convertir a Decimal para Prisma
    const nuevoStock = new Decimal(nuevoStockNumero);
    const stockPrevioDecimal = new Decimal(stockActualNumero);
    const cantidadDecimal = new Decimal(cantidadNumerica);

    // Usar transacción para actualizar stock y crear movimiento
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const resultado = await db.$transaction(async (tx) => {
      // Actualizar stock del producto
      const productoActualizado = await tx.producto.update({
        where: { id: productoId },
        data: { 
          enStock: nuevoStock,
          updatedAt: new Date()
        }
      });

      // Calcular la cantidad del movimiento según el tipo
      let cantidadMovimiento: Decimal;
      if (tipo === "AJUSTE") {
        cantidadMovimiento = cantidadDecimal;
      } else if (tipo === "ENTRADA") {
        cantidadMovimiento = cantidadDecimal;
      } else { // SALIDA
        cantidadMovimiento = cantidadDecimal.neg(); // Cantidad negativa para salidas
      }

      // Crear el movimiento
      const movimiento = await tx.movimientoInventario.create({
        data: {
          productoId,
          usuarioId: session.user.id,
          cantidad: cantidadMovimiento.toNumber(),
          tipo,
          stockPrevio: stockPrevioDecimal.toNumber(),
          stockNuevo: nuevoStock.toNumber(),
          motivo: motivo || `${tipo} manual desde inventario`,
          fechaMovimiento: new Date()
        },
        include: {
          producto: {
            select: {
              id: true,
              nombre: true,
              sku: true,
              codigoBarras: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true
            }
          }
        }
      });

      return { movimiento, productoActualizado };
    });

    // Convertir los valores Decimal a number para la respuesta JSON
    const movimientoRespuesta = {
      ...resultado.movimiento,
      cantidad: resultado.movimiento.cantidad,
      stockPrevio: resultado.movimiento.stockPrevio,
      stockNuevo: resultado.movimiento.stockNuevo
    };

    const productoRespuesta = {
      ...resultado.productoActualizado,
      enStock: resultado.productoActualizado.enStock.toNumber(),
      precio: resultado.productoActualizado.precio.toNumber(),
      stockMinimo: resultado.productoActualizado.stockMinimo.toNumber()
    };

    return NextResponse.json({
      message: "Movimiento registrado exitosamente",
      movimiento: movimientoRespuesta,
      producto: productoRespuesta
    }, { status: 201 });

  } catch (error) {
    console.error("Error al crear movimiento:", error);
    return NextResponse.json(
      { message: "Error al registrar el movimiento" },
      { status: 500 }
    );
  }
}