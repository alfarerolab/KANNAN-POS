import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener detalles de una venta específica
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const ventaId = resolvedParams.id;

    const venta = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
      include: {
        items: {
          include: {
            producto: true,
            servicio: true,
            empleado: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    if (!venta) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(venta);
  } catch (error) {
    console.error("Error al obtener detalles de la venta:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener detalles de la venta" },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar una venta (método de pago, empleados por item, estado, etc.)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id;
    const ventaId = resolvedParams.id;
    const body = await request.json();
    const { estado, reciboImpreso, notas, metodoPago, items } = body;

    // Verificar que la venta exista y pertenezca a la empresa
    const ventaExistente = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
      include: {
        items: true,
      },
    });

    if (!ventaExistente) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Realizar todas las actualizaciones en una transacción
    const ventaActualizada = await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
      // 1. Si el estado cambia a CANCELADA o REEMBOLSADA, devolver los productos al inventario
      if (estado &&
          (estado === "CANCELADA" || estado === "REEMBOLSADA") &&
          ventaExistente.estado !== "CANCELADA" &&
          ventaExistente.estado !== "REEMBOLSADA") {

        // Obtener productos con datos de combo para expandir componentes
        const productoIds = ventaExistente.items
          .filter((item: any) => item.productoId)
          .map((item: any) => item.productoId as string);

        const productosConCombos = productoIds.length > 0
          ? await prisma.producto.findMany({
              where: { id: { in: productoIds } },
              select: {
                id: true,
                esCombo: true,
                componentes: {
                  select: {
                    componenteId: true,
                    cantidad: true,
                  },
                },
              },
            })
          : [];

        const productoMap = new Map(productosConCombos.map(p => [p.id, p]));

        // Calcular cantidades a devolver (expandiendo combos)
        const cantidadesADevolver = new Map<string, number>();

        for (const item of ventaExistente.items) {
          if (!item.productoId) continue;
          const prod = productoMap.get(item.productoId);

          if (prod && prod.esCombo && prod.componentes.length > 0) {
            // Combo: devolver a cada componente
            for (const comp of prod.componentes) {
              const cantidadTotal = comp.cantidad * Number(item.cantidad);
              cantidadesADevolver.set(
                comp.componenteId,
                (cantidadesADevolver.get(comp.componenteId) ?? 0) + cantidadTotal
              );
            }
          } else {
            // Producto normal
            cantidadesADevolver.set(
              item.productoId,
              (cantidadesADevolver.get(item.productoId) ?? 0) + Number(item.cantidad)
            );
          }
        }

        // Devolver stock a los productos correspondientes
        for (const [productoId, cantidad] of cantidadesADevolver.entries()) {
          await prisma.producto.update({
            where: { id: productoId },
            data: { enStock: { increment: cantidad } },
          });
        }
      }

      // 2. Construir objeto de datos para actualizar la Venta
      const datosActualizacion: any = {};

      if (estado !== undefined) datosActualizacion.estado = estado;
      if (reciboImpreso !== undefined) datosActualizacion.reciboImpreso = reciboImpreso;
      if (notas !== undefined) datosActualizacion.notas = notas;
      if (metodoPago !== undefined) {
        datosActualizacion.metodoPago = metodoPago;

        // Si el método de pago cambia y no es MIXTO, eliminamos los registros de PagoVenta asociados
        if (metodoPago !== "MIXTO") {
          await prisma.pagoVenta.deleteMany({
            where: { ventaId },
          });
        }
      }

      // Actualizar la venta
      await prisma.venta.update({
        where: { id: ventaId },
        data: datosActualizacion,
      });

      // 3. Actualizar los empleados asignados por item
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.id) {
            // Verificar pertenencia a esta venta
            const itemExistente = await prisma.itemVenta.findFirst({
              where: { id: item.id, ventaId },
            });

            if (itemExistente) {
              await prisma.itemVenta.update({
                where: { id: item.id },
                data: {
                  empleadoId: item.empleadoId || null,
                },
              });
            }
          }
        }
      }

      // 4. Crear registro en la tabla AuditoriaLog para trazabilidad
      const cambios: string[] = [];
      if (metodoPago !== undefined && metodoPago !== ventaExistente.metodoPago) {
        cambios.push(`Método pago: ${ventaExistente.metodoPago} -> ${metodoPago}`);
      }
      if (estado !== undefined && estado !== ventaExistente.estado) {
        cambios.push(`Estado: ${ventaExistente.estado} -> ${estado}`);
      }
      if (items && Array.isArray(items) && items.length > 0) {
        cambios.push(`Empleados de items actualizados (${items.length} items)`);
      }

      if (cambios.length > 0) {
        await prisma.auditoriaLog.create({
          data: {
            accion: "ACTUALIZAR",
            tabla: "venta",
            registroId: ventaId,
            datosAnteriores: JSON.stringify({
              metodoPago: ventaExistente.metodoPago,
              estado: ventaExistente.estado,
            }),
            datosNuevos: JSON.stringify({
              metodoPago: metodoPago ?? ventaExistente.metodoPago,
              estado: estado ?? ventaExistente.estado,
              detalleItems: items,
            }),
            notas: `Edición de venta: ${cambios.join(", ")}`,
            usuarioId,
            usuarioEmail: session.user.email ?? "",
            usuarioRol: session.user.role,
            empresaId,
          },
        });
      }

      // 5. Retornar la venta completamente hidratada
      return await prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: {
              producto: true,
              servicio: true,
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
          cliente: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          pagos: true,
        },
      });
    });

    return NextResponse.json(ventaActualizada);
  } catch (error) {
    console.error("Error al actualizar venta:", error);
    return NextResponse.json(
      { mensaje: "Error al actualizar venta" },
      { status: 500 }
    );
  }
}


