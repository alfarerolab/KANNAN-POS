import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth/auth";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const periodo = url.searchParams.get('periodo') || '6m';

    // Calcular fechas según el período
    const fechaInicio = new Date();
    switch (periodo) {
      case '1m':
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
        break;
      case '3m':
        fechaInicio.setMonth(fechaInicio.getMonth() - 3);
        break;
      case '6m':
        fechaInicio.setMonth(fechaInicio.getMonth() - 6);
        break;
      case '1y':
        fechaInicio.setFullYear(fechaInicio.getFullYear() - 1);
        break;
    }

    // Obtener datos para el reporte
    const empresas = await db.empresa.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        tipoNegocio: true,
        activa: true,
        createdAt: true,
        fechaVencimiento: true,
        _count: {
          select: {
            usuarios: true,
            ventas: true,
            productos: true
          }
        }
      },
      where: {
        createdAt: {
          gte: fechaInicio
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Crear CSV
    const headers = [
      'ID',
      'Nombre',
      'Email',
      'Tipo de Negocio',
      'Estado',
      'Fecha Creación',
      'Fecha Vencimiento',
      'Usuarios',
      'Ventas',
      'Productos'
    ];

    // @ts-expect-error Autofix Next15 o tipos implícitos
    const csvData = empresas.map(empresa => [
      empresa.id,
      empresa.nombre,
      empresa.email,
      empresa.tipoNegocio.replace(/_/g, ' '),
      empresa.activa ? 'Activa' : 'Inactiva',
      empresa.createdAt.toISOString().split('T')[0],
      empresa.fechaVencimiento ? empresa.fechaVencimiento.toISOString().split('T')[0] : 'Sin vencimiento',
      empresa._count.usuarios,
      empresa._count.ventas,
      empresa._count.productos
    ]);

    const csvContent = [
      headers.join(','),
      // @ts-expect-error Autofix Next15 o tipos implícitos
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="analytics-report-${periodo}-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });

  } catch (error) {
    console.error("Error al exportar reporte:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
