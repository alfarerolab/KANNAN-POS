import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import {
  obtenerEmpresasProximasVencer,
  ejecutarTareasAutomaticas,
  verificarSuscripcionesVencidas
} from "@/lib/subscription-middleware";

const prisma = db;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accion = searchParams.get("accion");

    if (!accion) {
      return NextResponse.json({ error: "Acción requerida" }, { status: 400 });
    }

    switch (accion) {
      case 'proximas_vencer': {
        const empresasProximasVencer = await obtenerEmpresasProximasVencer(15);
        return NextResponse.json({ empresasProximasVencer });
      }

      case 'notificaciones_recientes': {
        const notificacionesRecientes = await prisma.metricaUso.findMany({
          where: {
            tipo: 'EMPRESA',
            entidad: 'notificacion',
            evento: {
              in: ['vencimiento_proximo', 'suscripcion_vencida', 'upgrade_sugerido']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            empresa: {
              select: {
                nombre: true,
                email: true
              }
            }
          },
          take: 50
        });

        return NextResponse.json({ notificacionesRecientes });
      }

      case 'estadisticas': {
        const ahora = new Date();
        const hace30dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
          totalEmpresas,
          empresasActivas,
          empresasInactivas,
          suscripcionesActivas,
          suscripcionesVencidas,
          notificacionesEnviadas
        ] = await Promise.all([
          prisma.empresa.count(),
          prisma.empresa.count({ where: { activa: true } }),
          prisma.empresa.count({ where: { activa: false } }),
          prisma.suscripcion.count({
            where: {
              estado: 'ACTIVA',
              fechaFin: { gte: ahora }
            }
          }),
          prisma.suscripcion.count({
            where: {
              estado: 'EXPIRADA',
              fechaFin: { gte: hace30dias }
            }
          }),
          prisma.metricaUso.count({
            where: {
              tipo: 'EMPRESA',
              entidad: 'notificacion',
              createdAt: { gte: hace30dias }
            }
          })
        ]);

        return NextResponse.json({
          estadisticas: {
            totalEmpresas,
            empresasActivas,
            empresasInactivas,
            suscripcionesActivas,
            suscripcionesVencidas,
            notificacionesEnviadas
          }
        });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error en notificaciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { accion } = await request.json();

    if (!accion) {
      return NextResponse.json({ error: "Acción requerida" }, { status: 400 });
    }

    switch (accion) {
      case 'ejecutar_tareas_automaticas': {
        const resultado = await ejecutarTareasAutomaticas();

        // Crear log de auditoría
        await prisma.auditoriaLog.create({
          data: {
            tabla: 'Sistema',
            registroId: 'TAREAS_AUTOMATICAS',
            accion: 'EJECUTAR',
            datosNuevos: resultado,
            usuarioEmail: session.user.email || '',
            usuarioRol: session.user.role,
            empresaId: null,
            notas: "Ejecución manual de tareas automáticas desde panel de administración"
          }
        });

        return NextResponse.json({
          mensaje: "Tareas automáticas ejecutadas exitosamente",
          resultado
        });
      }

      case 'verificar_vencidas': {
        const resultadoVencidas = await verificarSuscripcionesVencidas();
        return NextResponse.json({
          mensaje: "Verificación de suscripciones vencidas completada",
          resultado: resultadoVencidas
        });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }

  } catch (error) {
    console.error("Error en notificaciones POST:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
