import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

import { type Decimal } from "@prisma/client/runtime/library";

export interface ValidationResult {
  permitido: boolean;
  razon?: string;
  planActual?: {
    id: string;
    nombre: string;
    precio: Decimal | number;
    habilitarReportes?: boolean;
    habilitarMultiUsuario?: boolean;
    habilitarInventario?: boolean;
    habilitarServicios?: boolean;
    limitesUsuarios?: number | null;
    limitesProductos?: number | null;
    limitesTerminales?: number | null;
  };
  limiteAlcanzado?: string;
  accionRequerida?: 'upgrade' | 'contactar_soporte' | 'renovar';
}

export interface PlanLimits {
  usuarios?: number;
  productos?: number;
  terminales?: number;
  ventasMensuales?: number;
}

// Funcionalidades que requieren validación de plan
export const FUNCIONALIDADES_PREMIUM = {
  // Gestión avanzada
  'reportes_avanzados': ['habilitarReportes'],
  'multiusuario': ['habilitarMultiUsuario'],
  'inventario_avanzado': ['habilitarInventario'],
  'servicios_citas': ['habilitarServicios'],

  // Endpoints específicos
  '/api/reportes': ['habilitarReportes'],
  '/api/usuarios': ['habilitarMultiUsuario'],
  '/api/servicios': ['habilitarServicios'],
  '/api/citas': ['habilitarServicios'],
  '/api/productos/*/variantes': ['habilitarInventario'],
} as const;

// NUEVO: Rutas bloqueadas para superadmin (solo dashboard, no API)
export const RUTAS_BLOQUEADAS_SUPERADMIN = [
  '/dashboard/configuracion'
] as const;

/**
 * Valida si un superadmin puede acceder a una ruta específica
 */
function validarAccesoSuperAdmin(pathname: string): ValidationResult {
  // Verificar si la ruta está bloqueada para superadmin
  const rutaBloqueada = RUTAS_BLOQUEADAS_SUPERADMIN.some(ruta => 
    pathname.startsWith(ruta)
  );

  if (rutaBloqueada) {
    return {
      permitido: false,
      razon: 'Los superadministradores no pueden acceder directamente a configuración desde el dashboard',
      accionRequerida: 'contactar_soporte'
    };
  }

  return { permitido: true };
}

/**
 * Obtiene la suscripción activa de una empresa
 */
export async function obtenerSuscripcionActiva(empresaId: string) {
  try {
    const suscripcion = await db.suscripcion.findFirst({
      where: {
        empresaId,
        estado: 'ACTIVA',
        fechaFin: {
          gte: new Date()
        }
      },
      include: {
        plan: true,
        empresa: true
      },
      orderBy: {
        fechaFin: 'desc'
      }
    });

    return suscripcion;
  } catch (error) {
    console.error('Error al obtener suscripción:', error);
    return null;
  }
}

/**
 * Valida si una empresa puede acceder a una funcionalidad específica
 */
export async function validarAccesoFuncionalidad(
  empresaId: string,
  funcionalidad: keyof typeof FUNCIONALIDADES_PREMIUM
): Promise<ValidationResult> {
  try {
    // Si es superadmin, siempre permitir
    if (!empresaId) {
      return { permitido: true };
    }

    const suscripcion = await obtenerSuscripcionActiva(empresaId);

    if (!suscripcion) {
      return {
        permitido: false,
        razon: 'No hay suscripción activa',
        accionRequerida: 'contactar_soporte'
      };
    }

    // Verificar si la suscripción está vencida
    if (new Date() > suscripcion.fechaFin) {
      await marcarEmpresaComoVencida(empresaId);
      return {
        permitido: false,
        razon: 'Suscripción vencida',
        accionRequerida: 'renovar'
      };
    }

    const caracteristicasRequeridas = FUNCIONALIDADES_PREMIUM[funcionalidad];
    if (!caracteristicasRequeridas) {
      return { permitido: true }; // Funcionalidad base
    }

    // Verificar características del plan
    for (const caracteristica of caracteristicasRequeridas) {
      if (!suscripcion.plan[caracteristica]) {
        return {
          permitido: false,
          razon: `Plan ${suscripcion.plan.nombre} no incluye: ${caracteristica}`,
          planActual: suscripcion.plan,
          accionRequerida: 'upgrade'
        };
      }
    }

    return {
      permitido: true,
      planActual: suscripcion.plan
    };

  } catch (error) {
    console.error('Error en validación de acceso:', error);
    return {
      permitido: false,
      razon: 'Error interno de validación'
    };
  }
}

/**
 * Valida límites de uso (usuarios, productos, etc.)
 */
