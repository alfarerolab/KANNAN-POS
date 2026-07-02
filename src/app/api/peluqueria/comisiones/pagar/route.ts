import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * POST /api/peluqueria/comisiones/pagar
 * Registra el pago de una comisión como un gasto.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { empleadoId, nombreEmpleado, monto, metodoPago, notas, desde, hasta } = body;

    if (!empleadoId || monto === undefined || monto <= 0 || !desde || !hasta) {
      return NextResponse.json({ error: "Datos inválidos para registrar pago o faltan fechas de periodo" }, { status: 400 });
    }

    // Buscar o crear categoría "Comisiones" para evitar el error de Prisma
    let categoria = await db.categoriaGasto.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nombre: {
          contains: "Comision",
        }
      }
    });

    if (!categoria) {
      categoria = await db.categoriaGasto.create({
        data: {
          nombre: "Pago de Comisiones",
          empresaId: session.user.empresaId
        }
      });
    }

    // El ID de categoría se pasa explícitamente para cumplir con versiones del esquema donde era requerido
    // Creamos el gasto
    const gasto = await db.gasto.create({
      data: {
        concepto: `Liquidación de comisiones - ${nombreEmpleado} ${notas ? `(${notas})` : ''}`,
        monto: monto,
        fecha: new Date(),
        metodoPago: metodoPago || "EFECTIVO",
        usuarioId: session.user.id,
        empresaId: session.user.empresaId,
        categoriaId: categoria.id
      }
    });

    // Lógica FIFO para pago parcial
    // Obtener todos los items pendientes del empleado en el rango de fechas, ordenados del más antiguo al más reciente
    // Incluir ventas COMPLETADAS y PENDIENTES (crédito/mixto pueden quedar en PENDIENTE)
    const itemsPendientes = await db.itemVenta.findMany({
      where: {
        empleadoId: empleadoId,
        comisionPagada: false,
        venta: {
          estado: { in: ['COMPLETADA', 'PENDIENTE'] }
        },
        createdAt: {
          gte: new Date(desde),
          lte: new Date(hasta)
        }
      },
      include: {
        servicio: true,
        empleado: true,
        venta: { select: { metodoPago: true, estado: true } }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    let montoRestanteParaPagar = parseFloat(monto.toString());
    let itemsPagadosCount = 0;

    for (const item of itemsPendientes) {
      if (montoRestanteParaPagar <= 0) break;

      const subtotal = parseFloat(item.subtotal.toString());
      const porcentaje = item.servicio?.porcentajeEmpleado 
        ? parseFloat(item.servicio.porcentajeEmpleado.toString())
        : (item.empleado?.porcentajeComision ? parseFloat(item.empleado.porcentajeComision.toString()) : 0);

      const comisionItem = subtotal * (porcentaje / 100);

      if (comisionItem <= 0) continue; // ignorar ítems sin comisión

      if (montoRestanteParaPagar >= comisionItem - 0.01) { // -0.01 for floating point
        // El monto restante cubre la comisión completa de este ítem → marcarlo pagado
        await db.itemVenta.update({
          where: { id: item.id },
          data: { comisionPagada: true }
        });
        montoRestanteParaPagar -= comisionItem;
        itemsPagadosCount++;
      } else {
        // Pago parcial: el monto no alcanza para cubrir este ítem completo.
        // Lo marcamos como pagado de todas formas — el gasto ya quedó registrado
        // en la caja. Esto evita "dinero fantasma" (pagado pero sin marcar ítems).
        await db.itemVenta.update({
          where: { id: item.id },
          data: { comisionPagada: true }
        });
        montoRestanteParaPagar = 0;
        itemsPagadosCount++;
        break;
      }
    }

    return NextResponse.json({ success: true, gasto, itemsPagados: itemsPagadosCount });
  } catch (error: any) {
    console.error("[PAGAR COMISION]", error);
    return NextResponse.json({ error: error.message || "Error al registrar el pago de la comisión", details: error }, { status: 500 });
  }
}
