import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { obtenerSuscripcionActiva } from "@/lib/subscription-middleware";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Si es superadmin, siempre activo
    if (session.user.role === 'SUPERADMIN') {
      return NextResponse.json({
        activa: true,
        suscripcionActiva: true,
        plan: {
          nombre: 'Superadmin',
          habilitarReportes: true,
          habilitarMultiUsuario: true,
          habilitarInventario: true,
          habilitarServicios: true,
        },
        limites: null,
        accionRequerida: null
      });
    }

    // Obtener información del usuario y empresa
    const usuario = await db.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        empresa: true
      }
    });

    if (!usuario || !usuario.empresa) {
      return NextResponse.json({ error: "Usuario o empresa no encontrada" }, { status: 404 });
    }

    const empresa = usuario.empresa;
    const empresaId = empresa.id;

    // Obtener suscripción activa
    const suscripcion = await obtenerSuscripcionActiva(empresaId);

    // Verificar estado de la empresa
    const estadoEmpresa = {
      activa: empresa.activa,
      suscripcionActiva: !!suscripcion && new Date() <= suscripcion.fechaFin,
      fechaVencimiento: empresa.fechaVencimiento,
      notaDesactivacion: empresa.notaDesactivacion
    };

    // Si no hay suscripción activa
    if (!suscripcion) {
      return NextResponse.json({
        ...estadoEmpresa,
        plan: null,
        limites: null,
        accionRequerida: empresa.activa ? 'contactar_soporte' : 'renovar'
      });
    }

    // Obtener conteos actuales para límites
    const [usuariosCount, productosCount, terminalesCount] = await Promise.all([
      db.usuario.count({ where: { empresaId } }),
      db.producto.count({ where: { empresaId } }),
      db.terminal.count({ where: { empresaId } })
    ]);

    const limites = {
      usuarios: {
        actual: usuariosCount,
        limite: suscripcion.plan.limitesUsuarios,
        disponible: suscripcion.plan.limitesUsuarios ? suscripcion.plan.limitesUsuarios - usuariosCount : null
      },
      productos: {
        actual: productosCount,
        limite: suscripcion.plan.limitesProductos,
        disponible: suscripcion.plan.limitesProductos ? suscripcion.plan.limitesProductos - productosCount : null
      },
      terminales: {
        actual: terminalesCount,
        limite: suscripcion.plan.limitesTerminales,
        disponible: suscripcion.plan.limitesTerminales ? suscripcion.plan.limitesTerminales - terminalesCount : null
      }
    };

    // Determinar acción requerida
    let accionRequerida = null;

    if (!empresa.activa) {
      accionRequerida = 'renovar';
    } else if (new Date() > suscripcion.fechaFin) {
      accionRequerida = 'renovar';
    } else {
      // Verificar si algún límite está al 90%
      const limitesAltos = Object.values(limites).some(limite =>
        limite.limite && (limite.actual / limite.limite) >= 0.9
      );

      if (limitesAltos) {
        accionRequerida = 'upgrade';
      }
    }

    // Calcular días restantes
    const diasRestantes = suscripcion.fechaFin
      ? Math.ceil((suscripcion.fechaFin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      ...estadoEmpresa,
      plan: {
        id: suscripcion.plan.id,
        nombre: suscripcion.plan.nombre,
        descripcion: suscripcion.plan.descripcion,
        precio: suscripcion.plan.precio,
        meses: suscripcion.plan.meses,
        destacado: suscripcion.plan.destacado,
        habilitarReportes: suscripcion.plan.habilitarReportes,
        habilitarMultiUsuario: suscripcion.plan.habilitarMultiUsuario,
        habilitarInventario: suscripcion.plan.habilitarInventario,
        habilitarServicios: suscripcion.plan.habilitarServicios,
        limitesUsuarios: suscripcion.plan.limitesUsuarios,
        limitesProductos: suscripcion.plan.limitesProductos,
        limitesTerminales: suscripcion.plan.limitesTerminales,
      },
      suscripcion: {
        id: suscripcion.id,
        fechaInicio: suscripcion.fechaInicio,
        fechaFin: suscripcion.fechaFin,
        estado: suscripcion.estado,
        diasRestantes,
        precioTotal: suscripcion.precioTotal,
        descuentoAplicado: suscripcion.descuentoAplicado
      },
      limites,
      accionRequerida,
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        email: empresa.email,
        tipoNegocio: empresa.tipoNegocio
      }
    });

  } catch (error) {
    console.error("Error al obtener estado de empresa:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
