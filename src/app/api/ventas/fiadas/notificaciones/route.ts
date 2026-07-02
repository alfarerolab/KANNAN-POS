// src/app/api/ventas/fiadas/notificaciones/route.ts
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener notificaciones de ventas fiadas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Obtener ventas fiadas con información relevante
    const ventasFiadas = await db.venta.findMany({
      where: {
        empresaId,
        esVentaFiada: true,
        estadoPago: {
          not: "PAGADO", // Excluir ventas ya pagadas
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        fechaVencimiento: "asc",
      },
    });

    const hoy = new Date();
    const en3Dias = new Date();
    en3Dias.setDate(hoy.getDate() + 3);
    const en7Dias = new Date();
    en7Dias.setDate(hoy.getDate() + 7);

    // Generar notificaciones dinámicas
    const notificaciones: any[] = [];

    // @ts-expect-error Autofix Next15 o tipos implícitos
    ventasFiadas.forEach((venta) => {
      const saldoPendiente = Number(venta.saldoPendiente || 0);
      
      if (saldoPendiente <= 0) return;

      const fechaVenc = venta.fechaVencimiento ? new Date(venta.fechaVencimiento) : null;
      const clienteNombre = venta.cliente?.nombre || "Cliente sin nombre";

      // Ventas vencidas
      if (fechaVenc && fechaVenc < hoy) {
        const diasVencidos = Math.floor(
          (hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notificaciones.push({
          id: `vencida-${venta.id}`,
          tipo: "vencida",
          ventaId: venta.id,
          clienteNombre,
          mensaje: `Venta vencida hace ${diasVencidos} día${diasVencidos !== 1 ? "s" : ""}. Saldo pendiente: $${saldoPendiente.toFixed(2)}`,
          monto: saldoPendiente,
          prioridad: diasVencidos > 7 ? "alta" : "media",
          timestamp: fechaVenc.toISOString(),
          leida: false,
          fechaVencimiento: fechaVenc.toISOString(),
        });
      }
      // Ventas próximas a vencer (3 días)
      else if (fechaVenc && fechaVenc >= hoy && fechaVenc <= en3Dias) {
        const diasParaVencer = Math.ceil(
          (fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        notificaciones.push({
          id: `proximo-${venta.id}`,
          tipo: "vencimiento_proximo",
          ventaId: venta.id,
          clienteNombre,
          mensaje: `Vence en ${diasParaVencer} día${diasParaVencer !== 1 ? "s" : ""}. Saldo: $${saldoPendiente.toFixed(2)}`,
          monto: saldoPendiente,
          prioridad: diasParaVencer <= 1 ? "alta" : "media",
          timestamp: new Date().toISOString(),
          leida: false,
          fechaVencimiento: fechaVenc.toISOString(),
        });
      }
      // Ventas con pago parcial (recordatorio)
      else if (venta.estadoPago === "PAGO_PARCIAL") {
        notificaciones.push({
          id: `parcial-${venta.id}`,
          tipo: "pago_parcial",
          ventaId: venta.id,
          clienteNombre,
          mensaje: `Pago parcial pendiente. Saldo restante: $${saldoPendiente.toFixed(2)}`,
          monto: saldoPendiente,
          prioridad: "baja",
          timestamp: venta.fechaUltimoPago?.toISOString() || new Date().toISOString(),
          leida: false,
          fechaVencimiento: fechaVenc?.toISOString(),
        });
      }
    });

    // Ordenar por prioridad y fecha
    notificaciones.sort((a, b) => {
      const prioridadOrden = { alta: 3, media: 2, baja: 1 };
      const prioridadDiff = prioridadOrden[b.prioridad as keyof typeof prioridadOrden] - 
                           prioridadOrden[a.prioridad as keyof typeof prioridadOrden];
      
      if (prioridadDiff !== 0) return prioridadDiff;
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return NextResponse.json({
      notificaciones,
      resumen: {
        total: notificaciones.length,
        urgentes: notificaciones.filter((n) => n.prioridad === "alta").length,
        importantes: notificaciones.filter((n) => n.prioridad === "media").length,
        informativas: notificaciones.filter((n) => n.prioridad === "baja").length,
      },
    });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}