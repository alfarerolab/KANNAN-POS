import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { MetodoPago } from "../../../../lib/prisma-types";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    // Obtener token del usuario
    const token = await getToken({ req });

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuarioId = token.id as string;
    const empresaId = token.empresaId as string;

    // Obtener datos de la venta del cuerpo de la solicitud
    const datos = await req.json();

    const {
      items,
      clienteId,
      metodoPago, // Para pagos únicos
      notas,
      subtotal,
      impuesto,
      descuento,
      total,
      pagosMultiples, // Flag para indicar si usa pagos múltiples
      pagos, // Array de pagos múltiples
      consumosInternos, // Array de { productoId, cantidad } para consumo interno por servicio
      comandaId // ID de la comanda para cerrarla
    } = datos;

    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "La venta debe contener al menos un producto o servicio" },
        { status: 400 }
      );
    }

    // Validar pagos
    if (pagosMultiples) {
      // Validar pagos múltiples
      if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        return NextResponse.json(
          { error: "Debe incluir al menos un pago" },
          { status: 400 }
        );
      }

      // Validar que cada pago tenga método y monto válidos
      for (const pago of pagos) {
        if (!pago.metodoPago || !Object.values(MetodoPago).includes(pago.metodoPago)) {
          return NextResponse.json(
            { error: `Método de pago inválido: ${pago.metodoPago}` },
            { status: 400 }
          );
        }
        if (!pago.monto || pago.monto <= 0) {
          return NextResponse.json(
            { error: "Todos los pagos deben tener un monto válido mayor a 0" },
            { status: 400 }
          );
        }
      }

      // Validar que la suma de pagos coincida con el total
      const totalPagos = pagos.reduce((sum: number, pago: any) => sum + parseFloat(pago.monto), 0);
      const diferencia = Math.abs(totalPagos - total);

      if (diferencia > 0.01) { // Tolerancia de 1 centavo
        return NextResponse.json(
          { error: `La suma de los pagos (${totalPagos}) no coincide con el total de la venta (${total})` },
          { status: 400 }
        );
      }
    } else {
      // Validar pago único
      if (!metodoPago || !Object.values(MetodoPago).includes(metodoPago)) {
        return NextResponse.json(
          { error: "El método de pago no es válido" },
          { status: 400 }
        );
      }
    }

    // ✅ Validación: Cliente obligatorio para ventas FIADAS
    const tienePagoFiado = pagosMultiples
      ? pagos.some((pago: any) => pago.metodoPago === "FIADO")
      : metodoPago === "FIADO";

    if (tienePagoFiado && !clienteId) {
      return NextResponse.json(
        { error: "Debe seleccionar un cliente para ventas con pago FIADO" },
        { status: 400 }
      );
    }

    // Separar productos y servicios
    const productosIds = items
      .filter(item => !item.producto.esServicio)
      .map(item => item.producto.id);

    const serviciosIds = items
      .filter(item => item.producto.esServicio)
      .map(item => item.producto.servicioId || item.producto.id);

    // Validar productos (incluir datos de combo y componentes)
    const productosValidos = await db.producto.findMany({
      where: {
        id: { in: productosIds },
        empresaId
      },
      include: {
        componentes: {
          select: {
            componenteId: true,
            cantidad: true,
            componente: {
              select: {
                id: true,
                nombre: true,
                enStock: true,
              },
            },
          },
        },
      },
    });

    // Validar servicios
    const serviciosValidos = await db.servicio.findMany({
      where: {
        id: { in: serviciosIds },
        empresaId
      }
    });

    if (
      productosValidos.length !== productosIds.length ||
      serviciosValidos.length !== serviciosIds.length
    ) {
      return NextResponse.json(
        { error: "Uno o más productos o servicios no son válidos o no pertenecen a esta empresa" },
        { status: 400 }
      );
    }

    // Mapas para acceso rápido
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const productosMap = Object.fromEntries(productosValidos.map(p => [p.id, p]));
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const serviciosMap = Object.fromEntries(serviciosValidos.map(s => [s.id, s]));

    // ─── Resolver stock: expandir combos a componentes ──────────────────────
    // Calcular cantidades reales a descontar (expandiendo combos a componentes)
    const cantidadesPorProducto = new Map<string, number>();

    for (const item of items) {
      if (item.producto.esServicio) continue;

      const producto = productosMap[item.producto.id];
      if (!producto) {
        return NextResponse.json(
          { error: `Producto con ID ${item.producto.id} no encontrado` },
          { status: 400 }
        );
      }

      if (producto.esCombo && producto.componentes && producto.componentes.length > 0) {
        // Combo: acumular cada componente × cantidad del item
        for (const comp of producto.componentes) {
          const cantidadTotal = comp.cantidad * item.cantidad;
          cantidadesPorProducto.set(
            comp.componenteId,
            (cantidadesPorProducto.get(comp.componenteId) ?? 0) + cantidadTotal
          );
        }
      } else {
        // Producto normal: acumular directamente
        if (producto.tipoVenta === "PESO" && item.peso) {
          const pesoActual = cantidadesPorProducto.get(item.producto.id) ?? 0;
          cantidadesPorProducto.set(item.producto.id, pesoActual + parseFloat(item.peso));
        } else {
          cantidadesPorProducto.set(
            item.producto.id,
            (cantidadesPorProducto.get(item.producto.id) ?? 0) + item.cantidad
          );
        }
      }
    }

    // Obtener todos los productos que realmente necesitan descontarse (incluye componentes de combos)
    const idsADescontar = Array.from(cantidadesPorProducto.keys());
    const productosADescontar = idsADescontar.length > 0
      ? await db.producto.findMany({
          where: { id: { in: idsADescontar }, empresaId },
          select: { id: true, nombre: true, enStock: true, tipoVenta: true },
        })
      : [];

    // Verificar stock de cada producto/componente
    for (const producto of productosADescontar) {
      const cantidadSolicitada = cantidadesPorProducto.get(producto.id) ?? 0;
      const stockDisponible = new Decimal(producto.enStock);

      if (stockDisponible.lessThan(cantidadSolicitada)) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible.toNumber()}, Solicitado: ${cantidadSolicitada}`
          },
          { status: 400 }
        );
      }
    }

    // Si se especifica un cliente, validar que exista y pertenezca a la empresa
    if (clienteId) {
      const cliente = await db.cliente.findUnique({
        where: {
          id: clienteId,
          empresaId
        }
      });

      if (!cliente) {
        return NextResponse.json(
          { error: "El cliente seleccionado no es válido o no pertenece a esta empresa" },
          { status: 400 }
        );
      }
    }

    // Determinar si es venta fiada
    const esVentaFiada = pagosMultiples
      ? pagos.some((p: any) => p.metodoPago === "FIADO")
      : metodoPago === "FIADO";

    // Obtener datos de venta fiada si aplica
    const { diasCredito, fechaVencimiento: fechaVencimientoParam } = datos;

    // Crear la venta con una transacción
    // @ts-expect-error Autofix Next15 o tipos implícitos
    const venta = await db.$transaction(async (tx) => {
      // 1. Crear la venta
      const nuevaVenta = await tx.venta.create({
        data: {
          subtotal,
          impuesto,
          descuento,
          total,
          // Si es pago múltiple, usar "MIXTO" como método principal si incluye FIADO
          metodoPago: pagosMultiples
            ? (esVentaFiada ? "MIXTO" : "OTRO")
            : (metodoPago as MetodoPago),
          estado: "COMPLETADA",
          empresaId,
          usuarioId,
          clienteId: clienteId || null,
          notas: notas || null,
          // Campos para ventas fiadas
          esVentaFiada,
          ...(esVentaFiada && {
            saldoPendiente: total,
            montoPagado: 0,
            estadoPago: "PENDIENTE",
            diasCredito: diasCredito || 30,
            fechaVencimiento: fechaVencimientoParam
              ? new Date(fechaVencimientoParam)
              : new Date(Date.now() + (diasCredito || 30) * 24 * 60 * 60 * 1000)
          }),
          items: {
            create: items.map(item => {
              if (item.producto.esServicio) {
                return {
                  cantidad: new Decimal(item.cantidad),
                  precio: parseFloat(item.producto.precio),
                  subtotal: item.subtotal,
                  servicioId: item.producto.servicioId || item.producto.id,
                  empleadoId: item.empleadoId || item.producto.empleadoId || null
                };
              } else {
                // Para productos
                const itemData: any = {
                  cantidad: new Decimal(item.cantidad),
                  precio: parseFloat(item.producto.precio),
                  subtotal: item.subtotal,
                  productoId: item.producto.id,
                  empleadoId: item.empleadoId || item.producto.empleadoId || null
                };

                // Agregar peso si es producto por peso
                if (item.peso) {
                  itemData.peso = new Decimal(item.peso);
                  itemData.unidadMedida = item.unidadMedida || 'kg';
                }

                // Agregar medida si tiene
                if (item.medida) {
                  itemData.medida = new Decimal(item.medida);
                  itemData.unidadMedida = item.unidadMedida;
                }

                // Agregar precio libre si aplica
                if (item.precioLibre) {
                  itemData.precio = parseFloat(item.precioLibre.toString());
                  itemData.subtotal = parseFloat(item.precioLibre.toString());
                }

                return itemData;
              }
            })
          }
        }
      });

      // 2. Si es pago múltiple, crear los registros de pagos
      if (pagosMultiples && pagos && pagos.length > 0) {
        for (const pago of pagos) {
          await tx.pagoVenta.create({
            data: {
              ventaId: nuevaVenta.id,
              metodoPago: pago.metodoPago as MetodoPago,
              monto: new Decimal(pago.monto),
              referencia: pago.referencia || null,
              notas: null
            }
          });

        }
      }

      // 3. Descontar stock (expandido con componentes de combos)
      // Re-obtener stock fresco dentro de la transacción
      const productosParaDescontar = idsADescontar.length > 0
        ? await tx.producto.findMany({
            where: { id: { in: idsADescontar }, empresaId },
            select: { id: true, nombre: true, enStock: true, tipoVenta: true },
          })
        : [];

      for (const producto of productosParaDescontar) {
        const cantidadVendida = cantidadesPorProducto.get(producto.id) ?? 0;
        const stockActual = new Decimal(producto.enStock);
        const nuevoStock = stockActual.minus(cantidadVendida);

        await tx.producto.update({
          where: { id: producto.id },
          data: { enStock: nuevoStock },
        });

        await tx.movimientoInventario.create({
          data: {
            productoId: producto.id,
            usuarioId,
            cantidad: -cantidadVendida,
            tipo: 'SALIDA',
            stockPrevio: stockActual.toNumber(),
            stockNuevo: nuevoStock.toNumber(),
            motivo: `Venta POS ${nuevaVenta.id}`,
            fechaMovimiento: new Date(),
          },
        });
      }

      // 4. Actualizar estado de citas vinculadas a servicios vendidos
      const serviciosVendidos = items.filter(item => item.producto.esServicio);

      for (const item of serviciosVendidos) {
        const citaId = item.citaId;

        if (citaId) {
          await tx.cita.updateMany({
            where: {
              id: citaId,
              empresaId,
              estado: { in: ['COMPLETADA', 'EN_PROCESO'] }
            },
            data: {
              ventaId: nuevaVenta.id,
              estado: 'FACTURADA'
            }
          });

        } else if (clienteId) {
          const servicioId = item.producto.servicioId || item.producto.id;

          await tx.cita.updateMany({
            where: {
              clienteId,
              servicioId,
              empresaId,
              estado: { in: ['COMPLETADA', 'EN_PROCESO'] },
              ventaId: null
            },
            data: {
              ventaId: nuevaVenta.id,
              estado: 'FACTURADA'
            }
          });

        }
      }

      // 5. Procesar consumos internos de inventario (peluquería)
      if (consumosInternos && Array.isArray(consumosInternos) && consumosInternos.length > 0) {
        for (const consumo of consumosInternos) {
          const { productoId, cantidad } = consumo;
          if (!productoId || !cantidad || cantidad <= 0) continue;

          // Verificar que el producto pertenece a la empresa
          const productoConsumo = await tx.producto.findFirst({
            where: { id: productoId, empresaId },
            select: { id: true, nombre: true, enStock: true },
          });

          if (!productoConsumo) continue;

          const stockActual = new Decimal(productoConsumo.enStock);
          const nuevoStock = stockActual.minus(cantidad);

          // Descontar stock
          await tx.producto.update({
            where: { id: productoId },
            data: { enStock: nuevoStock.greaterThan(0) ? nuevoStock : new Decimal(0) },
          });

          // Registrar movimiento de inventario
          await tx.movimientoInventario.create({
            data: {
              productoId,
              usuarioId,
              cantidad: -cantidad,
              tipo: 'SALIDA',
              stockPrevio: stockActual.toNumber(),
              stockNuevo: nuevoStock.greaterThan(0) ? nuevoStock.toNumber() : 0,
              motivo: `Consumo interno servicio — Venta ${nuevaVenta.id}`,
              fechaMovimiento: new Date(),
            },
          });

          // Registrar en tabla ConsumoInventarioServicio
          try {
            await (tx as any).consumoInventarioServicio.create({
              data: {
                ventaId: nuevaVenta.id,
                productoId,
                cantidad: new Decimal(cantidad),
                empresaId,
              },
            });
          } catch {
            // Si la tabla aún no existe (migración pendiente), omitir silenciosamente
          }
        }
      }

      // 6. Cerrar Comanda si se proporcionó un comandaId
      if (comandaId) {
        await tx.comanda.update({
          where: { id: comandaId },
          data: {
            estado: 'CERRADA',
            ventaId: nuevaVenta.id
          }
        });
      }

      return nuevaVenta;
    });

    return NextResponse.json({
      id: venta.id,
      total: Number(venta.total),
      subtotal: Number(venta.subtotal),
      mensaje: pagosMultiples
        ? `Venta procesada correctamente con ${pagos.length} pagos`
        : "Venta procesada correctamente",
      createdAt: venta.createdAt
    });
  } catch (error) {
    console.error("Error al procesar la venta:", error);
    return NextResponse.json(
      { error: "Error al procesar la venta" },
      { status: 500 }
    );
  }
}
