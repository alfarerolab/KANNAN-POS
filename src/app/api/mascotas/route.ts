import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema de validación para mascotas
const mascotaSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  especie: z.string().min(1, "La especie es requerida"),
  raza: z.string().optional(),
  edad: z.number().min(0).optional(),
  peso: z.number().min(0).optional(),
  sexo: z.enum(["MACHO", "HEMBRA"]).optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  historialMedico: z.string().optional(),
  alergias: z.string().optional(),
  medicamentos: z.string().optional(),
  observaciones: z.string().optional(),
  clienteId: z.string().min(1, "El cliente es requerido"),
});

// GET - Obtener mascotas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const clienteId = url.searchParams.get("clienteId");
    const busqueda = url.searchParams.get("busqueda");

    const filtros: any = {
      empresaId: session.user.empresaId,
      activo: true,
    };

    if (clienteId) {
      filtros.clienteId = clienteId;
    }

    if (busqueda) {
      filtros.OR = [
        { nombre: { contains: busqueda, mode: "insensitive" } },
        { especie: { contains: busqueda, mode: "insensitive" } },
        { raza: { contains: busqueda, mode: "insensitive" } },
        { microchip: { contains: busqueda, mode: "insensitive" } },
      ];
    }

    const mascotas = await db.mascota.findMany({
      where: filtros,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
    });

    return NextResponse.json({
      datos: mascotas,
      total: mascotas.length,
    });
  } catch (error) {
    console.error("Error al obtener mascotas:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva mascota
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const datosValidados = mascotaSchema.parse(body);

    // Verificar que el cliente pertenece a la empresa
    const cliente = await db.cliente.findFirst({
      where: {
        id: datosValidados.clienteId,
        empresaId: session.user.empresaId,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Verificar microchip único si se proporciona
    if (datosValidados.microchip) {
      const microchipExistente = await db.mascota.findFirst({
        where: {
          microchip: datosValidados.microchip,
          empresaId: session.user.empresaId,
        },
      });

      if (microchipExistente) {
        return NextResponse.json(
          { error: "Ya existe una mascota con ese microchip" },
          { status: 400 }
        );
      }
    }

    const nuevaMascota = await db.mascota.create({
      data: {
        ...datosValidados,
        empresaId: session.user.empresaId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
          },
        },
      },
    });

    return NextResponse.json({
      datos: nuevaMascota,
      mensaje: "Mascota creada exitosamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: error.errors },
        { status: 400 }
      );
    }

    console.error("Error al crear mascota:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
