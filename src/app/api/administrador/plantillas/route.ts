import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions, esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { obtenerConfiguracionNegocio } from "@/lib/configuracion-negocio";
import type { TipoNegocio } from "../../../../lib/prisma-types";
// GET - Obtener plantillas de configuración
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para acceder a esta información" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipoNegocio = searchParams.get("tipoNegocio") as TipoNegocio | null;
    const soloActivas = searchParams.get("activas") === "true";

    const whereClause: any = {};
    if (tipoNegocio) {
      whereClause.tipoNegocio = tipoNegocio;
    }
    if (soloActivas) {
      whereClause.activa = true;
    }

    const plantillas = await db.plantillaConfiguracion.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            aplicaciones: true,
          },
        },
      },
      orderBy: [
        { esDefault: "desc" },
        { vecesAplicada: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ datos: plantillas });
  } catch (error) {
    console.error("Error al obtener plantillas:", error);
    return NextResponse.json(
      { message: "Error al obtener plantillas" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva plantilla
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea superadmin
    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nombre, descripcion, tipoNegocio, configuracion, esDefault } = body;

    // Validación básica
    if (!nombre || !tipoNegocio || !configuracion) {
      return NextResponse.json(
        { message: "Nombre, tipo de negocio y configuración son requeridos" },
        { status: 400 }
      );
    }

    // Si es plantilla por defecto, desactivar otras plantillas por defecto del mismo tipo
    if (esDefault) {
      await db.plantillaConfiguracion.updateMany({
        where: {
          tipoNegocio,
          esDefault: true,
        },
        data: {
          esDefault: false,
        },
      });
    }

    const plantilla = await db.plantillaConfiguracion.create({
      data: {
        nombre,
        descripcion,
        tipoNegocio,
        configuracion,
        esDefault: esDefault || false,
        creadoPor: session.user.id,
      },
    });

    return NextResponse.json(plantilla, { status: 201 });
  } catch (error) {
    console.error("Error al crear plantilla:", error);
    return NextResponse.json(
      { message: "Error al crear plantilla" },
      { status: 500 }
    );
  }
}



// ✅ DESPUÉS (Correcto)
async function createDefaultTemplates() {
  const tiposNegocio = [
    "VETERINARIA", "PELUQUERIA", "SALON_BELLEZA", "FARMACIA", "ROPA",
    "RESTAURANTE", "BAR", "FERRETERIA", "ELECTRONICA", "CAFETERIA",
    "TIENDA_COMIDA", "TIENDA_BARRIO", "LIBRERIA", "OTRO"
  ] as TipoNegocio[];

  for (const tipo of tiposNegocio) {
    const existeDefault = await db.plantillaConfiguracion.findFirst({
      where: {
        tipoNegocio: tipo,
        esDefault: true,
      },
    });

    if (!existeDefault) {
      const configNegocio = obtenerConfiguracionNegocio(tipo);

      // ⭐ AÑADIR ESTA VALIDACIÓN
      if (!configNegocio) {
        console.error(`No se encontró configuración para tipo de negocio: ${tipo}`);
        continue; // Saltar al siguiente tipo de negocio
      }

      const configuracion = {
        tipoNegocio: tipo,
        habilitarServicios: configNegocio.funcionalidades.servicios,
        habilitarCitas: configNegocio.funcionalidades.citas,
        habilitarVariantes: configNegocio.funcionalidades.variantes,
        habilitarRecetas: configNegocio.funcionalidades.recetas,
        habilitarLotes: configNegocio.funcionalidades.lotes,
        habilitarVencimientos: configNegocio.funcionalidades.vencimientos,
        configuracionPos: configNegocio.camposPOS,
        configuracionInventario: JSON.stringify({}),
        configuracionFactura: JSON.stringify({}),
      };

      await db.plantillaConfiguracion.create({
        data: {
          nombre: `Configuración estándar - ${configNegocio.nombre}`,
          descripcion: `Plantilla por defecto para empresas de tipo ${configNegocio.nombre.toLowerCase()}`,
          tipoNegocio: tipo,
          configuracion,
          esDefault: true,
          creadoPor: "system",
        },
      });
    }
  }
}