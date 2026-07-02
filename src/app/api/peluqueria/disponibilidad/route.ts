import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * GET /api/peluqueria/disponibilidad
 * Retorna las citas y comandas activas de un empleado en una fecha dada.
 * Se usa para mostrar el calendario del día en el módulo walk-in.
 *
 * Query params:
 *   empleadoId: string
 *   fecha: ISO date string (opcional, default = hoy)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");
    const fechaParam = searchParams.get("fecha");

    if (!empleadoId) {
      return NextResponse.json({ error: "empleadoId requerido" }, { status: 400 });
    }

    const fechaBase = fechaParam ? new Date(fechaParam) : new Date();
    const inicio = new Date(fechaBase);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaBase);
    fin.setHours(23, 59, 59, 999);

    // Citas del empleado en el día
    const citas = await db.cita.findMany({
      where: {
        empleadoId,
        empresaId,
        fechaHora: { gte: inicio, lte: fin },
        estado: { in: ["PROGRAMADA", "CONFIRMADA", "EN_PROCESO"] },
      },
      select: {
        id: true,
        fechaHora: true,
        duracion: true,
        estado: true,
        cliente: { select: { id: true, nombre: true } },
        servicio: { select: { id: true, nombre: true, color: true } },
      },
      orderBy: { fechaHora: "asc" },
    });

    // Comandas activas del empleado en el día (items de comanda)
    const itemsComanda = await db.comandaItem.findMany({
      where: {
        empleadoId,
        createdAt: { gte: inicio, lte: fin },
        comanda: {
          empresaId,
          estado: "ABIERTA",
        },
      },
      select: {
        id: true,
        createdAt: true,
        servicio: { select: { id: true, nombre: true, duracion: true, color: true } },
        comanda: {
          select: {
            id: true,
            estado: true,
            cliente: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Construir bloques de tiempo ocupados
    const bloquesOcupados = [
      ...citas.map((c: any) => ({
        tipo: "cita" as const,
        id: c.id,
        inicio: c.fechaHora,
        fin: new Date(new Date(c.fechaHora).getTime() + c.duracion * 60000),
        duracionMin: c.duracion,
        servicio: c.servicio?.nombre || "Servicio",
        servicioColor: c.servicio?.color || "#6366F1",
        cliente: c.cliente?.nombre || "Sin cliente",
        estado: c.estado,
      })),
      ...itemsComanda.map((ci: any) => ({
        tipo: "walk-in" as const,
        id: ci.id,
        inicio: ci.createdAt,
        fin: new Date(
          new Date(ci.createdAt).getTime() +
            (ci.servicio?.duracion || 30) * 60000
        ),
        duracionMin: ci.servicio?.duracion || 30,
        servicio: ci.servicio?.nombre || "Servicio",
        servicioColor: ci.servicio?.color || "#8B5CF6",
        cliente: ci.comanda.cliente?.nombre || "Cliente directo",
        estado: ci.comanda.estado,
      })),
    ].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

    // Calcular próximo slot libre (buscar hueco de al menos 30 min)
    const ahora = new Date();
    let proximoSlot: Date | null = null;

    if (bloquesOcupados.length === 0) {
      proximoSlot = ahora < inicio ? inicio : ahora;
    } else {
      // Buscar primer hueco libre desde ahora
      let cursor = ahora < inicio ? inicio : ahora;
      for (const bloque of bloquesOcupados) {
        const bloqueInicio = new Date(bloque.inicio);
        if (bloqueInicio > cursor) {
          const hueco = (bloqueInicio.getTime() - cursor.getTime()) / 60000;
          if (hueco >= 30) {
            proximoSlot = cursor;
            break;
          }
        }
        const bloqueFin = new Date(bloque.fin);
        if (bloqueFin > cursor) {
          cursor = bloqueFin;
        }
      }
      if (!proximoSlot && cursor < fin) {
        proximoSlot = cursor;
      }
    }

    return NextResponse.json({
      empleadoId,
      fecha: inicio.toISOString(),
      bloquesOcupados,
      proximoSlotLibre: proximoSlot?.toISOString() || null,
      totalCitas: citas.length,
      totalWalkIn: itemsComanda.length,
    });
  } catch (error) {
    console.error("Error al calcular disponibilidad:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
