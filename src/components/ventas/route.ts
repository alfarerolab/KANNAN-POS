import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { EstadoPagoFiado } from "@prisma/client";

// GET - Obtener todas las ventas de la empresa actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    // Opciones de filtrado
    const clienteId = searchParams.get("clienteId");
    const usuarioId = searchParams.get("usuarioId");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const estado = searchParams.get("estado");
    const metodoPago = searchParams.get("metodoPago");

    // Filtro para ventas fiadas
    const soloFiadas = searchParams.get("soloFiadas") === "true";
    const estadoPago = searchParams.get("estadoPago"); // PENDIENTE, PAGO_PARCIAL, PAGADO, VENCIDO

    // Opciones de paginación
    const pagina = parseInt(searchParams.get("pagina") || "1");
    const limite = parseInt(searchParams.get("limite") || "20");
    const omitir = (pagina - 1) * limite;

    // Construir la consulta
    const whereClause: any = { empresaId };

    if (clienteId) {
      whereClause.clienteId = clienteId;
    }

    if (usuarioId) {
      whereClause.usuarioId = usuarioId;
    }

    if (fechaInicio || fechaFin) {
      whereClause.fechaCreacion = {};

      if (fechaInicio) {
        whereClause.fechaCreacion.gte = new Date(fechaInicio);
      }

      if (fechaFin) {
        whereClause.fechaCreacion.lte = new Date(fechaFin);
      }
    }

    if (estado) {
      whereClause.estado = estado;
    }

    if (metodoPago) {
      whereClause.metodoPago = metodoPago;
    }

    // Filtrar solo ventas fiadas
    if (soloFiadas) {
      whereClause.esVentaFiada = true;
    }

    // Filtrar por estado de pago (puede ser múltiple separado por comas)
    if (estadoPago) {
      const estados = estadoPago.split(',').map(e => e.trim());
      if (estados.length > 1) {
        whereClause.estadoPago = { in: estados };
      } else {
        whereClause.estadoPago = estadoPago;
      }
    }

    // Contar ventas para la paginación
    const totalVentas = await db.venta.count({
      where: whereClause,
    });

    // Obtener ventas con paginación
    const ventas = await db.venta.findMany({
      where: whereClause,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        // CORREGIDO: Usar pagosFiados en lugar de pagos
        pagosFiados: {
          orderBy: {
            fechaPago: "desc",
          },
        },
      },
      orderBy: {
        fechaCreacion: "desc",
      },
      skip: omitir,
      take: limite,
    });

    return NextResponse.json({
      datos: ventas,
      meta: {
        total: totalVentas,
        pagina,
        limite,
        totalPaginas: Math.ceil(totalVentas / limite),
      },
    });
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener ventas" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva venta
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id;
    const body = await request.json();
    const {
      items,
      clienteId,
      metodoPago,
      estado,
      impuesto,
      descuento,
      notas,
      // Campos para ventas fiadas
      montoPagado,
      metodoPagoInicial,
      diasCredito,
      fechaVencimiento,
    } = body;

    // Validación básica
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { mensaje: "La venta debe incluir al menos un producto" },
        { status: 400 }
      );
    }

    if (!metodoPago) {
      return NextResponse.json(
        { mensaje: "El método de pago es requerido" },
        { status: 400 }
      );
    }

    // Validaciones específicas para ventas fiadas
    if (metodoPago === "FIADO") {
      // Las ventas fiadas DEBEN tener un cliente asignado
      if (!clienteId) {
        return NextResponse.json(
          { mensaje: "Las ventas fiadas requieren un cliente asignado" },
          { status: 400 }
        );
      }

      // Validar que el cliente exista y esté activo
      const clienteActivo = await db.cliente.findFirst({
        where: {
          id: clienteId,
          empresaId,
        },
      });

      if (!clienteActivo) {
        return NextResponse.json(
          { mensaje: "Cliente no encontrado o inactivo" },
          { status: 400 }
        );
      }
    }

    // Verificar el cliente si se proporciona (para ventas normales)
    if (clienteId && metodoPago !== "FIADO") {
      const clienteExiste = await db.cliente.findFirst({
        where: {
          id: clienteId,
          empresaId,
        },
      });

      if (!clienteExiste) {
        return NextResponse.json(
          { mensaje: "Cliente no encontrado o no pertenece a su empresa" },
          { status: 400 }
        );
      }
    }

    // CORREGIDO: Tipo explícito para productosConDetalles
    interface ProductoConDetalle {
      productoId: string;
      cantidad: number;
      precio: any;
      subtotal: number;
      detalles: any;
    }

    const productosConDetalles: ProductoConDetalle[] = [];
    let subtotal = 0;

    for (const item of items) {
      const { productoId, cantidad } = item;

      if (!productoId || !cantidad || cantidad <= 0) {
        return NextResponse.json(
          { mensaje: "Cada ítem debe tener un ID de producto y una cantidad válida" },
          { status: 400 }
        );
      }

      // Obtener detalles del producto y verificar existencia y stock
      const producto = await db.producto.findFirst({
        where: {
          id: productoId,
          empresaId,
        },
      });

      if (!producto) {
        return NextResponse.json(
          { mensaje: `Producto ID ${productoId} no encontrado o no pertenece a su empresa` },
          { status: 400 }
        );
      }

      if (Number(producto.enStock) < cantidad) {
        return NextResponse.json(
          {
            mensaje: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.enStock}, Solicitado: ${cantidad}`
          },
          { status: 400 }
        );
      }

      const precioItem = producto.precio;
      const subtotalItem = Number(precioItem) * cantidad;

      productosConDetalles.push({
        productoId,
        cantidad,
        precio: precioItem,
        subtotal: subtotalItem,
        detalles: producto,
      });

      subtotal += subtotalItem;
    }

    // Calcular importes
    const impuestoNumerico = impuesto ? Number(impuesto) : 0;
    const descuentoNumerico = descuento ? Number(descuento) : 0;
    const total = subtotal + impuestoNumerico - descuentoNumerico;

    // Crear la venta en una transacción
    const nuevaVenta = await db.$transaction(async (prisma) => {
      // Determinar si es venta fiada
      const esVentaFiada = metodoPago === "FIADO";

      // Calcular campos de venta fiada
      let saldoPendiente: number | null = null;
      let montoPagadoVenta = 0;
      let estadoPagoVenta: EstadoPagoFiado | undefined = undefined;
      let fechaVencimientoVenta: Date | null = null;
      let diasCreditoVenta: number | null = null;

      if (esVentaFiada) {
        // Si hay un pago inicial en el body (opcional)
        const pagoInicial = montoPagado ? Number(montoPagado) : 0;
        montoPagadoVenta = pagoInicial;
        saldoPendiente = total - pagoInicial;

        // Determinar estado de pago - CORREGIDO: usar enum
        if (saldoPendiente <= 0) {
          estadoPagoVenta = EstadoPagoFiado.PAGADO;
        } else if (montoPagadoVenta > 0) {
          estadoPagoVenta = EstadoPagoFiado.PAGO_PARCIAL;
        } else {
          estadoPagoVenta = EstadoPagoFiado.PENDIENTE;
        }

        // Calcular fecha de vencimiento
        if (diasCredito) {
          diasCreditoVenta = Number(diasCredito);
          fechaVencimientoVenta = new Date();
          fechaVencimientoVenta.setDate(fechaVencimientoVenta.getDate() + diasCreditoVenta);
        } else if (fechaVencimiento) {
          fechaVencimientoVenta = new Date(fechaVencimiento);
          // Calcular días de crédito desde hoy hasta la fecha de vencimiento
          const hoy = new Date();
          const diffTime = fechaVencimientoVenta.getTime() - hoy.getTime();
          diasCreditoVenta = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else {
          // Por defecto, 30 días de crédito
          diasCreditoVenta = 30;
          fechaVencimientoVenta = new Date();
          fechaVencimientoVenta.setDate(fechaVencimientoVenta.getDate() + 30);
        }
      }

      // 1. Crear la venta
      const venta = await prisma.venta.create({
        data: {
          total,
          subtotal,
          impuesto: impuestoNumerico,
          descuento: descuentoNumerico,
          metodoPago,
          estado: estado || "COMPLETADA",
          empresaId,
          usuarioId,
          clienteId,
          notas,
          esVentaFiada,
          ...(esVentaFiada && {
            saldoPendiente,
            montoPagado: montoPagadoVenta,
            estadoPago: estadoPagoVenta,
            fechaVencimiento: fechaVencimientoVenta,
            diasCredito: diasCreditoVenta,
          }),
        },
      });

      // 2. Crear los items de la venta
      for (const item of productosConDetalles) {
        await prisma.itemVenta.create({
          data: {
            ventaId: venta.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio: item.precio,
            subtotal: item.subtotal,
          },
        });

        // 3. Actualizar el stock de cada producto
        await prisma.producto.update({
          where: { id: item.productoId },
          data: { enStock: { decrement: item.cantidad } },
        });
      }

      // 4. Si es venta fiada y hay pago inicial, registrarlo
      if (esVentaFiada && montoPagadoVenta > 0) {
        await prisma.pagoVentaFiada.create({
          data: {
            ventaId: venta.id,
            monto: montoPagadoVenta,
            metodoPago: metodoPagoInicial || "EFECTIVO",
            notas: "Pago inicial al momento de la venta",
            usuarioId,
          },
        });
      }

      // 5. Crear recordatorios automáticos si es venta fiada
      if (esVentaFiada && fechaVencimientoVenta) {
        // Recordatorio 3 días antes del vencimiento
        const fecha3DiasAntes = new Date(fechaVencimientoVenta);
        fecha3DiasAntes.setDate(fecha3DiasAntes.getDate() - 3);

        if (fecha3DiasAntes > new Date()) {
          await prisma.recordatorioVentaFiada.create({
            data: {
              ventaId: venta.id,
              tipo: "PROXIMO_VENCIMIENTO",
              mensaje: `La venta ${venta.id.substring(0, 8)} vence en 3 días. Saldo: $${saldoPendiente?.toFixed(2)}`,
              fechaRecordatorio: fecha3DiasAntes,
              enviado: false,
            },
          });
        }

        // Recordatorio el día del vencimiento
        await prisma.recordatorioVentaFiada.create({
          data: {
            ventaId: venta.id,
            tipo: "DIA_VENCIMIENTO",
            mensaje: `La venta ${venta.id.substring(0, 8)} vence hoy. Saldo: $${saldoPendiente?.toFixed(2)}`,
            fechaRecordatorio: fechaVencimientoVenta,
            enviado: false,
          },
        });
      }

      return venta;
    });

    // Obtener la venta completa con todos sus detalles
    const ventaCompleta = await db.venta.findUnique({
      where: { id: nuevaVenta.id },
      include: {
        items: {
          include: {
            producto: true,
          },
        },
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
          },
        },
        // Usar pagosFiados
        pagosFiados: {
          orderBy: {
            fechaPago: "desc",
          },
        },
      },
    });

    return NextResponse.json(ventaCompleta, { status: 201 });
  } catch (error) {
    console.error("Error al crear venta:", error);
    return NextResponse.json(
      { mensaje: "Error al crear venta" },
      { status: 500 }
    );
  }
}