export async function validarLimitesUso(empresaId: string): Promise<ValidationResult> {
  try {
    const suscripcion = await obtenerSuscripcionActiva(empresaId);

    if (!suscripcion) {
      return {
        permitido: false,
        razon: 'No hay suscripción activa'
      };
    }

    const plan = suscripcion.plan;
    const empresa = suscripcion.empresa;

    // Obtener conteos actuales
    const [usuariosCount, productosCount, terminalesCount] = await Promise.all([
      db.usuario.count({ where: { empresaId } }),
      db.producto.count({ where: { empresaId } }),
      db.terminal.count({ where: { empresaId } })
    ]);

    // Validar límites
    const limites: Array<{nombre: string, actual: number, limite?: number}> = [
      { nombre: 'usuarios', actual: usuariosCount, limite: plan.limitesUsuarios ?? undefined },
      { nombre: 'productos', actual: productosCount, limite: plan.limitesProductos ?? undefined },
      { nombre: 'terminales', actual: terminalesCount, limite: plan.limitesTerminales ?? undefined }
    ];

    for (const limite of limites) {
      if (limite.limite && limite.actual >= limite.limite) {
        return {
          permitido: false,
          razon: `Límite de ${limite.nombre} alcanzado (${limite.actual}/${limite.limite})`,
          limiteAlcanzado: limite.nombre,
          planActual: plan,
          accionRequerida: 'upgrade'
        };
      }
    }

    return { permitido: true, planActual: plan };

  } catch (error) {
    console.error('Error al validar límites:', error);
    return {
      permitido: false,
      razon: 'Error al validar límites'
    };
  }
}

/**
 * Middleware principal para validar suscripciones.
 * 
 * IMPORTANTE: Este middleware se ejecuta en Edge Runtime.
 * NO se deben hacer queries a la BD aquí (Prisma no funciona en Edge).
 * Las validaciones se basan en flags del JWT token, que se setean durante el login.
 * Para validaciones más profundas, usar las funciones de API (validarAccesoFuncionalidad, etc.)
 * directamente en los API routes.
 */
export async function subscriptionMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const { pathname } = request.nextUrl;

    // Rutas que no requieren validación
    const rutasExcluidas = [
      '/api/auth',
      '/api/registro',
      '/iniciar-sesion',
      '/registro',
      '/cuenta-inactiva',
      '/_next',
      '/favicon',
      '/api/administrador' // Rutas de superadmin
    ];

    if (rutasExcluidas.some(ruta => pathname.startsWith(ruta))) {
      return null; // Continuar sin validación
    }

    // Obtener token de usuario (solo lectura de JWT, sin DB)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // Validar acceso de superadmin a rutas bloqueadas
    if (token?.role === 'SUPERADMIN') {
      const validacionSuperAdmin = validarAccesoSuperAdmin(pathname);
      
      if (!validacionSuperAdmin.permitido) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            {
              error: 'Acceso denegado',
              razon: validacionSuperAdmin.razon,
              accionRequerida: validacionSuperAdmin.accionRequerida
            },
            { status: 403 }
          );
        }
        
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        url.searchParams.set('error', 'acceso_denegado');
        url.searchParams.set('mensaje', validacionSuperAdmin.razon || '');
        return NextResponse.redirect(url);
      }
      
      return null;
    }

    if (!token?.empresaId) {
      return null;
    }

    // SOLO bloquear si la empresa está explícitamente inactiva
    // sinSuscripcion sola NO bloquea (empresa activa sin fecha = sin restricción)
    if (token.empresaInactiva) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: 'Empresa inactiva',
            razon: 'La empresa ha sido desactivada',
            accionRequerida: 'renovar'
          },
          { status: 403 }
        );
      }

      if (pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone();
        url.pathname = '/cuenta-inactiva';
        return NextResponse.redirect(url);
      }
    }

    // Si sinSuscripcion pero empresa NO inactiva, permitir con advertencia en header
    if (token.sinSuscripcion && !token.empresaInactiva) {
      const response = NextResponse.next();
      response.headers.set('x-suscripcion-vencida', 'true');
      return response;
    }

    // Verificar funcionalidades premium basado en la ruta
    const esFuncionalidadPremium = Object.keys(FUNCIONALIDADES_PREMIUM)
      .some(key => pathname.startsWith(key));

    if (esFuncionalidadPremium && pathname.startsWith('/api/')) {
      const response = NextResponse.next();
      response.headers.set('x-requires-plan-validation', 'true');
      return response;
    }

    return null; // Continuar

  } catch (error) {
    console.error('Error en subscription middleware:', error);
    return null; // En caso de error, permitir acceso
  }
}

/**
 * Marca una empresa como vencida y la desactiva
 */
async function marcarEmpresaComoVencida(empresaId: string) {
  try {
    // @ts-expect-error Autofix Next15 o tipos implícitos
    await db.$transaction(async (tx) => {
      // Desactivar empresa
      await tx.empresa.update({
        where: { id: empresaId },
        data: {
          activa: false,
          notaDesactivacion: 'Suscripción vencida - Desactivación automática'
        }
      });

      // Marcar suscripciones como expiradas
      await tx.suscripcion.updateMany({
        where: {
          empresaId,
          estado: 'ACTIVA'
        },
        data: { estado: 'EXPIRADA' }
      });

      // Log de auditoría
      await tx.auditoriaLog.create({
        data: {
          tabla: 'Empresa',
          registroId: empresaId,
          accion: 'DESACTIVAR',
          datosNuevos: { activa: false, motivo: 'Suscripción vencida' },
          usuarioEmail: 'SISTEMA',
          usuarioRol: 'SISTEMA',
          empresaId,
          notas: "Desactivación automática por vencimiento de suscripción"
        }
      });
    });

  } catch (error) {
    console.error('Error al marcar empresa como vencida:', error);
  }
}

