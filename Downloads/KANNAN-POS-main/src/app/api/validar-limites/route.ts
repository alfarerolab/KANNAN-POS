import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { validarLimitesUso } from "@/lib/subscription-middleware";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Si es superadmin, no hay límites
    if (session.user.role === 'SUPERADMIN') {
      return NextResponse.json({
        permitido: true,
        razon: 'Sin límites como superadmin',
        limites: {
          usuarios: { actual: 0, limite: null, disponible: null },
          productos: { actual: 0, limite: null, disponible: null },
          terminales: { actual: 0, limite: null, disponible: null }
        }
      });
    }

    const empresaId = session.user.empresaId as string;

    if (!empresaId) {
      return NextResponse.json({
        permitido: false,
        razon: 'Usuario no asociado a empresa',
        accionRequerida: 'contactar_soporte'
      });
    }

    // Validar límites de uso
    const resultado = await validarLimitesUso(empresaId);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error al validar límites:", error);
    return NextResponse.json(
      {
        permitido: false,
        razon: "Error interno del servidor"
      },
      { status: 500 }
    );
  }
}

// POST - Validar antes de crear un recurso específico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { tipoRecurso, cantidad = 1 } = await request.json();

    if (!tipoRecurso || !['usuarios', 'productos', 'terminales'].includes(tipoRecurso)) {
      return NextResponse.json({
        error: "Tipo de recurso inválido. Debe ser: usuarios, productos o terminales"
      }, { status: 400 });
    }

    // Si es superadmin, siempre permitir
    if (session.user.role === 'SUPERADMIN') {
      return NextResponse.json({
        permitido: true,
        razon: 'Sin límites como superadmin'
      });
    }

    const empresaId = session.user.empresaId as string;

    if (!empresaId) {
      return NextResponse.json({
        permitido: false,
        razon: 'Usuario no asociado a empresa',
        accionRequerida: 'contactar_soporte'
      });
    }

    // Validar límites actuales
    const validacionLimites = await validarLimitesUso(empresaId);

    if (!validacionLimites.permitido) {
      return NextResponse.json(validacionLimites);
    }

    // Si no hay límites en el plan, permitir
    const plan = validacionLimites.planActual;
    if (!plan) {
      return NextResponse.json({
        permitido: false,
        razon: 'No se pudo obtener información del plan'
      });
    }

    // Verificar límite específico para el tipo de recurso
    const campoLimite = `limites${tipoRecurso.charAt(0).toUpperCase() + tipoRecurso.slice(1)}`;
    // @ts-expect-error Mismatch de tipos Prisma u obj temporal
    const limite = plan[campoLimite];

    if (!limite) {
      // Sin límite para este recurso
      return NextResponse.json({
        permitido: true,
        razon: `Sin límite para ${tipoRecurso}`
      });
    }

    // Obtener conteo actual del recurso específico
    const { db } = await import("@/lib/db");

    let conteoActual = 0;
    switch (tipoRecurso) {
      case 'usuarios':
        conteoActual = await db.usuario.count({ where: { empresaId } });
        break;
      case 'productos':
        conteoActual = await db.producto.count({ where: { empresaId } });
        break;
      case 'terminales':
        conteoActual = await db.terminal.count({ where: { empresaId } });
        break;
    }

    const nuevoTotal = conteoActual + cantidad;

    if (nuevoTotal > limite) {
      return NextResponse.json({
        permitido: false,
        razon: `Límite de ${tipoRecurso} excedido. Actual: ${conteoActual}, Límite: ${limite}, Intentando agregar: ${cantidad}`,
        limiteAlcanzado: tipoRecurso,
        planActual: plan,
        accionRequerida: 'upgrade',
        detalles: {
          actual: conteoActual,
          limite: limite,
          intentandoAgregar: cantidad,
          disponible: limite - conteoActual
        }
      });
    }

    return NextResponse.json({
      permitido: true,
      razon: `Puede agregar ${cantidad} ${tipoRecurso}`,
      detalles: {
        actual: conteoActual,
        limite: limite,
        despuesDeAgregar: nuevoTotal,
        disponible: limite - nuevoTotal
      }
    });

  } catch (error) {
    console.error("Error al validar creación de recurso:", error);
    return NextResponse.json(
      {
        permitido: false,
        razon: "Error interno del servidor"
      },
      { status: 500 }
    );
  }
}
