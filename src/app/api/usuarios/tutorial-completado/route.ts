import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { completedAt, completedSteps } = body;

    // Actualizar o crear registro de tutorial completado
    await db.usuario.update({
      where: {
        id: session.user.id,
      },
      data: {
        // Podríamos agregar campos específicos para el tutorial si fuera necesario
        // Por ahora, solo registramos que completó el onboarding
        updatedAt: new Date(),
      },
    });

    // Opcional: Registrar en logs de auditoría
    try {
      await db.auditoriaLog.create({
        data: {
          tabla: "Usuario",
          registroId: session.user.id,
          accion: "ACTUALIZAR",
          datosNuevos: {
            tutorialCompletado: true,
            completedAt,
            completedSteps,
          },
          usuarioId: session.user.id,
          usuarioEmail: session.user.email,
          usuarioRol: session.user.role,
          empresaId: session.user.empresaId,
          notas: "Tutorial de onboarding completado",
        },
      });
    } catch (auditError) {
      console.error("Error logging tutorial completion:", auditError);
      // No fallar la request por error de auditoría
    }

    return NextResponse.json({
      success: true,
      message: "Tutorial completado exitosamente",
    });

  } catch (error) {
    console.error("Error al guardar tutorial completado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
