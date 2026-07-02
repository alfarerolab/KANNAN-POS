import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquemas de validación
const VarianteCreateSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  sku: z.string().optional(),
  codigoBarras: z.string().optional(),
  precio: z.number().min(0, "El precio debe ser mayor o igual a 0").optional(),
  precioPorKilo: z.number().min(0).optional(),
  precioPorGramo: z.number().min(0).optional(),
  precioPorMetro: z.number().min(0).optional(),
  precioPorLitro: z.number().min(0).optional(),
  enStock: z.number().int().min(0, "El stock debe ser mayor o igual a 0").default(0),
  stockMinimo: z.number().int().min(0).optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  peso: z.number().min(0).optional(),
  dimensiones: z.string().optional(),
  imagen: z.string().url().optional().or(z.literal("")),
  activa: z.boolean().default(true),
  atributosExtra: z.record(z.any()).optional(),
  // Campos de IVA
  esExentoIva: z.boolean().default(false),
  tarifaIva: z.number().min(0).max(100).optional(),
  incluyeIva: z.boolean().default(false),
  // Fechas de vencimiento y lotes
  fechaVencimiento: z.string().optional(),
  lote: z.string().optional(),
  fechaProduccion: z.string().optional()
});

const VarianteUpdateSchema = VarianteCreateSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const incluirInactivas = searchParams.get('incluirInactivas') === 'true';
    const ordenarPor = searchParams.get('ordenarPor') || 'nombre';
    const orden = searchParams.get('orden') || 'asc';

    // Verificar que el producto existe y pertenece a la empresa
    const producto = await db.producto.findFirst({
      where: {
        id: params.id,
        empresaId: session.user.empresaId
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Construir filtros
    const whereClause: any = {
      productoId: params.id
    };

    if (!incluirInactivas) {
      whereClause.activa = true;
    }

    // Construir ordenamiento
    const orderBy: any = {};
    orderBy[ordenarPor] = orden;

    const variantes = await db.varianteProducto.findMany({
      where: whereClause,
      include: {
        producto: {
          select: {
            nombre: true,
            tipoVenta: true,
            categoria: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy
    });

    // Calcular estadísticas de las variantes
    const estadisticas = {
      total: variantes.length,
      activas: variantes.filter(v => v.activa).length,
      inactivas: variantes.filter(v => !v.activa).length,
      conStock: variantes.filter(v => v.enStock > 0).length,
      sinStock: variantes.filter(v => v.enStock === 0).length,
      stockTotal: variantes.reduce((sum, v) => sum + v.enStock, 0),
      valorInventario: variantes.reduce((sum, v) => sum + (v.precio || 0) * v.enStock, 0)
    };

    return NextResponse.json({
      variantes,
      estadisticas,
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        tipoVenta: producto.tipoVenta
      }
    });
  } catch (error) {
    console.error('Error al obtener variantes:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // Validar datos de entrada
    const validatedData = VarianteCreateSchema.parse(body);

    // Verificar que el producto existe y pertenece a la empresa
    const producto = await db.producto.findFirst({
      where: {
        id: params.id,
        empresaId: session.user.empresaId
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // VALIDACIÓN: Verificar si se intenta usar funcionalidades no habilitadas
    if (validatedData.fechaVencimiento || validatedData.lote || validatedData.fechaProduccion) {
      const configuracion = await db.configuracionEmpresa.findFirst({
        where: { empresaId: session.user.empresaId },
        select: {
          habilitarVencimientos: true,
          habilitarLotes: true,
          configuracionInventario: true
        }
      });

      // Verificar vencimientos
      if (validatedData.fechaVencimiento) {
        const tieneVencimientos = configuracion?.habilitarVencimientos ||
          (configuracion?.configuracionInventario as any)?.manejarVencimientos;

        if (!tieneVencimientos) {
          return NextResponse.json({
            error: 'La funcionalidad de control de vencimientos no está habilitada. Por favor, actívala en la configuración de la empresa.',
            campo: 'fechaVencimiento'
          }, { status: 403 });
        }
      }

      // Verificar lotes
      if (validatedData.lote || validatedData.fechaProduccion) {
        const tieneLotes = configuracion?.habilitarLotes ||
          (configuracion?.configuracionInventario as any)?.manejarLotes;

        if (!tieneLotes) {
          return NextResponse.json({
            error: 'La funcionalidad de control de lotes no está habilitada. Por favor, actívala en la configuración de la empresa.',
            campo: 'lote'
          }, { status: 403 });
        }
      }
    }

    // Verificar unicidad de SKU si se proporciona
    if (validatedData.sku) {
      const skuExistente = await db.varianteProducto.findFirst({
        where: {
          sku: validatedData.sku,
          producto: {
            empresaId: session.user.empresaId
          }
        }
      });

      if (skuExistente) {
        return NextResponse.json({
          error: 'El SKU ya existe en otra variante',
          campo: 'sku'
        }, { status: 400 });
      }
    }

    // Verificar unicidad de código de barras si se proporciona
    if (validatedData.codigoBarras) {
      const codigoExistente = await db.varianteProducto.findFirst({
        where: {
          codigoBarras: validatedData.codigoBarras,
          producto: {
            empresaId: session.user.empresaId
          }
        }
      });

      if (codigoExistente) {
        return NextResponse.json({
          error: 'El código de barras ya existe en otra variante',
          campo: 'codigoBarras'
        }, { status: 400 });
      }
    }

    // Crear la variante
    const variante = await db.varianteProducto.create({
      data: {
        productoId: params.id,
        nombre: validatedData.nombre,
        sku: validatedData.sku,
        codigoBarras: validatedData.codigoBarras,
        precio: validatedData.precio,
        precioPorKilo: validatedData.precioPorKilo,
        precioPorGramo: validatedData.precioPorGramo,
        precioPorMetro: validatedData.precioPorMetro,
        precioPorLitro: validatedData.precioPorLitro,
        enStock: validatedData.enStock,
        stockMinimo: validatedData.stockMinimo,
        talla: validatedData.talla,
        color: validatedData.color,
        material: validatedData.material,
        peso: validatedData.peso,
        dimensiones: validatedData.dimensiones,
        imagen: validatedData.imagen,
        activa: validatedData.activa,
        atributosExtra: validatedData.atributosExtra,
        esExentoIva: validatedData.esExentoIva,
        tarifaIva: validatedData.tarifaIva,
        incluyeIva: validatedData.incluyeIva,
        fechaVencimiento: validatedData.fechaVencimiento ? new Date(validatedData.fechaVencimiento) : null,
        lote: validatedData.lote,
        fechaProduccion: validatedData.fechaProduccion ? new Date(validatedData.fechaProduccion) : null
      },
      include: {
        producto: {
          select: {
            nombre: true,
            tipoVenta: true
          }
        }
      }
    });

    return NextResponse.json(variante, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        detalles: error.errors.map(e => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }))
      }, { status: 400 });
    }

    console.error('Error al crear variante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { varianteId, ...updateData } = body;

    if (!varianteId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    // Validar datos de entrada
    const validatedData = VarianteUpdateSchema.parse(updateData);

    // Verificar que la variante existe y pertenece a la empresa
    const varianteExistente = await db.varianteProducto.findFirst({
      where: {
        id: varianteId,
        productoId: params.id,
        producto: {
          empresaId: session.user.empresaId
        }
      }
    });

    if (!varianteExistente) {
      return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }

    // VALIDACIÓN: Verificar si se intenta usar funcionalidades no habilitadas
    if (validatedData.fechaVencimiento || validatedData.lote || validatedData.fechaProduccion) {
      const configuracion = await db.configuracionEmpresa.findFirst({
        where: { empresaId: session.user.empresaId },
        select: {
          habilitarVencimientos: true,
          habilitarLotes: true,
          configuracionInventario: true
        }
      });

      // Verificar vencimientos
      if (validatedData.fechaVencimiento !== undefined) {
        const tieneVencimientos = configuracion?.habilitarVencimientos ||
          (configuracion?.configuracionInventario as any)?.manejarVencimientos;

        if (!tieneVencimientos && validatedData.fechaVencimiento) {
          return NextResponse.json({
            error: 'La funcionalidad de control de vencimientos no está habilitada. Por favor, actívala en la configuración de la empresa.',
            campo: 'fechaVencimiento'
          }, { status: 403 });
        }
      }

      // Verificar lotes
      if (validatedData.lote !== undefined || validatedData.fechaProduccion !== undefined) {
        const tieneLotes = configuracion?.habilitarLotes ||
          (configuracion?.configuracionInventario as any)?.manejarLotes;

        if (!tieneLotes && (validatedData.lote || validatedData.fechaProduccion)) {
          return NextResponse.json({
            error: 'La funcionalidad de control de lotes no está habilitada. Por favor, actívala en la configuración de la empresa.',
            campo: 'lote'
          }, { status: 403 });
        }
      }
    }

    // Verificar unicidad de SKU si se está actualizando
    if (validatedData.sku && validatedData.sku !== varianteExistente.sku) {
      const skuExistente = await db.varianteProducto.findFirst({
        where: {
          sku: validatedData.sku,
          id: { not: varianteId },
          producto: {
            empresaId: session.user.empresaId
          }
        }
      });

      if (skuExistente) {
        return NextResponse.json({
          error: 'El SKU ya existe en otra variante',
          campo: 'sku'
        }, { status: 400 });
      }
    }

    // Verificar unicidad de código de barras si se está actualizando
    if (validatedData.codigoBarras && validatedData.codigoBarras !== varianteExistente.codigoBarras) {
      const codigoExistente = await db.varianteProducto.findFirst({
        where: {
          codigoBarras: validatedData.codigoBarras,
          id: { not: varianteId },
          producto: {
            empresaId: session.user.empresaId
          }
        }
      });

      if (codigoExistente) {
        return NextResponse.json({
          error: 'El código de barras ya existe en otra variante',
          campo: 'codigoBarras'
        }, { status: 400 });
      }
    }

    // Actualizar la variante
    const varianteActualizada = await db.varianteProducto.update({
      where: { id: varianteId },
      data: {
        ...validatedData,
        fechaVencimiento: validatedData.fechaVencimiento ? new Date(validatedData.fechaVencimiento) : undefined,
        fechaProduccion: validatedData.fechaProduccion ? new Date(validatedData.fechaProduccion) : undefined
      },
      include: {
        producto: {
          select: {
            nombre: true,
            tipoVenta: true
          }
        }
      }
    });

    return NextResponse.json(varianteActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        detalles: error.errors.map(e => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }))
      }, { status: 400 });
    }

    console.error('Error al actualizar variante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const varianteId = searchParams.get('varianteId');

    if (!varianteId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    // Verificar que la variante existe y pertenece a la empresa
    const variante = await db.varianteProducto.findFirst({
      where: {
        id: varianteId,
        productoId: params.id,
        producto: {
          empresaId: session.user.empresaId
        }
      }
    });

    if (!variante) {
      return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }

    // En lugar de eliminar físicamente, marcar como inactiva
    const varianteEliminada = await db.varianteProducto.update({
      where: { id: varianteId },
      data: {
        activa: false,
        fechaEliminacion: new Date()
      }
    });

    return NextResponse.json({
      mensaje: 'Variante eliminada correctamente',
      variante: varianteEliminada
    });
  } catch (error) {
    console.error('Error al eliminar variante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
