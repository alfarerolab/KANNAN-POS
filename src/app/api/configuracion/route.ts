import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schemas de validación
const configuracionPosSchema = z.object({
  mostrarStock: z.boolean().default(true),
  permitirVentaSinStock: z.boolean().default(false),
  impresionAutomatica: z.boolean().default(false),
  formatoTicket: z.string().default('58mm'),
  mostrarLogos: z.boolean().default(true),
  sonidoVenta: z.boolean().default(true),
  mostrarServicios: z.boolean().default(false)
});

const configuracionFacturaSchema = z.object({
  numeracionAutomatica: z.boolean().default(true),
  prefijo: z.string().default(''),
  siguienteNumero: z.number().int().positive().default(1),
  incluirImpuestos: z.boolean().default(false),
  porcentajeImpuesto: z.number().min(0).max(100).default(0)
});

const configuracionInventarioSchema = z.object({
  alertaStockMinimo: z.boolean().default(true),
  actualizacionAutomatica: z.boolean().default(true),
  permitirStockNegativo: z.boolean().default(false),
  metodoValoracion: z.enum(['FIFO', 'LIFO', 'PROMEDIO']).default('FIFO'),
  manejarLotes: z.boolean().default(false),
  manejarVencimientos: z.boolean().default(false),
  inventarioAvanzado: z.boolean().default(false)
});

const configuracionSchema = z.object({
  tipoNegocio: z.enum([
    'TIENDA_COMIDA', 'TIENDA_BARRIO', 'FERRETERIA', 'PELUQUERIA', 'SALON_BELLEZA',
    'ROPA', 'RESTAURANTE', 'BAR', 'CAFETERIA', 'FARMACIA', 'LIBRERIA', 'ELECTRONICA',
    'VETERINARIA', 'SUPERMERCADO', 'SERVICIOS', 'SALUD', 'PROFESIONAL', 'MIXTO', 'PERSONALIZADO', 'OTRO'
  ]),
  habilitarServicios: z.boolean().default(false),
  habilitarCitas: z.boolean().default(false),
  habilitarVariantes: z.boolean().default(false),
  habilitarRecetas: z.boolean().default(false),
  habilitarLotes: z.boolean().default(false),
  habilitarVencimientos: z.boolean().default(false),
  habilitarInventarioAvanzado: z.boolean().default(false),
  habilitarReportes: z.boolean().default(false),
  habilitarMultiUsuarios: z.boolean().default(false),
  configuracionPos: configuracionPosSchema.default({}),
  configuracionFactura: configuracionFacturaSchema.default({}),
  configuracionInventario: configuracionInventarioSchema.default({})
});