/**
 * Obtiene empresas próximas a vencer (para notificaciones)
 */
export async function obtenerEmpresasProximasVencer(diasAnticipacion = 7) {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const empresasProximasVencer = await db.empresa.findMany({
      where: {
        activa: true,
        fechaVencimiento: {
          gte: new Date(),
          lte: fechaLimite
        }
      },
      include: {
        suscripciones: {
          where: { estado: 'ACTIVA' },
          include: { plan: true }
        }
      }
    });

    const ahora = new Date();
    // @ts-expect-error Autofix Next15 o tipos implícitos
    return empresasProximasVencer.map(empresa => {
      const fechaVencimiento = empresa.fechaVencimiento;
      if (!fechaVencimiento) {
        return null;
      }

      const diasRestantes = Math.ceil(
        (fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: empresa.id,
        nombre: empresa.nombre,
        email: empresa.email,
        fechaVencimiento: empresa.fechaVencimiento,
        diasRestantes,
        planActual: empresa.suscripciones[0]?.plan?.nombre || 'Sin plan'
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error al obtener empresas próximas a vencer:', error);
    return [];
  }
}

/**
 * Ejecuta tareas automáticas de verificación
 */
export async function ejecutarTareasAutomaticas() {
  try {
    const ahora = new Date();

    // Obtener empresas vencidas
    const empresasVencidas = await db.empresa.findMany({
      where: {
        activa: true,
        fechaVencimiento: {
          lt: ahora
        }
      }
    });

    // Marcar como vencidas
    for (const empresa of empresasVencidas) {
      await marcarEmpresaComoVencida(empresa.id);
    }

    // Enviar notificaciones de próximo vencimiento
    const empresasProximasVencer = await obtenerEmpresasProximasVencer(7);

    for (const empresa of empresasProximasVencer) {
      if (empresa) {
        await enviarNotificacionVencimiento(empresa.id, empresa.diasRestantes);
      }
    }

    return {
      empresasVencidas: empresasVencidas.length,
      notificacionesEnviadas: empresasProximasVencer.length,
      ejecutadoEn: ahora
    };

  } catch (error) {
    console.error('Error en tareas automáticas:', error);
    throw error;
  }
}

/**
 * Envía notificación de vencimiento próximo
 */
async function enviarNotificacionVencimiento(empresaId: string, diasRestantes: number) {
  try {
    let mensaje = '';

    switch (true) {
      case diasRestantes <= 1:
        mensaje = "Su suscripción vence HOY. Renueve inmediatamente para evitar interrupciones.";
        break;
      case diasRestantes <= 3:
        mensaje = `Su suscripción vence en ${diasRestantes} días. Renueve pronto para evitar interrupciones.`;
        break;
      case diasRestantes <= 7:
        mensaje = `Su suscripción vence en ${diasRestantes} días. Le recomendamos renovar pronto.`;
        break;
      default:
        mensaje = "Su suscripción ha vencido. Su cuenta ha sido suspendida. Contacte soporte para renovar.";
        break;
    }

    // Aquí integrarías con tu sistema de notificaciones (email, SMS, etc.)
    // Guardar notificación en la base de datos
    const ahora = new Date();
    const fechaMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    const fechaDia = `${fechaMes}-${String(ahora.getDate()).padStart(2, '0')}`;

    await db.metricaUso.create({
      data: {
        tipo: 'EMPRESA',
        entidad: 'notificacion',
        entidadId: empresaId,
        evento: 'vencimiento_proximo',
        datos: { mensaje, diasRestantes },
        empresaId,
        fechaMes,
        fechaDia,
      }
    });

  } catch (error) {
    console.error('Error al enviar notificación:', error);
  }
}

/**
 * Verifica suscripciones vencidas y las marca
 */
export async function verificarSuscripcionesVencidas() {
  try {
    const ahora = new Date();

    const suscripcionesVencidas = await db.suscripcion.findMany({
      where: {
        estado: 'ACTIVA',
        fechaFin: {
          lt: ahora
        }
      },
      include: {
        empresa: true
      }
    });

    for (const suscripcion of suscripcionesVencidas) {
      await marcarEmpresaComoVencida(suscripcion.empresaId);
    }

    return {
      suscripcionesVencidas: suscripcionesVencidas.length,
      verificadoEn: ahora
    };

  } catch (error) {
    console.error('Error al verificar suscripciones vencidas:', error);
    throw error;
  }
}