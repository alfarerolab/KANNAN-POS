import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, getClientIp, CONFIG_INICIAL_RATE_LIMIT } from '@/lib/rate-limit';
import { sanitizeInput } from '@/lib/sanitize';

// Aumentar límite del body para permitir imágenes en base64 (3 imágenes × ~2.7MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  nombreComercial: z.string().max(200).nullable().optional(),
  nit: z.string().max(50).nullable().optional(),
  telefono: z.string().max(30).nullable().optional(),
  direccion: z.string().max(300).nullable().optional(),
  ciudad: z.string().max(100).nullable().optional(),
  departamento: z.string().max(100).nullable().optional(),
  pais: z.string().max(100).default('Colombia'),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  logo: z.string().nullable().optional(),
  logoSecundario: z.string().nullable().optional(),
  imagenBanner: z.string().nullable().optional(),
});

const tipoNegocioEnum = z.enum([
  'TIENDA_COMIDA', 'TIENDA_BARRIO', 'FERRETERIA', 'PELUQUERIA', 'SALON_BELLEZA',
  'ROPA', 'RESTAURANTE', 'BAR', 'CAFETERIA', 'FARMACIA', 'LIBRERIA', 'ELECTRONICA',
  'VETERINARIA', 'SUPERMERCADO', 'SERVICIOS', 'SALUD', 'PROFESIONAL', 'MIXTO', 'PERSONALIZADO', 'OTRO',
]);

const bodySchema = z.object({
  empresa: empresaSchema,
  tipoNegocio: tipoNegocioEnum,
  habilitarServicios: z.boolean().default(false),
  habilitarCitas: z.boolean().default(false),
  habilitarVariantes: z.boolean().default(false),
  habilitarRecetas: z.boolean().default(false),
  habilitarLotes: z.boolean().default(false),
  habilitarVencimientos: z.boolean().default(false),
  habilitarInventarioAvanzado: z.boolean().default(false),
  habilitarReportes: z.boolean().default(false),
  habilitarMultiUsuarios: z.boolean().default(false),
});

// ─── GET /api/configuracion-inicial ──────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    { error: 'Este endpoint solo acepta POST', method: 'POST' },
    { status: 405 },
  );
}