// Helper para parsear campos JSON de Prisma de forma segura
function parsearConfigJson(valor: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  if (!valor) return fallback;
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return fallback;
    }
  }
  if (typeof valor === 'object') return valor as Record<string, unknown>;
  return fallback;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // SUPERADMIN: acceso completo
    if (session.user.role === 'SUPERADMIN') {
      const configuracion = await db.configuracionEmpresa.findUnique({
        where: { empresaId: session.user.empresaId },
        include: {
          empresa: {
            select: { id: true, nombre: true, email: true, tipoNegocio: true, bodegaHabilitada: true }
          }
        }
      });

      if (!configuracion) {
        const empresa = await db.empresa.findUnique({
          where: { id: session.user.empresaId },
          select: { id: true, nombre: true, email: true, tipoNegocio: true, bodegaHabilitada: true }
        });

        return NextResponse.json({
          id: `superadmin-default-${session.user.empresaId}`,
          empresaId: session.user.empresaId,
          tipoNegocio: empresa?.tipoNegocio || 'OTRO',
          habilitarServicios: true,
          habilitarCitas: true,
          habilitarVariantes: true,
          habilitarRecetas: true,
          habilitarLotes: true,
          habilitarVencimientos: true,
          habilitarInventarioAvanzado: true,
          habilitarReportes: true,
          habilitarMultiUsuarios: true,
          configuracionPos: {
            mostrarStock: true, permitirVentaSinStock: true, impresionAutomatica: false,
            formatoTicket: '58mm', mostrarLogos: true, sonidoVenta: true, mostrarServicios: true
          },
          configuracionFactura: {
            numeracionAutomatica: true, prefijo: '', siguienteNumero: 1,
            incluirImpuestos: false, porcentajeImpuesto: 0
          },
          configuracionInventario: {
            alertaStockMinimo: true, actualizacionAutomatica: true, permitirStockNegativo: false,
            metodoValoracion: 'FIFO', manejarLotes: true, manejarVencimientos: true, inventarioAvanzado: true
          },
          empresa: empresa || {
            id: session.user.empresaId, nombre: 'Empresa SUPERADMIN',
            email: session.user.email || '', tipoNegocio: 'OTRO', bodegaHabilitada: true
          }
        });
      }

      return NextResponse.json({
        ...configuracion,
        configuracionPos: parsearConfigJson(configuracion.configuracionPos),
        configuracionFactura: parsearConfigJson(configuracion.configuracionFactura),
        configuracionInventario: parsearConfigJson(configuracion.configuracionInventario)
      });
    }

    // Otros roles permitidos
    if (!['ADMINISTRADOR', 'ADMIN', 'GERENTE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const configuracion = await db.configuracionEmpresa.findUnique({
      where: { empresaId: session.user.empresaId },
      include: {
        empresa: {
          select: { id: true, nombre: true, email: true, tipoNegocio: true, bodegaHabilitada: true }
        }
      }
    });

    if (!configuracion) {
      return NextResponse.json(
        { error: 'Configuración no encontrada', needsSetup: true, message: 'La empresa necesita completar la configuración inicial' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...configuracion,
      configuracionPos: parsearConfigJson(configuracion.configuracionPos),
      configuracionFactura: parsearConfigJson(configuracion.configuracionFactura),
      configuracionInventario: parsearConfigJson(configuracion.configuracionInventario)
    });

  } catch (error) {
    console.error('❌ Error en GET /api/configuracion:', error);

    let errorMessage = 'Error interno del servidor';
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Error de conexión a la base de datos';
      } else if (error.message.includes('Prisma')) {
        errorMessage = 'Error de base de datos';
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para modificar configuración' }, { status: 403 });
    }

    // FIX: Capturar valores de sesión antes de la transacción para evitar pérdida de contexto
    const empresaId = session.user.empresaId;
    const usuarioId = session.user.id;
    const usuarioEmail = session.user.email || '';
    const usuarioRol = session.user.role;
    const configuracionCompletada = session.user.configuracionCompletada;

    if (!empresaId || !usuarioId) {
      return NextResponse.json({ error: 'Sesión inválida, vuelve a iniciar sesión' }, { status: 401 });
    }

    // Parsear body
    let body: unknown;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Error al parsear JSON del body:', parseError);
      return NextResponse.json(
        { error: 'Datos JSON inválidos', details: parseError instanceof Error ? parseError.message : 'Error de parseo' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const bodyObj = body as Record<string, unknown>;

    if (!bodyObj.tipoNegocio) {
      return NextResponse.json({ error: 'El tipo de negocio es requerido' }, { status: 400 });
    }

    const pos = (bodyObj.configuracionPos || {}) as Record<string, unknown>;
    const factura = (bodyObj.configuracionFactura || {}) as Record<string, unknown>;
    const inventario = (bodyObj.configuracionInventario || {}) as Record<string, unknown>;

    // Construir objeto de configuración con defaults seguros
    const configuracionData = {
      tipoNegocio: bodyObj.tipoNegocio,
      habilitarServicios: Boolean(bodyObj.habilitarServicios),
      habilitarCitas: Boolean(bodyObj.habilitarCitas),
      habilitarVariantes: Boolean(bodyObj.habilitarVariantes),
      habilitarRecetas: Boolean(bodyObj.habilitarRecetas),
      habilitarLotes: Boolean(bodyObj.habilitarLotes),
      habilitarVencimientos: Boolean(bodyObj.habilitarVencimientos),
      habilitarInventarioAvanzado: Boolean(bodyObj.habilitarInventarioAvanzado),
      habilitarReportes: Boolean(bodyObj.habilitarReportes),
      habilitarMultiUsuarios: Boolean(bodyObj.habilitarMultiUsuarios),
      configuracionPos: {
        mostrarStock: pos.mostrarStock ?? true,
        permitirVentaSinStock: pos.permitirVentaSinStock ?? false,
        impresionAutomatica: pos.impresionAutomatica ?? false,
        formatoTicket: pos.formatoTicket ?? '58mm',
        mostrarLogos: pos.mostrarLogos ?? true,
        sonidoVenta: pos.sonidoVenta ?? true,
        mostrarServicios: pos.mostrarServicios ?? Boolean(bodyObj.habilitarServicios)
      },
      configuracionFactura: {
        numeracionAutomatica: factura.numeracionAutomatica ?? true,
        prefijo: factura.prefijo ?? '',
        siguienteNumero: factura.siguienteNumero ?? 1,
        incluirImpuestos: factura.incluirImpuestos ?? false,
        porcentajeImpuesto: factura.porcentajeImpuesto ?? 0
      },
      configuracionInventario: {
        alertaStockMinimo: inventario.alertaStockMinimo ?? true,
        actualizacionAutomatica: inventario.actualizacionAutomatica ?? true,
        permitirStockNegativo: inventario.permitirStockNegativo ?? false,
        metodoValoracion: inventario.metodoValoracion ?? 'FIFO',
        manejarLotes: inventario.manejarLotes ?? Boolean(bodyObj.habilitarLotes),
        manejarVencimientos: inventario.manejarVencimientos ?? Boolean(bodyObj.habilitarVencimientos),
        inventarioAvanzado: inventario.inventarioAvanzado ?? Boolean(bodyObj.habilitarInventarioAvanzado)
      }
    };

    // Validar con Zod
    let configuracionValidada: z.infer<typeof configuracionSchema>;
    try {
      configuracionValidada = configuracionSchema.parse(configuracionData);
    } catch (zodError) {
      console.error('❌ Error de validación Zod:', zodError);
      if (zodError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: zodError.errors, receivedData: configuracionData },
          { status: 400 }
        );
      }
      throw zodError;
    }

    // FIX: Tipado explícito en la transacción para evitar el @ts-expect-error
    const result = await db.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      // Verificar configuración existente
      const configuracionExistente = await tx.configuracionEmpresa.findUnique({
        where: { empresaId }
      });

      let configuracion;

      const datosComunes = {
        tipoNegocio: configuracionValidada.tipoNegocio,
        habilitarServicios: configuracionValidada.habilitarServicios,
        habilitarCitas: configuracionValidada.habilitarCitas,
        habilitarVariantes: configuracionValidada.habilitarVariantes,
        habilitarRecetas: configuracionValidada.habilitarRecetas,
        habilitarLotes: configuracionValidada.habilitarLotes,
        habilitarVencimientos: configuracionValidada.habilitarVencimientos,
        habilitarInventarioAvanzado: configuracionValidada.habilitarInventarioAvanzado,
        habilitarReportes: configuracionValidada.habilitarReportes,
        habilitarMultiUsuarios: configuracionValidada.habilitarMultiUsuarios,
        configuracionPos: JSON.stringify(configuracionValidada.configuracionPos),
        configuracionFactura: JSON.stringify(configuracionValidada.configuracionFactura),
        configuracionInventario: JSON.stringify(configuracionValidada.configuracionInventario)
      };

      const includeEmpresa = {
        empresa: {
          select: { id: true, nombre: true, email: true, tipoNegocio: true, bodegaHabilitada: true }
        }
      };

      if (configuracionExistente) {
        configuracion = await tx.configuracionEmpresa.update({
          where: { id: configuracionExistente.id },
          data: datosComunes,
          include: includeEmpresa
        });
      } else {
        configuracion = await tx.configuracionEmpresa.create({
          data: { empresaId, ...datosComunes },
          include: includeEmpresa
        });
      }

      // Marcar configuración como completada si aplica
      if (!configuracionExistente || configuracionCompletada === false) {
        await tx.usuario.update({
          where: { id: usuarioId },
          data: { configuracionCompletada: true }
        });
      }

      // Actualizar tipo de negocio en la empresa
      await tx.empresa.update({
        where: { id: empresaId },
        data: { tipoNegocio: configuracionValidada.tipoNegocio }
      });

      // FIX: Consultar bodegaHabilitada por separado para evitar acceso undefined
      if (configuracionValidada.configuracionInventario?.inventarioAvanzado) {
        const empresa = await tx.empresa.findUnique({
          where: { id: empresaId },
          select: { bodegaHabilitada: true }
        });

        if (!empresa?.bodegaHabilitada) {
          await tx.empresa.update({
            where: { id: empresaId },
            data: { bodegaHabilitada: true }
          });

          const bodegaExistente = await tx.bodega.findFirst({
            where: { empresaId }
          });

          if (!bodegaExistente) {
            await tx.bodega.create({
              data: {
                nombre: 'Bodega Principal',
                descripcion: 'Bodega principal del sistema',
                empresaId
              }
            });
          }
        }
      }

      // FIX: Auditoría envuelta en try/catch — no debe bloquear el guardado principal
      try {
        await tx.auditoriaLog.create({
          data: {
            tabla: 'ConfiguracionEmpresa',
            registroId: configuracion.id,
            accion: configuracionExistente ? 'ACTUALIZAR' : 'CREAR',
            datosNuevos: JSON.stringify(configuracionValidada),
            usuarioId,
            usuarioEmail,
            usuarioRol,
            empresaId,
            notas: configuracionExistente
              ? 'Configuración actualizada desde panel'
              : 'Configuración inicial completada'
          }
        });
      } catch (auditError) {
        // La auditoría falla silenciosamente — no debe romper el flujo principal
        console.error('⚠️ Error al registrar auditoría (no crítico):', auditError);
      }

      return configuracion;
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      configuracion: result,
      isInitialSetup: configuracionCompletada === false
    });

  } catch (error) {
    console.error('❌ Error en PUT /api/configuracion:', error);

    if (error instanceof Error) {
      console.error('Nombre:', error.name);
      console.error('Mensaje:', error.message);
      if ('cause' in error) {
        console.error('Causa:', error.cause);
      }
      console.error('Stack:', error.stack);
    }

    // Errores específicos de Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: unknown };

      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ya existe una configuración para esta empresa' },
          { status: 409 }
        );
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'No se encontró el registro a actualizar' },
          { status: 404 }
        );
      }

      console.error('Código Prisma:', prismaError.code, '| Meta:', prismaError.meta);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors, message: 'Los datos enviados no cumplen con el formato requerido' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Error interno',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Datos JSON inválidos' }, { status: 400 });
    }

    const { empresaId, ...configuracionData } = body as { empresaId: string } & Record<string, unknown>;

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId es requerido' }, { status: 400 });
    }

    const datosValidados = configuracionSchema.parse(configuracionData);

    const datosComunes = {
      tipoNegocio: datosValidados.tipoNegocio,
      habilitarServicios: datosValidados.habilitarServicios,
      habilitarCitas: datosValidados.habilitarCitas,
      habilitarVariantes: datosValidados.habilitarVariantes,
      habilitarRecetas: datosValidados.habilitarRecetas,
      habilitarLotes: datosValidados.habilitarLotes,
      habilitarVencimientos: datosValidados.habilitarVencimientos,
      habilitarInventarioAvanzado: datosValidados.habilitarInventarioAvanzado,
      habilitarReportes: datosValidados.habilitarReportes,
      habilitarMultiUsuarios: datosValidados.habilitarMultiUsuarios,
      configuracionPos: JSON.stringify(datosValidados.configuracionPos),
      configuracionFactura: JSON.stringify(datosValidados.configuracionFactura),
      configuracionInventario: JSON.stringify(datosValidados.configuracionInventario)
    };

    const configuracion = await db.configuracionEmpresa.upsert({
      where: { empresaId },
      update: datosComunes,
      create: { empresaId, ...datosComunes },
      include: {
        empresa: {
          select: { id: true, nombre: true, email: true, tipoNegocio: true, bodegaHabilitada: true }
        }
      }
    });

    return NextResponse.json(configuracion);

  } catch (error) {
    console.error('❌ Error en POST /api/configuracion:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Error interno'
      },
      { status: 500 }
    );
  }
}