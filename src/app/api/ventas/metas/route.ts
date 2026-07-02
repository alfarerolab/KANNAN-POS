import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const hoy = new Date();

    // Fechas para diferentes períodos
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Domingo
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Obtener configuración de metas desde la base de datos
    // Si no existe, usar valores por defecto
    const configuracionMetas = await db.configuracionEmpresa.findFirst({
      where: { empresaId },
      select: {
        metaDiariaVentas: true,
        metaSemanalVentas: true,
        metaMensualVentas: true,
      },
    });

    // Convertir Decimal a number y usar valores por defecto si no hay configuración
    const metaDiaria = configuracionMetas?.metaDiariaVentas 
      ? Number(configuracionMetas.metaDiariaVentas) 
      : 0;
    const metaSemanal = configuracionMetas?.metaSemanalVentas 
      ? Number(configuracionMetas.metaSemanalVentas) 
      : 0;
    const metaMensual = configuracionMetas?.metaMensualVentas 
      ? Number(configuracionMetas.metaMensualVentas) 
      : 0;

    // Obtener ventas reales para cada período
    const [ventasDiarias, ventasSemanales, ventasMensuales] = await Promise.all([
      // Ventas del día actual
      db.venta.aggregate({
        where: {
          empresaId,
          createdAt: { gte: inicioHoy },
          estado: 'COMPLETADA',
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Ventas de la semana actual
      db.venta.aggregate({
        where: {
          empresaId,
          createdAt: { gte: inicioSemana },
          estado: 'COMPLETADA',
        },
        _sum: { total: true },
        _count: { id: true },
      }),

      // Ventas del mes actual
      db.venta.aggregate({
        where: {
          empresaId,
          createdAt: { gte: inicioMes },
          estado: 'COMPLETADA',
        },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    // Convertir Decimal a number y calcular progreso
    const actualDiario = Number(ventasDiarias._sum.total || 0);
    const actualSemanal = Number(ventasSemanales._sum.total || 0);
    const actualMensual = Number(ventasMensuales._sum.total || 0);

    const metas = {
      diaria: {
        objetivo: metaDiaria,
        actual: actualDiario,
        progreso: (actualDiario / metaDiaria) * 100,
        ventasCount: ventasDiarias._count.id || 0,
        restante: Math.max(0, metaDiaria - actualDiario),
        estado: actualDiario >= metaDiaria ? 'completado' : 
                actualDiario >= metaDiaria * 0.8 ? 'cerca' : 
                'en_progreso',
      },
      semanal: {
        objetivo: metaSemanal,
        actual: actualSemanal,
        progreso: (actualSemanal / metaSemanal) * 100,
        ventasCount: ventasSemanales._count.id || 0,
        restante: Math.max(0, metaSemanal - actualSemanal),
        estado: actualSemanal >= metaSemanal ? 'completado' : 
                actualSemanal >= metaSemanal * 0.8 ? 'cerca' : 
                'en_progreso',
      },
      mensual: {
        objetivo: metaMensual,
        actual: actualMensual,
        progreso: (actualMensual / metaMensual) * 100,
        ventasCount: ventasMensuales._count.id || 0,
        restante: Math.max(0, metaMensual - actualMensual),
        estado: actualMensual >= metaMensual ? 'completado' : 
                actualMensual >= metaMensual * 0.8 ? 'cerca' : 
                'en_progreso',
      },
    };

    // Agregar información de proyección
    const diasTranscurridosMes = hoy.getDate();
    const diasTotalesMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    const proyeccionMensual = (actualMensual / diasTranscurridosMes) * diasTotalesMes;

    // Agregar estadísticas adicionales
    const estadisticas = {
      proyeccionMensual,
      velocidadDiaria: actualMensual / diasTranscurridosMes,
      necesarioParaMeta: (metaMensual - actualMensual) / (diasTotalesMes - diasTranscurridosMes),
      eficiencia: {
        diaria: (actualDiario / metaDiaria) * 100,
        semanal: (actualSemanal / metaSemanal) * 100,
        mensual: (actualMensual / metaMensual) * 100,
      }
    };

    return NextResponse.json({
      ...metas,
      estadisticas,
      updatedAt: new Date(),
    });

  } catch (error) {
    console.error("Error al obtener metas:", error);
    return NextResponse.json(
      { mensaje: "Error al obtener metas de ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const body = await request.json();
    const { periodo, objetivo } = body;

    if (!periodo || !objetivo || objetivo <= 0) {
      return NextResponse.json(
        { mensaje: "Período y objetivo son requeridos y el objetivo debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const periodosValidos = ['diaria', 'semanal', 'mensual'];
    if (!periodosValidos.includes(periodo)) {
      return NextResponse.json(
        { mensaje: "Período debe ser: diaria, semanal o mensual" },
        { status: 400 }
      );
    }

    // Obtener la configuración existente para preservar el tipoNegocio
    const configuracionExistente = await db.configuracionEmpresa.findFirst({
      where: { empresaId },
      select: { tipoNegocio: true },
    });

    // Si no existe configuración, necesitamos el tipoNegocio de la empresa
    let tipoNegocioEmpresa: any = 'OTRO'; // Fallback
    
    if (!configuracionExistente) {
      const empresa = await db.empresa.findUnique({
        where: { id: empresaId },
        select: { tipoNegocio: true },
      });
      tipoNegocioEmpresa = empresa?.tipoNegocio || 'OTRO';
    }

    // Mapear los nombres del período a los campos de la base de datos
    const camposMeta = {
      'diaria': 'metaDiariaVentas',
      'semanal': 'metaSemanalVentas',
      'mensual': 'metaMensualVentas',
    } as const;

    const campoMeta = camposMeta[periodo as keyof typeof camposMeta];

    // Actualizar o crear la configuración de la empresa
    await db.configuracionEmpresa.upsert({
      where: { empresaId },
      update: {
        [campoMeta]: objetivo,
      },
      create: {
        empresaId,
        tipoNegocio: configuracionExistente?.tipoNegocio || tipoNegocioEmpresa,
        [campoMeta]: objetivo,
        // Valores por defecto para otros campos si no existen
        metaDiariaVentas: periodo === 'diaria' ? objetivo : 5000,
        metaSemanalVentas: periodo === 'semanal' ? objetivo : 35000,
        metaMensualVentas: periodo === 'mensual' ? objetivo : 150000,
      },
    });

    return NextResponse.json({
      mensaje: `Meta ${periodo} actualizada correctamente`,
      periodo,
      objetivo,
      updatedAt: new Date(),
    });

  } catch (error) {
    console.error("Error al actualizar meta:", error);
    return NextResponse.json(
      { mensaje: "Error al actualizar meta de ventas" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ mensaje: "No autorizado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo");

    if (!periodo) {
      return NextResponse.json(
        { mensaje: "Período es requerido" },
        { status: 400 }
      );
    }

    const periodosValidos = ['diaria', 'semanal', 'mensual'];
    if (!periodosValidos.includes(periodo)) {
      return NextResponse.json(
        { mensaje: "Período debe ser: diaria, semanal o mensual" },
        { status: 400 }
      );
    }

    // Resetear la meta a un valor por defecto
    const valoresPorDefecto = {
      'diaria': 5000,
      'semanal': 35000,
      'mensual': 150000,
    } as const;

    const camposMeta = {
      'diaria': 'metaDiariaVentas',
      'semanal': 'metaSemanalVentas',
      'mensual': 'metaMensualVentas',
    } as const;

    const campoMeta = camposMeta[periodo as keyof typeof camposMeta];
    const valorDefecto = valoresPorDefecto[periodo as keyof typeof valoresPorDefecto];

    // Obtener la configuración existente o el tipoNegocio de la empresa
    const configuracionExistente = await db.configuracionEmpresa.findFirst({
      where: { empresaId },
      select: { tipoNegocio: true },
    });

    let tipoNegocioEmpresa: any = 'OTRO'; // Fallback
    
    if (!configuracionExistente) {
      const empresa = await db.empresa.findUnique({
        where: { id: empresaId },
        select: { tipoNegocio: true },
      });
      tipoNegocioEmpresa = empresa?.tipoNegocio || 'OTRO';
    }

    await db.configuracionEmpresa.upsert({
      where: { empresaId },
      update: {
        [campoMeta]: valorDefecto,
      },
      create: {
        empresaId,
        tipoNegocio: configuracionExistente?.tipoNegocio || tipoNegocioEmpresa,
        metaDiariaVentas: 5000,
        metaSemanalVentas: 35000,
        metaMensualVentas: 150000,
      },
    });

    return NextResponse.json({
      mensaje: `Meta ${periodo} reseteada a valor por defecto`,
      periodo,
      valorPorDefecto: valorDefecto,
    });

  } catch (error) {
    console.error("Error al resetear meta:", error);
    return NextResponse.json(
      { mensaje: "Error al resetear meta de ventas" },
      { status: 500 }
    );
  }
}