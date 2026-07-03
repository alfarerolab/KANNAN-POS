// app/api/empresa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { sanitizeInput } from '@/lib/sanitize';

// Schema de validación
const empresaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  nombreComercial: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  email: z.union([z.string().email('Email inválido'), z.literal('')]).optional().nullable(),
  sitioWeb: z.string().url('URL inválida').optional().nullable(),
  logo: z.string().optional().nullable(),
  logoSecundario: z.string().optional().nullable(),
  imagenBanner: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  tipoNegocio: z.enum([
    'TIENDA_COMIDA',
    'TIENDA_BARRIO',
    'FERRETERIA',
    'PELUQUERIA',
    'SALON_BELLEZA',
    'ROPA',
    'RESTAURANTE',
    'BAR',
    'CAFETERIA',
    'FARMACIA',
    'LIBRERIA',
    'ELECTRONICA',
    'VETERINARIA',
    'SUPERMERCADO',
    'SERVICIOS',
    'SALUD',
    'PROFESIONAL',
    'MIXTO',
    'PERSONALIZADO',
    'OTRO'
  ]).optional().nullable()
});

// GET - Obtener datos de la empresa
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const empresa = await db.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: {
        id: true,
        nombre: true,
        nombreComercial: true,
        nit: true,
        email: true,
        telefono: true,
        direccion: true,
        ciudad: true,
        departamento: true,
        pais: true,
        logo: true,
        logoSecundario: true,
        imagenBanner: true,
        tipoNegocio: true,
        activa: true,
        bodegaHabilitada: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(empresa);

  } catch (error) {
    console.error('Error al obtener empresa:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de la empresa' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar datos de la empresa
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR y SUPERADMIN pueden modificar
    if (!['ADMINISTRADOR', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar la empresa' },
        { status: 403 }
      );
    }

    const body = await req.json();
    // Validar datos
    let validatedData;
    try {
      validatedData = empresaSchema.parse(body);
    } catch (validationError) {
      console.error('Error de validación:', validationError);
      throw validationError;
    }

    // Verificar que el NIT no esté en uso por otra empresa (si se está cambiando)
    if (validatedData.nit) {
      const empresaConNit = await db.empresa.findFirst({
        where: {
          nit: validatedData.nit,
          id: { not: session.user.empresaId }
        }
      });

      if (empresaConNit) {
        return NextResponse.json(
          { error: 'El NIT ya está registrado por otra empresa' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar (solo los que vengan en el body)
    const dataToUpdate: any = {};
    
    if (validatedData.nombre !== undefined) dataToUpdate.nombre = sanitizeInput(validatedData.nombre);
    if (validatedData.nombreComercial !== undefined) dataToUpdate.nombreComercial = validatedData.nombreComercial ? sanitizeInput(validatedData.nombreComercial) : null;
    if (validatedData.nit !== undefined) dataToUpdate.nit = validatedData.nit ? sanitizeInput(validatedData.nit) : null;
    if (validatedData.telefono !== undefined) dataToUpdate.telefono = validatedData.telefono ? sanitizeInput(validatedData.telefono) : null;
    if (validatedData.direccion !== undefined) dataToUpdate.direccion = validatedData.direccion ? sanitizeInput(validatedData.direccion) : null;
    if (validatedData.ciudad !== undefined) dataToUpdate.ciudad = validatedData.ciudad ? sanitizeInput(validatedData.ciudad) : null;
    if (validatedData.departamento !== undefined) dataToUpdate.departamento = validatedData.departamento ? sanitizeInput(validatedData.departamento) : null;
    if (validatedData.pais !== undefined) dataToUpdate.pais = validatedData.pais ? sanitizeInput(validatedData.pais) : null;
    if (validatedData.email !== undefined) dataToUpdate.email = validatedData.email || null;
    if (validatedData.logo !== undefined) dataToUpdate.logo = validatedData.logo;
    if (validatedData.logoSecundario !== undefined) dataToUpdate.logoSecundario = validatedData.logoSecundario;
    if (validatedData.imagenBanner !== undefined) dataToUpdate.imagenBanner = validatedData.imagenBanner;
    if (validatedData.descripcion !== undefined) dataToUpdate.descripcion = validatedData.descripcion ? sanitizeInput(validatedData.descripcion) : null;
    if (validatedData.tipoNegocio !== undefined) dataToUpdate.tipoNegocio = validatedData.tipoNegocio;

    // Actualizar empresa
    let empresaActualizada;
    try {
      empresaActualizada = await db.empresa.update({
        where: { id: session.user.empresaId },
        data: dataToUpdate,
        select: {
          id: true,
          nombre: true,
          nombreComercial: true,
          nit: true,
          email: true,
          telefono: true,
          direccion: true,
          ciudad: true,
          departamento: true,
          tipoNegocio: true,
          logo: true,
          updatedAt: true
        }
      });
    } catch (dbError) {
      console.error('Error de base de datos:', dbError);
      throw dbError;
    }

    // Registrar en auditoría
    try {
      await db.auditoriaLog.create({
        data: {
          tabla: 'Empresa',
          registroId: empresaActualizada.id,
          accion: 'ACTUALIZAR',
          datosNuevos: empresaActualizada as any,
          usuarioId: session.user.id,
          usuarioEmail: session.user.email,
          usuarioRol: session.user.role,
          empresaId: session.user.empresaId,
          notas: 'Actualización de datos de empresa'
        }
      });
    } catch (auditError) {
      // No fallar la operación si falla la auditoría
    }

    return NextResponse.json({
      success: true,
      empresa: empresaActualizada,
      message: 'Empresa actualizada correctamente'
    });

  } catch (error) {
    console.error('Error al actualizar empresa:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al actualizar la empresa' },
      { status: 500 }
    );
  }
}

// PATCH - Actualización parcial (para casos específicos)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.empresaId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR y SUPERADMIN
    if (!['ADMINISTRADOR', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { campo, valor } = body;

    if (!campo) {
      return NextResponse.json(
        { error: 'Campo requerido' },
        { status: 400 }
      );
    }

    // Campos permitidos para actualización individual
    const camposPermitidos = [
      'logo', 
      'logoSecundario', 
      'imagenBanner', 
      'bodegaHabilitada'
    ];

    if (!camposPermitidos.includes(campo)) {
      return NextResponse.json(
        { error: 'Campo no permitido para actualización individual' },
        { status: 400 }
      );
    }

    const empresaActualizada = await db.empresa.update({
      where: { id: session.user.empresaId },
      data: { [campo]: valor }
    });

    return NextResponse.json({
      success: true,
      message: `${campo} actualizado correctamente`,
      [campo]: valor
    });

  } catch (error) {
    console.error('Error en PATCH:', error);
    return NextResponse.json(
      { error: 'Error al actualizar' },
      { status: 500 }
    );
  }
}