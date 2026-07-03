import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { validarAccesoFuncionalidad, FUNCIONALIDADES_PREMIUM } from "@/lib/subscription-middleware";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { funcionalidad } = await request.json();

    if (!funcionalidad) {
      return NextResponse.json({ error: "Funcionalidad requerida" }, { status: 400 });
    }

    // Verificar que la funcionalidad existe
    if (!(funcionalidad in FUNCIONALIDADES_PREMIUM)) {
      return NextResponse.json({ error: "Funcionalidad no válida" }, { status: 400 });
    }

    // Si es superadmin, siempre permitir
    if (session.user.role === 'SUPERADMIN') {
      return NextResponse.json({
        permitido: true,
        razon: 'Acceso completo como superadmin'
      });
    }

    // Obtener empresaId del usuario
    const empresaId = session.user.empresaId as string;

    if (!empresaId) {
      return NextResponse.json({
        permitido: false,
        razon: 'Usuario no asociado a empresa',
        accionRequerida: 'contactar_soporte'
      });
    }

    // Validar acceso a la funcionalidad
    const resultado = await validarAccesoFuncionalidad(empresaId, funcionalidad);

    return NextResponse.json(resultado);

  } catch (error) {
    console.error("Error al validar acceso:", error);
    return NextResponse.json(
      {
        permitido: false,
        razon: "Error interno del servidor"
      },
      { status: 500 }
    );
  }
}

// GET - Obtener lista de funcionalidades y su estado
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Si es superadmin, todas las funcionalidades están permitidas
    if (session.user.role === 'SUPERADMIN') {
      const funcionesCompletas = Object.keys(FUNCIONALIDADES_PREMIUM).reduce((acc: Record<string, { permitido: boolean; razon: string }>, func) => {
        acc[func] = { permitido: true, razon: 'Acceso completo' };
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json(funcionesCompletas);
    }

    const empresaId = session.user.empresaId as string;

    if (!empresaId) {
      return NextResponse.json({ error: "Usuario no asociado a empresa" }, { status: 400 });
    }

    // Validar todas las funcionalidades
    const validaciones: Record<string, any> = {};

    for (const funcionalidad of Object.keys(FUNCIONALIDADES_PREMIUM)) {
      try {
        const resultado = await validarAccesoFuncionalidad(
          empresaId,
          funcionalidad as keyof typeof FUNCIONALIDADES_PREMIUM
        );
        validaciones[funcionalidad] = resultado;
      } catch (error) {
        console.error(`Error validando ${funcionalidad}:`, error);
        validaciones[funcionalidad] = {
          permitido: false,
          razon: 'Error de validación'
        };
      }
    }

    return NextResponse.json(validaciones);

  } catch (error) {
    console.error("Error al validar funcionalidades:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
