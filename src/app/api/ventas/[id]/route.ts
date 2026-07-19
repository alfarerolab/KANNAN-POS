// Editado: Importado desde la versión de producción en la VPS
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
        pagos: {
          orderBy: { createdAt: 'asc' },
        },
        pagosFiados: {
          orderBy: { fechaPago: 'asc' },
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

// PATCH - Actualizar el estado de una venta (también soporta edición de metodoPago e items)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
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
        items: {
          include: {
            producto: true,
            servicio: true,
            empleado: true,
          },
        },
      },
    });

    if (!ventaExistente) {
      return NextResponse.json(
        { mensaje: "Venta no encontrada o no pertenece a su empresa" },
        { status: 404 }
      );
    }

    // ── Edición administrativa: metodoPago e items ──────────────────────────
    if (metodoPago !== undefined || (items && Array.isArray(items) && items.length > 0)) {
      const usuarioId = session.user.id;
      const cambios: string[] = [];

      const ventaActualizada = await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
        const dataVenta: Record<string, unknown> = {};

        // 1. Cambio de método de pago
        if (metodoPago !== undefined && metodoPago !== ventaExistente.metodoPago) {
          dataVenta.metodoPago = metodoPago;
          cambios.push(`Método pago: ${ventaExistente.metodoPago} -> ${metodoPago}`);

          // Si venía de MIXTO, limpiar registros PagoVenta parciales
          if (ventaExistente.metodoPago === "MIXTO") {
            await prisma.pagoVenta.deleteMany({ where: { ventaId } });
          }
        }

        if (Object.keys(dataVenta).length > 0) {
          await prisma.venta.update({ where: { id: ventaId }, data: dataVenta });
        }

        // 2. Actualizar empleado por ítem
        if (items && Array.isArray(items)) {
          // Obtener nombres de todos los usuarios (empleados) de la empresa para resolver nombres nuevos
          const usuariosEmpresa = await prisma.usuario.findMany({
            where: { empresaId },
            select: { id: true, nombre: true }
          });
          const usuariosMap = new Map(usuariosEmpresa.map(u => [u.id, u.nombre]));

          for (const item of items) {
            if (!item.id) continue;
            const itemExistente = ventaExistente.items.find((i: { id: string }) => i.id === item.id);
            if (!itemExistente) continue;

            const prevEmpleadoId = itemExistente.empleadoId;
            const nextEmpleadoId = item.empleadoId;

            if (prevEmpleadoId !== nextEmpleadoId) {
              await prisma.itemVenta.update({
                where: { id: item.id },
                data: { empleadoId: nextEmpleadoId ?? null },
              });

              const nombreItem = itemExistente.producto?.nombre || itemExistente.servicio?.nombre || "Producto/Servicio";
              const prevNombre = itemExistente.empleado?.nombre || "Sin asignar";
              const nextNombre = nextEmpleadoId ? (usuariosMap.get(nextEmpleadoId) || "Asignado") : "Sin asignar";

              cambios.push(`Item "${nombreItem}": de ${prevNombre} a ${nextNombre}`);
            }
          }
        }

        // 3. Registro en auditoría
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
                estado: ventaExistente.estado,
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

        // 4. Retornar venta completa actualizada
        return await prisma.venta.findUnique({
          where: { id: ventaId },
          include: {
            items: {
              include: {
                producto: true,
                servicio: true,
                empleado: { select: { id: true, nombre: true } },
              },
            },
            cliente: true,
            usuario: { select: { id: true, nombre: true } },
            pagos: true,
          },
        });
      });

      return NextResponse.json({ mensaje: "Venta actualizada correctamente", venta: ventaActualizada });
    }

    // ── Actualización de estado (lógica original del compañero) ─────────────
    const datosActualizacion: any = {};

    if (estado !== undefined) datosActualizacion.estado = estado;
    if (reciboImpreso !== undefined) datosActualizacion.reciboImpreso = reciboImpreso;
    if (notas !== undefined) datosActualizacion.notas = notas;

    // Si el estado cambia a CANCELADA o REEMBOLSADA, devolver los productos al inventario
    if (estado &&
        (estado === "CANCELADA" || estado === "REEMBOLSADA") &&
        ventaExistente.estado !== "CANCELADA" &&
        ventaExistente.estado !== "REEMBOLSADA") {

      await db.$transaction(async (prisma: import("@prisma/client").Prisma.TransactionClient) => {
        // Actualizar el estado de la venta
        await prisma.venta.update({
          where: { id: ventaId },
          data: datosActualizacion,
        });

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
      });

      const ventaActualizada = await db.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: {
              producto: true,
              servicio: true,
              empleado: { select: { id: true, nombre: true } },
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

      return NextResponse.json({
        mensaje: `Venta ${estado.toLowerCase()} y productos devueltos al inventario`,
        venta: ventaActualizada,
      });
    } else {
      // Actualización normal sin afectar inventario
      const ventaActualizada = await db.venta.update({
        where: {
          id: ventaId,
        },
        data: datosActualizacion,
        include: {
          items: {
            include: {
              producto: true,
              servicio: true,
              empleado: { select: { id: true, nombre: true } },
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

      return NextResponse.json({
        mensaje: `Venta actualizada correctamente`,
        venta: ventaActualizada,
      });
    }
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
