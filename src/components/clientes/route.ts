import { getServerSession } from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

// GET - Obtener todos los clientes de la empresa actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.empresaId) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);

    // Opciones de búsqueda y paginación
    const busqueda = searchParams.get("busqueda");
    const pagina = Number.parseInt(searchParams.get("pagina") || "1");
    const limite = Number.parseInt(searchParams.get("limite") || "20");
    const omitir = (pagina - 1) * limite;

    // Construir la consulta
    const whereClause: {
      empresaId: string;
      OR?: Array<{ nombre?: { contains: string; mode?: 'insensitive' } } | { email?: { contains: string; mode?: 'insensitive' } } | { telefono?: { contains: string } }>;
    } = { empresaId };

    if (busqueda) {
      whereClause.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { email: { contains: busqueda, mode: 'insensitive' } },
        { telefono: { contains: busqueda } },
      ];
    }

    console.log('Consultando clientes con filtros:', whereClause);

    // Contar clientes para la paginación
    const totalClientes = await db.cliente.count({
      where: whereClause,
    });

    // Obtener clientes con paginación
    const clientes = await db.cliente.findMany({
      where: whereClause,
      orderBy: {
        fechaCreacion: "desc", // Mostrar los más recientes primero
      },
      skip: omitir,
      take: limite,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaCreacion: true,
      }
    });

    console.log(`Encontrados ${clientes.length} clientes de ${totalClientes} total`);

    return NextResponse.json({
      datos: clientes,
      meta: {
        total: totalClientes,
        pagina,
        limite,
        totalPaginas: Math.ceil(totalClientes / limite),
      },
    });
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    return NextResponse.json(
      { mensaje: "Error interno del servidor al obtener clientes" },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.empresaId) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const body = await request.json();
    const { nombre, email, telefono, direccion } = body;

    console.log('Datos recibidos para crear cliente:', { nombre, email, telefono, direccion });

    // Validación básica
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return NextResponse.json(
        { mensaje: "El nombre del cliente es requerido y debe ser válido" },
        { status: 400 }
      );
    }

    // Limpiar datos
    const nombreLimpio = nombre.trim();
    const emailLimpio = email && typeof email === 'string' && email.trim() !== '' ? email.trim() : null;
    const telefonoLimpio = telefono && typeof telefono === 'string' && telefono.trim() !== '' ? telefono.trim() : null;
    const direccionLimpia = direccion && typeof direccion === 'string' && direccion.trim() !== '' ? direccion.trim() : null;

    // Validar email si se proporciona
    if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      return NextResponse.json(
        { mensaje: "El formato del email es inválido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un cliente con el mismo email (si se proporciona)
    if (emailLimpio) {
      const clienteExistente = await db.cliente.findFirst({
        where: {
          email: emailLimpio,
          empresaId,
        },
      });

      if (clienteExistente) {
        return NextResponse.json(
          { mensaje: "Ya existe un cliente con ese email en su empresa" },
          { status: 400 }
        );
      }
    }

    // Crear el cliente
    const cliente = await db.cliente.create({
      data: {
        nombre: nombreLimpio,
        email: emailLimpio,
        telefono: telefonoLimpio,
        direccion: direccionLimpia,
        empresaId,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        fechaCreacion: true,
      }
    });

    console.log('Cliente creado exitosamente:', cliente);

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    
    // Manejar errores específicos de Prisma
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { mensaje: "Ya existe un cliente con esos datos" },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { mensaje: "Error interno del servidor al crear cliente" },
      { status: 500 }
    );
  }
}