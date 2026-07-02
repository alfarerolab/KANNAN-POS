import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Decimal } from "@prisma/client/runtime/library";
import type { plan as PlanType } from "@prisma/client";

// Schema de validación para planes
const planSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().nullable().optional(),
  precio: z.number().positive("El precio debe ser mayor a 0"),
  meses: z.number().int().positive("Los meses deben ser mayor a 0"),
  activo: z.boolean().default(true),
  destacado: z.boolean().default(false),
  descuento: z.number().int().min(0).max(100).default(0),
  caracteristicas: z.array(z.string()).default([]),
  limitesUsuarios: z.number().int().nullable().optional(),
  limitesProductos: z.number().int().nullable().optional(),
  limitesTerminales: z.number().int().nullable().optional(),
  habilitarReportes: z.boolean().default(false),
  habilitarMultiUsuario: z.boolean().default(false),
  habilitarInventario: z.boolean().default(true),
  habilitarServicios: z.boolean().default(false),
});

// Función auxiliar para convertir Decimal a number
function convertDecimalToNumber(value: Decimal | number | null | undefined): number {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  return Number(value);
}

// Función auxiliar para transformar plan
function transformPlan(plan: PlanType) {
  let caracteristicasArray = [];
  if (typeof plan.caracteristicas === "string") {
    try {
      caracteristicasArray = JSON.parse(plan.caracteristicas);
    } catch (e) {
      caracteristicasArray = [];
    }
  } else if (Array.isArray(plan.caracteristicas)) {
    caracteristicasArray = plan.caracteristicas;
  }

  return {
    ...plan,
    precio: convertDecimalToNumber(plan.precio),
    caracteristicas: caracteristicasArray,
    descripcion: plan.descripcion || null,
    limitesUsuarios: plan.limitesUsuarios || null,
    limitesProductos: plan.limitesProductos || null,
    limitesTerminales: plan.limitesTerminales || null,
  };
}

// GET - Obtener todos los planes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const planes = await db.plan.findMany({
      orderBy: [{ destacado: "desc" }, { precio: "asc" }],
    });

    const planesTransformados = planes.map((plan: PlanType) => transformPlan(plan));

    return NextResponse.json(planesTransformados);
  } catch (error) {
    console.error("💥 Error completo en GET planes:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    return NextResponse.json(
      { error: "Error interno del servidor al obtener planes" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = planSchema.parse(body);

    // Si el plan va a ser destacado, quitar destacado de otros planes
    if (validatedData.destacado) {
      await db.plan.updateMany({
        where: { destacado: true },
        data: { destacado: false },
      });
    }

    const datosParaCrear = {
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion || null,
      precio: validatedData.precio,
      meses: validatedData.meses,
      activo: validatedData.activo,
      destacado: validatedData.destacado,
      descuento: validatedData.descuento,
      caracteristicas: validatedData.caracteristicas,
      limitesUsuarios: validatedData.limitesUsuarios || null,
      limitesProductos: validatedData.limitesProductos || null,
      limitesTerminales: validatedData.limitesTerminales || null,
      habilitarReportes: validatedData.habilitarReportes,
      habilitarMultiUsuario: validatedData.habilitarMultiUsuario,
      habilitarInventario: validatedData.habilitarInventario,
      habilitarServicios: validatedData.habilitarServicios,
    };

    const nuevoPlan = await db.plan.create({
      data: datosParaCrear,
    });

    const planTransformado = transformPlan(nuevoPlan);

    return NextResponse.json(planTransformado, { status: 201 });
  } catch (error) {
    console.error("💥 Error en POST plan:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor al crear plan" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar plan
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del plan requerido" },
        { status: 400 }
      );
    }

    const validatedData = planSchema.parse(updateData);

    const planExistente = await db.plan.findUnique({
      where: { id },
    });

    if (!planExistente) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    // Si el plan va a ser destacado, quitar destacado de otros planes
    if (validatedData.destacado && !planExistente.destacado) {
      await db.plan.updateMany({
        where: {
          destacado: true,
          id: { not: id },
        },
        data: { destacado: false },
      });
    }

    const datosParaActualizar = {
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion || null,
      precio: validatedData.precio,
      meses: validatedData.meses,
      activo: validatedData.activo,
      destacado: validatedData.destacado,
      descuento: validatedData.descuento,
      caracteristicas: validatedData.caracteristicas,
      limitesUsuarios: validatedData.limitesUsuarios || null,
      limitesProductos: validatedData.limitesProductos || null,
      limitesTerminales: validatedData.limitesTerminales || null,
      habilitarReportes: validatedData.habilitarReportes,
      habilitarMultiUsuario: validatedData.habilitarMultiUsuario,
      habilitarInventario: validatedData.habilitarInventario,
      habilitarServicios: validatedData.habilitarServicios,
    };

    const planActualizado = await db.plan.update({
      where: { id },
      data: datosParaActualizar,
    });

    const planTransformado = transformPlan(planActualizado);

    return NextResponse.json(planTransformado);
  } catch (error) {
    console.error("💥 Error en PUT plan:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Error interno del servidor al actualizar plan" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plan
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID del plan requerido" },
        { status: 400 }
      );
    }

    const planExistente = await db.plan.findUnique({
      where: { id },
      include: {
        suscripciones: {
          where: {
            estado: "ACTIVA",
          },
        },
      },
    });

    if (!planExistente) {
      return NextResponse.json(
        { error: "Plan no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que no hay suscripciones activas
    if (planExistente.suscripciones && planExistente.suscripciones.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un plan con suscripciones activas" },
        { status: 400 }
      );
    }

    await db.plan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Plan eliminado correctamente" });
  } catch (error) {
    console.error("💥 Error en DELETE plan:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar plan" },
      { status: 500 }
    );
  }
}