// ─── POST /api/configuracion-inicial ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!['ADMINISTRADOR', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para esta acción' }, { status: 403 });
    }

    // Rate Limiting
    const clientIp = getClientIp(req);
    const rlCheck = checkRateLimit(CONFIG_INICIAL_RATE_LIMIT, clientIp);
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera un momento.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch (parseError) {
      const isTooBig =
        parseError instanceof Error &&
        (parseError.message.includes('too large') || parseError.message.includes('limit'));
      return NextResponse.json(
        {
          error: isTooBig
            ? 'Las imágenes son demasiado pesadas. Reduce su tamaño e intenta nuevamente.'
            : 'JSON inválido en el cuerpo de la solicitud',
        },
        { status: 400 },
      );
    }

    let datos: z.infer<typeof bodySchema>;
    try {
      datos = bodySchema.parse(body);
    } catch (zodError) {
      if (zodError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos inválidos', detalles: zodError.errors },
          { status: 400 },
        );
      }
      throw zodError;
    }

    const empresaId = session.user.empresaId;

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const resultado = await db.$transaction(async (tx) => {

      // 1. Actualizar datos de la empresa
      const empresa = await tx.empresa.update({
        where: { id: empresaId },
        data: {
          nombre: sanitizeInput(datos.empresa.nombre),
          nombreComercial: datos.empresa.nombreComercial ? sanitizeInput(datos.empresa.nombreComercial) : null,
          nit: datos.empresa.nit ? sanitizeInput(datos.empresa.nit) : null,
          telefono: datos.empresa.telefono ? sanitizeInput(datos.empresa.telefono) : null,
          direccion: datos.empresa.direccion ? sanitizeInput(datos.empresa.direccion) : null,
          ciudad: datos.empresa.ciudad ? sanitizeInput(datos.empresa.ciudad) : null,
          departamento: datos.empresa.departamento ? sanitizeInput(datos.empresa.departamento) : null,
          pais: sanitizeInput(datos.empresa.pais),
          email: datos.empresa.email ?? null,
          logo: datos.empresa.logo ?? null,
          logoSecundario: datos.empresa.logoSecundario ?? null,
          imagenBanner: datos.empresa.imagenBanner ?? null,
          tipoNegocio: datos.tipoNegocio,
        },
      });

      // 2. Construir configs derivadas (se guardan como JSON strings en LongText)
      const configPos = JSON.stringify({
        mostrarStock: true,
        permitirVentaSinStock: false,
        impresionAutomatica: false,
        formatoTicket: '58mm',
        mostrarLogos: true,
        sonidoVenta: true,
        mostrarServicios: datos.habilitarServicios,
      });

      const configFactura = JSON.stringify({
        numeracionAutomatica: true,
        prefijo: '',
        siguienteNumero: 1,
        incluirImpuestos: false,
        porcentajeImpuesto: 0,
      });

      const configInventario = JSON.stringify({
        alertaStockMinimo: true,
        actualizacionAutomatica: true,
        permitirStockNegativo: false,
        metodoValoracion: 'FIFO',
        manejarLotes: datos.habilitarLotes,
        manejarVencimientos: datos.habilitarVencimientos,
        inventarioAvanzado: datos.habilitarInventarioAvanzado,
      });

      // 3. Upsert configuración de la empresa
      const configuracionExistente = await tx.configuracionEmpresa.findUnique({
        where: { empresaId },
      });

      const dataConfig = {
        tipoNegocio: datos.tipoNegocio,
        habilitarServicios: datos.habilitarServicios,
        habilitarCitas: datos.habilitarCitas,
        habilitarVariantes: datos.habilitarVariantes,
        habilitarRecetas: datos.habilitarRecetas,
        habilitarLotes: datos.habilitarLotes,
        habilitarVencimientos: datos.habilitarVencimientos,
        habilitarInventarioAvanzado: datos.habilitarInventarioAvanzado,
        habilitarReportes: datos.habilitarReportes,
        habilitarMultiUsuarios: datos.habilitarMultiUsuarios,
        configuracionPos: configPos,
        configuracionFactura: configFactura,
        configuracionInventario: configInventario,
      };

      let configuracion;
      if (configuracionExistente) {
        configuracion = await tx.configuracionEmpresa.update({
          where: { id: configuracionExistente.id },
          data: dataConfig,
        });
      } else {
        configuracion = await tx.configuracionEmpresa.create({
          data: { empresaId, ...dataConfig },
        });
      }

      // 4. Marcar configuración como completada en el usuario
      await tx.usuario.update({
        where: { id: session.user.id },
        data: { configuracionCompletada: true },
      });

      // 5. Habilitar bodega si se activó inventario avanzado
      if (datos.habilitarInventarioAvanzado) {
        await tx.empresa.update({
          where: { id: empresaId },
          data: { bodegaHabilitada: true },
        });

        const bodegaExistente = await tx.bodega.findFirst({ where: { empresaId } });
        if (!bodegaExistente) {
          await tx.bodega.create({
            data: {
              nombre: 'Bodega Principal',
              descripcion: 'Bodega principal del sistema',
              empresaId,
            },
          });
        }
      }

      // 6. Registrar en auditoría
      await tx.auditoriaLog.create({
        data: {
          tabla: 'ConfiguracionEmpresa',
          registroId: configuracion.id,
          accion: configuracionExistente ? 'ACTUALIZAR' : 'CREAR',
          datosNuevos: JSON.stringify(dataConfig),
          usuarioId: session.user.id,
          usuarioEmail: session.user.email ?? '',
          usuarioRol: session.user.role,
          empresaId,
          notas: 'Configuración inicial completada',
        },
      });

      return { empresa, configuracion };
    },
      {
        timeout: 15000, // 15 segundos
        maxWait: 5000,  // espera máxima para obtener conexión
      });

    return NextResponse.json({
      success: true,
      mensaje: 'Configuración inicial guardada correctamente',
      empresaId: resultado.empresa.id,
      configuracionId: resultado.configuracion.id,
    });

  } catch (error) {
    console.error('Error en POST /api/configuracion-inicial:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        detalle: process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : undefined,
      },
      { status: 500 },
    );
  }
}