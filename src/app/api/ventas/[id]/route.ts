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

// PATCH - Actualizar el estado de una venta
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
    const { estado, reciboImpreso, notas } = body;

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

    // Construir objeto de datos para actualizar
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
            },
          },
          cliente: true,
          usuario: {
            select: {
              id: true,
              nombre: true,
            },
          },
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
      });

      return NextResponse.json(ventaActualizada);
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
