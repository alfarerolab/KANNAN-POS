import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Esquemas de validación
const VarianteCreateSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100),
  sku: z.string().optional(),
  codigoBarras: z.string().optional(),
  precio: z.coerce.number().min(0).optional(),         
  precioPorKilo: z.coerce.number().min(0).optional(),
  precioPorGramo: z.coerce.number().min(0).optional(),
  precioPorMetro: z.coerce.number().min(0).optional(),
  precioPorLitro: z.coerce.number().min(0).optional(),
  enStock: z.coerce.number().int().min(0).default(0),  
  stockMinimo: z.coerce.number().int().min(0).optional(),
  talla: z.string().optional(),
  color: z.string().optional(),
  material: z.string().optional(),
  peso: z.coerce.number().min(0).optional(),
  dimensiones: z.string().optional(),
  imagen: z.string().optional().or(z.literal("")),     
  activa: z.boolean().default(true),
  atributosExtra: z.record(z.any()).optional(),
  esExentoIva: z.boolean().default(false),
  tarifaIva: z.coerce.number().min(0).max(100).optional(),
  incluyeIva: z.boolean().default(false),
  fechaVencimiento: z.string().optional(),
  lote: z.string().optional(),
  fechaProduccion: z.string().optional()
});

const VarianteUpdateSchema = VarianteCreateSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const incluirInactivas = searchParams.get('incluirInactivas') === 'true';
    const ordenarPor = searchParams.get('ordenarPor') || 'nombre';
    const orden = searchParams.get('orden') || 'asc';

    const producto = await db.producto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const whereClause: import('@prisma/client').Prisma.VarianteProductoWhereInput = {
      productoId: id
    };

    if (!incluirInactivas) {
      whereClause.activo = true;
    }

    const orderBy: import('@prisma/client').Prisma.VarianteProductoOrderByWithRelationInput = {};
    if (ordenarPor === 'nombre') orderBy.nombre = orden as import('@prisma/client').Prisma.SortOrder;
    else if (ordenarPor === 'precio') orderBy.precio = orden as import('@prisma/client').Prisma.SortOrder;
    else if (ordenarPor === 'enStock') orderBy.enStock = orden as import('@prisma/client').Prisma.SortOrder;

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

    const estadisticas = {
      total: variantes.length,
      activas: variantes.filter((v: import("@prisma/client").VarianteProducto) => v.activo).length,
      inactivas: variantes.filter((v: import("@prisma/client").VarianteProducto) => !v.activo).length,
      conStock: variantes.filter((v: import("@prisma/client").VarianteProducto) => v.enStock > 0).length,
      sinStock: variantes.filter((v: import("@prisma/client").VarianteProducto) => v.enStock === 0).length,
      stockTotal: variantes.reduce((sum: number, v: import("@prisma/client").VarianteProducto) => sum + v.enStock, 0),
      valorInventario: variantes.reduce((sum: number, v: import("@prisma/client").VarianteProducto) => sum + Number(v.precio || 0) * v.enStock, 0)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = VarianteCreateSchema.parse(body);

    const producto = await db.producto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId
      }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (validatedData.sku) {
      const skuExistente = await db.varianteProducto.findFirst({
        where: {
          sku: validatedData.sku,
          producto: { empresaId: session.user.empresaId }
        }
      });
      if (skuExistente) {
        return NextResponse.json({ error: 'El SKU ya existe en otra variante', campo: 'sku' }, { status: 400 });
      }
    }

    if (validatedData.codigoBarras) {
      const codigoExistente = await db.varianteProducto.findFirst({
        where: {
          codigoBarras: validatedData.codigoBarras,
          producto: { empresaId: session.user.empresaId }
        }
      });
      if (codigoExistente) {
        return NextResponse.json({ error: 'El código de barras ya existe en otra variante', campo: 'codigoBarras' }, { status: 400 });
      }
    }

    const variante = await db.varianteProducto.create({
      data: {
        productoId: id,
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
        activo: validatedData.activa,
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
          select: { nombre: true, tipoVenta: true }
        }
      }
    });

    return NextResponse.json(variante, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        detalles: error.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message }))
      }, { status: 400 });
    }
    console.error('Error al crear variante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { varianteId, ...updateData } = body;

    if (!varianteId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    const validatedData = VarianteUpdateSchema.parse(updateData);

    const varianteExistente = await db.varianteProducto.findFirst({
      where: {
        id: varianteId,
        productoId: id,
        producto: { empresaId: session.user.empresaId }
      }
    });

    if (!varianteExistente) {
      return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }

    if (validatedData.sku && validatedData.sku !== varianteExistente.sku) {
      const skuExistente = await db.varianteProducto.findFirst({
        where: {
          sku: validatedData.sku,
          id: { not: varianteId },
          producto: { empresaId: session.user.empresaId }
        }
      });
      if (skuExistente) {
        return NextResponse.json({ error: 'El SKU ya existe en otra variante', campo: 'sku' }, { status: 400 });
      }
    }

    if (validatedData.codigoBarras && validatedData.codigoBarras !== varianteExistente.codigoBarras) {
      const codigoExistente = await db.varianteProducto.findFirst({
        where: {
          codigoBarras: validatedData.codigoBarras,
          id: { not: varianteId },
          producto: { empresaId: session.user.empresaId }
        }
      });
      if (codigoExistente) {
        return NextResponse.json({ error: 'El código de barras ya existe en otra variante', campo: 'codigoBarras' }, { status: 400 });
      }
    }

    const { activa, ...dataWithoutActiva } = validatedData;
    const varianteActualizada = await db.varianteProducto.update({
      where: { id: varianteId },
      data: {
        ...dataWithoutActiva,
        activo: activa,
        fechaVencimiento: validatedData.fechaVencimiento ? new Date(validatedData.fechaVencimiento) : undefined,
        fechaProduccion: validatedData.fechaProduccion ? new Date(validatedData.fechaProduccion) : undefined
      },
      include: {
        producto: {
          select: { nombre: true, tipoVenta: true }
        }
      }
    });

    return NextResponse.json(varianteActualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos inválidos',
        detalles: error.errors.map(e => ({ campo: e.path.join('.'), mensaje: e.message }))
      }, { status: 400 });
    }
    console.error('Error al actualizar variante:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const varianteId = searchParams.get('varianteId');

    if (!varianteId) {
      return NextResponse.json({ error: 'ID de variante requerido' }, { status: 400 });
    }

    const variante = await db.varianteProducto.findFirst({
      where: {
        id: varianteId,
        productoId: id,
        producto: { empresaId: session.user.empresaId }
      }
    });

    if (!variante) {
      return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }

    const varianteEliminada = await db.varianteProducto.update({
      where: { id: varianteId },
      data: {
        activo: false,
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