// DELETE - Eliminar una venta (solo para ventas pendientes)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const ventaId = resolvedParams.id;

    // Verificar que la venta exista y pertenezca a la empresa
    const venta = await db.venta.findFirst({
      where: {
        id: ventaId,
        empresaId,
      },
      include: {
        items: true,
      },
    });

    if (!venta) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // Solo permitir eliminar ventas en estado PENDIENTE
    if (venta.estado !== "PENDIENTE") {
      return NextResponse.json(
        { mensaje: "Solo se pueden eliminar ventas en estado PENDIENTE" },
        { status: 400 }
      );
    }

    // Eliminar la venta y devolver productos al inventario en una transacción
    await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
      // Primero eliminar los items de la venta
      await prisma.itemVenta.deleteMany({
        where: {
          ventaId,
        },
      });

      // Luego eliminar la venta
      await prisma.venta.delete({
        where: {
          id: ventaId,
        },
      });

      // Devolver los productos al inventario (expandiendo combos a componentes)
      const productoIdsVenta = venta.items
        .filter((item: any) => item.productoId)
        .map((item: any) => item.productoId as string);

      const productosConCombos = productoIdsVenta.length > 0
        ? await prisma.producto.findMany({
            where: { id: { in: productoIdsVenta } },
            select: {
              id: true,
              esCombo: true,
              componentes: {
                select: {
                  componenteId: true,
                  cantidad: true,
                },
              },
            },
          })
        : [];

      const productoMap = new Map(productosConCombos.map(p => [p.id, p]));
      const cantidadesADevolver = new Map<string, number>();

      for (const item of venta.items) {
        if (!item.productoId) continue;
        const prod = productoMap.get(item.productoId);

        if (prod && prod.esCombo && prod.componentes.length > 0) {
          for (const comp of prod.componentes) {
            const cantidadTotal = comp.cantidad * Number(item.cantidad);
            cantidadesADevolver.set(
              comp.componenteId,
              (cantidadesADevolver.get(comp.componenteId) ?? 0) + cantidadTotal
            );
          }
        } else {
          cantidadesADevolver.set(
            item.productoId,
            (cantidadesADevolver.get(item.productoId) ?? 0) + Number(item.cantidad)
          );
        }
      }

      for (const [productoId, cantidad] of cantidadesADevolver.entries()) {
        await prisma.producto.update({
          where: { id: productoId },
          data: { enStock: { increment: cantidad } },
        });
      }
    });

    return NextResponse.json({
      mensaje: "Venta eliminada correctamente y productos devueltos al inventario",
    });
  } catch (error) {
    console.error("Error al eliminar venta:", error);
    return NextResponse.json(
      { mensaje: "Error al eliminar venta" },
      { status: 500 }
    );
  }
}
