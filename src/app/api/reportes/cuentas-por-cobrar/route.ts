import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { MetodoPago } from "../../../../lib/prisma-types";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("clienteId");
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");
    const empresaId = session.user.empresaId;

    if (!empresaId) {
      return NextResponse.json({ message: "Empresa no encontrada" }, { status: 404 });
    }

    // Construir filtros
    const whereClause: any = {
      empresaId,
      pagos: {
        some: {
          metodoPago: "FIADO"
        }
      }
    };

    // Filtros opcionales
    if (clienteId && clienteId !== "todos") {
      whereClause.clienteId = clienteId;
    }

    if (fechaInicio || fechaFin) {
      whereClause.createdAt = {};
      if (fechaInicio) whereClause.createdAt.gte = new Date(fechaInicio);
      if (fechaFin) {
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = fechaFinDate;
      }
    }

    // Obtener ventas fiadas
    const ventasFiadas = await db.venta.findMany({
      where: whereClause,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        pagos: {
          select: {
            id: true,
            metodoPago: true,
            monto: true,
            referencia: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Agrupar por cliente
    const cuentasPorCliente: Record<string, any> = {};

    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasFiadas.forEach((venta) => {
      const clienteId = venta.clienteId || "sin-cliente";
      const clienteNombre = venta.cliente?.nombre || "Cliente no registrado";

      if (!cuentasPorCliente[clienteId]) {
        cuentasPorCliente[clienteId] = {
          clienteId: venta.clienteId,
          clienteNombre,
          clienteEmail: venta.cliente?.email,
          clienteTelefono: venta.cliente?.telefono,
          totalDeuda: 0,
          cantidadVentas: 0,
          ventas: [],
        };
      }

      // Calcular monto fiado de esta venta
      const montoFiado = venta.pagos
        // @ts-expect-error Autofix Next15 o tipos implícitos
        .filter((pago) => pago.metodoPago === "FIADO")
        // @ts-expect-error Autofix Next15 o tipos implícitos
        .reduce((sum: number, pago) => sum + Number(pago.monto), 0);

      cuentasPorCliente[clienteId].totalDeuda += montoFiado;
      cuentasPorCliente[clienteId].cantidadVentas += 1;
      cuentasPorCliente[clienteId].ventas.push({
        id: venta.id,
        createdAt: venta.createdAt,
        total: Number(venta.total),
        montoFiado,
        estado: venta.estado,
        usuarioNombre: venta.usuario?.nombre,
      });
    });

    // Convertir a array y ordenar por deuda
    const cuentasArray = Object.values(cuentasPorCliente).sort(
      (a: any, b: any) => b.totalDeuda - a.totalDeuda
    );

    // Calcular totales generales
    const totalDeudaGeneral = cuentasArray.reduce(
      (sum: number, cuenta: any) => sum + cuenta.totalDeuda,
      0
    );

    const totalClientesConDeuda = cuentasArray.length;
    const totalVentasFiadas = ventasFiadas.length;

    return NextResponse.json({
      resumen: {
        totalDeudaGeneral,
        totalClientesConDeuda,
        totalVentasFiadas,
      },
      cuentas: cuentasArray,
    });
  } catch (error) {
    console.error("Error al obtener cuentas por cobrar:", error);
    return NextResponse.json(
      { message: "Error al obtener cuentas por cobrar" },
      { status: 500 }
    );
  }
}
