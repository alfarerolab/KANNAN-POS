import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

/**
 * GET /api/peluqueria/empleados-dia
 * Retorna el reporte del día agrupado por empleado.
 * Incluye servicios realizados y cálculo de ganancias.
 * Solo para ADMINISTRADOR y GERENTE.
 *
 * Query params:
 *   fecha: ISO date string (opcional, default = hoy)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    if (!["ADMINISTRADOR", "SUPERADMIN", "GERENTE"].includes(session.user.role)) {
      return NextResponse.json({ mensaje: "Sin permisos" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get("fecha");

    // Calcular rango del día
    const fechaBase = fechaParam ? new Date(fechaParam) : new Date();
    const inicio = new Date(fechaBase);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaBase);
    fin.setHours(23, 59, 59, 999);

    // Obtener items de comanda del día (fuente principal para peluquería)
    const itemsComanda = await db.comandaItem.findMany({
      where: {
        createdAt: { gte: inicio, lte: fin },
        empleadoId: { not: null },
        comanda: {
          empresaId,
          estado: { not: "CANCELADA" },
        },
      },
      select: {
        id: true,
        precio: true,
        createdAt: true,
        empleadoId: true,
        empleado: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            porcentajeComision: true,
          },
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            color: true,
            porcentajeEmpleado: true,
            porcentajeNegocio: true,
          },
        },
        comanda: {
          select: { estado: true, id: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // También obtener items de venta directa del día (si registraron sin comanda)
    const itemsVenta = await db.itemVenta.findMany({
      where: {
        createdAt: { gte: inicio, lte: fin },
        servicioId: { not: null },
        empleadoId: { not: null },
        venta: { empresaId, estado: "COMPLETADA" },
      },
      select: {
        id: true,
        subtotal: true,
        createdAt: true,
        empleadoId: true,
        empleado: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            porcentajeComision: true,
          },
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            color: true,
            porcentajeEmpleado: true,
            porcentajeNegocio: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar por empleado
    type EntradaEmpleado = {
      empleadoId: string;
      nombre: string;
      imagen: string | null;
      porcentajeComision: number;
      totalServicios: number;
      totalMonto: number;
      gananciaEmpleado: number;
      gananciaNegocio: number;
      items: {
        origen: "comanda" | "venta";
        servicioNombre: string;
        servicioColor: string;
        monto: number;
        porcentajeEmpleadoServicio: number;
        porcentajeNegocioServicio: number;
        gananciaEmpleado: number;
        gananciaNegocio: number;
        hora: Date;
        estado?: string;
      }[];
    };

    const porEmpleado = new Map<string, EntradaEmpleado>();

    const obtenerOCrear = (emp: { id: string; nombre: string; imagen: string | null; porcentajeComision: any }) => {
      if (!porEmpleado.has(emp.id)) {
        porEmpleado.set(emp.id, {
          empleadoId: emp.id,
          nombre: emp.nombre,
          imagen: emp.imagen,
          porcentajeComision: emp.porcentajeComision ? parseFloat(emp.porcentajeComision.toString()) : 0,
          totalServicios: 0,
          totalMonto: 0,
          gananciaEmpleado: 0,
          gananciaNegocio: 0,
          items: [],
        });
      }
      return porEmpleado.get(emp.id)!;
    };

    // Procesar items de comanda
    for (const item of itemsComanda) {
      if (!item.empleadoId || !item.empleado) continue;

      const monto = parseFloat(item.precio.toString());
      const pctEmpleado = item.servicio?.porcentajeEmpleado
        ? parseFloat(item.servicio.porcentajeEmpleado.toString())
        : 0;
      const pctNegocio = item.servicio?.porcentajeNegocio
        ? parseFloat(item.servicio.porcentajeNegocio.toString())
        : 100 - pctEmpleado;

      const gananciaEmp = monto * (pctEmpleado / 100);
      const gananciaNeg = monto * (pctNegocio / 100);

      const entrada = obtenerOCrear(item.empleado);
      entrada.totalServicios++;
      entrada.totalMonto += monto;
      entrada.gananciaEmpleado += gananciaEmp;
      entrada.gananciaNegocio += gananciaNeg;
      entrada.items.push({
        origen: "comanda",
        servicioNombre: item.servicio?.nombre || "Servicio",
        servicioColor: item.servicio?.color || "#6366F1",
        monto,
        porcentajeEmpleadoServicio: pctEmpleado,
        porcentajeNegocioServicio: pctNegocio,
        gananciaEmpleado: gananciaEmp,
        gananciaNegocio: gananciaNeg,
        hora: item.createdAt,
        estado: item.comanda.estado,
      });
    }

    // Procesar items de venta directa (evitar duplicados de comandas ya cobradas)
    for (const item of itemsVenta) {
      if (!item.empleadoId || !item.empleado) continue;

      const monto = parseFloat(item.subtotal.toString());
      const pctEmpleado = item.servicio?.porcentajeEmpleado
        ? parseFloat(item.servicio.porcentajeEmpleado.toString())
        : 0;
      const pctNegocio = item.servicio?.porcentajeNegocio
        ? parseFloat(item.servicio.porcentajeNegocio.toString())
        : 100 - pctEmpleado;

      const gananciaEmp = monto * (pctEmpleado / 100);
      const gananciaNeg = monto * (pctNegocio / 100);

      const entrada = obtenerOCrear(item.empleado);
      entrada.totalServicios++;
      entrada.totalMonto += monto;
      entrada.gananciaEmpleado += gananciaEmp;
      entrada.gananciaNegocio += gananciaNeg;
      entrada.items.push({
        origen: "venta",
        servicioNombre: item.servicio?.nombre || "Servicio",
        servicioColor: item.servicio?.color || "#6366F1",
        monto,
        porcentajeEmpleadoServicio: pctEmpleado,
        porcentajeNegocioServicio: pctNegocio,
        gananciaEmpleado: gananciaEmp,
        gananciaNegocio: gananciaNeg,
        hora: item.createdAt,
      });
    }

    const resultado = Array.from(porEmpleado.values()).sort(
      (a, b) => b.totalMonto - a.totalMonto
    );

    const totalGeneral = resultado.reduce((s, e) => s + e.totalMonto, 0);
    const totalGananciaEmpleados = resultado.reduce((s, e) => s + e.gananciaEmpleado, 0);
    const totalGananciaNegocio = resultado.reduce((s, e) => s + e.gananciaNegocio, 0);
    const totalServicios = resultado.reduce((s, e) => s + e.totalServicios, 0);

    return NextResponse.json({
      empleados: resultado,
      fecha: inicio.toISOString(),
      resumen: {
        totalEmpleados: resultado.length,
        totalServicios,
        totalGeneral,
        totalGananciaEmpleados,
        totalGananciaNegocio,
      },
    });
  } catch (error) {
    console.error("Error al calcular empleados del día:", error);
    return NextResponse.json({ mensaje: "Error interno" }, { status: 500 });
  }
}
