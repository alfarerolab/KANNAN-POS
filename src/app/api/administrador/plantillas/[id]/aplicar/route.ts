import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";
import { authOptions, esSuperAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// POST - Aplicar plantilla a empresa(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (!esSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: "No tienes permisos para realizar esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { empresaIds } = body; // Array de IDs de empresas

    if (!empresaIds || !Array.isArray(empresaIds) || empresaIds.length === 0) {
      return NextResponse.json(
        { message: "Se requiere al menos una empresa para aplicar la plantilla" },
        { status: 400 }
      );
    }

    const { id } = await params; // ⭐ CAMBIO: await params

    // Obtener la plantilla
    const plantilla = await db.plantillaConfiguracion.findUnique({
      where: { id },
    });

    if (!plantilla) {
      return NextResponse.json(
        { message: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    if (!plantilla.activa) {
      return NextResponse.json(
        { message: "La plantilla no está activa" },
        { status: 400 }
      );
    }

    // Verificar que las empresas existen y son del tipo correcto
    const empresas = await db.empresa.findMany({
      where: {
        id: { in: empresaIds },
        tipoNegocio: plantilla.tipoNegocio,
      },
    });

    if (empresas.length !== empresaIds.length) {
      return NextResponse.json(
        { message: "Algunas empresas no existen o no son del tipo de negocio correcto" },
        { status: 400 }
      );
    }

    const resultados = [];

    // Aplicar plantilla a cada empresa en una transacción
    for (const empresa of empresas) {
      try {
        const resultado = await db.$transaction(async (tx: any) => {
          // Obtener configuración actual o crear una nueva
          let configEmpresa = await tx.configuracionEmpresa.findUnique({
            where: { empresaId: empresa.id },
          });

          const configPlantilla = plantilla.configuracion as any;

          if (configEmpresa) {
            // Actualizar configuración existente
            configEmpresa = await tx.configuracionEmpresa.update({
              where: { empresaId: empresa.id },
              data: {
                tipoNegocio: configPlantilla.tipoNegocio,
                habilitarServicios: configPlantilla.habilitarServicios,
                habilitarCitas: configPlantilla.habilitarCitas,
                habilitarVariantes: configPlantilla.habilitarVariantes,
                habilitarRecetas: configPlantilla.habilitarRecetas,
                habilitarLotes: configPlantilla.habilitarLotes,
                habilitarVencimientos: configPlantilla.habilitarVencimientos,
                configuracionPos: configPlantilla.configuracionPos,
                configuracionInventario: configPlantilla.configuracionInventario,
                configuracionFactura: configPlantilla.configuracionFactura,
              },
            });
          } else {
            // Crear nueva configuración
            configEmpresa = await tx.configuracionEmpresa.create({
              data: {
                empresaId: empresa.id,
                tipoNegocio: configPlantilla.tipoNegocio,
                habilitarServicios: configPlantilla.habilitarServicios,
                habilitarCitas: configPlantilla.habilitarCitas,
                habilitarVariantes: configPlantilla.habilitarVariantes,
                habilitarRecetas: configPlantilla.habilitarRecetas,
                habilitarLotes: configPlantilla.habilitarLotes,
                habilitarVencimientos: configPlantilla.habilitarVencimientos,
                configuracionPos: configPlantilla.configuracionPos,
                configuracionInventario: configPlantilla.configuracionInventario,
                configuracionFactura: configPlantilla.configuracionFactura,
              },
            });
          }

          // Registrar la aplicación de plantilla
          const aplicacion = await tx.aplicacionPlantilla.create({
            data: {
              plantillaId: plantilla.id,
              empresaId: empresa.id,
              aplicadoPor: session.user.id,
            },
          });

          // Actualizar contador de veces aplicada
          await tx.plantillaConfiguracion.update({
            where: { id: plantilla.id },
            data: {
              vecesAplicada: {
                increment: 1,
              },
            },
          });

          // Registrar en auditoría
          await tx.auditoriaLog.create({
            data: {
              tabla: "ConfiguracionEmpresa",
              registroId: configEmpresa.id,
              accion: "APLICAR_PLANTILLA",
              datosNuevos: configPlantilla,
              usuarioId: session.user.id,
              usuarioEmail: session.user.email,
              usuarioRol: session.user.role,
              empresaId: empresa.id,
              notas: `Plantilla "${plantilla.nombre}" aplicada a empresa "${empresa.nombre}"`,
            },
          });

          return {
            empresaId: empresa.id,
            empresaNombre: empresa.nombre,
            aplicacionId: aplicacion.id,
            exito: true,
          };
        });

        resultados.push(resultado);
      } catch (error) {
        console.error(`Error al aplicar plantilla a empresa ${empresa.id}:`, error);
        resultados.push({
          empresaId: empresa.id,
          empresaNombre: empresa.nombre,
          exito: false,
          error: "Error interno al aplicar plantilla",
        });
      }
    }

    const exitosos = resultados.filter(r => r.exito).length;
    const fallidos = resultados.filter(r => !r.exito).length;

    return NextResponse.json({
      message: `Plantilla aplicada exitosamente a ${exitosos} empresa(s)${fallidos > 0 ? `, ${fallidos} fallaron` : ""}`,
      resultados,
      estadisticas: {
        total: empresaIds.length,
        exitosos,
        fallidos,
      },
    });
  } catch (error) {
    console.error("Error al aplicar plantilla:", error);
    return NextResponse.json(
      { message: "Error al aplicar plantilla" },
      { status: 500 }
    );
  }
}