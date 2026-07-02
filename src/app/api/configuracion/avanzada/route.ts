import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/auth/auth';
import { db } from "@/lib/db";

// Función auxiliar para parsear configuraciones JSON de forma segura
function parseConfiguracion<T>(config: any, defaultConfig: T): T {
  if (!config) return defaultConfig;
  
  if (typeof config === 'string') {
    try {
      return JSON.parse(config) as T;
    } catch {
      return defaultConfig;
    }
  }
  
  if (typeof config === 'object') {
    return { ...defaultConfig, ...config } as T;
  }
  
  return defaultConfig;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea administrador o SUPERADMIN
    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;

    // Buscar configuración existente
    const configuracion = await db.configuracionEmpresa.findFirst({
      where: { empresaId },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            tipoNegocio: true
          }
        }
      }
    });

    if (!configuracion) {
      return NextResponse.json(
        { error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    // Parsear configuraciones JSON con valores por defecto
    const defaultConfigPos = {
      mostrarStock: true,
      permitirVentaSinStock: false,
      impresionAutomatica: true,
      formatoTicket: "58mm",
      mostrarLogos: true,
      sonidoVenta: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      limiteDescuento: 20,
      alertaStockMinimo: 10
    };

    const defaultConfigInventario = {
      alertaStockMinimo: true,
      actualizacionAutomatica: true,
      permitirStockNegativo: false,
      metodoValoracion: "FIFO",
      inventarioAvanzado: false
    };

    const defaultConfigFactura = {
      numeracionAutomatica: true,
      prefijo: "F",
      siguienteNumero: 1,
      incluirImpuestos: true,
      porcentajeImpuesto: 19
    };

    const configPos = parseConfiguracion(configuracion.configuracionPos, defaultConfigPos);
    const configInventario = parseConfiguracion(configuracion.configuracionInventario, defaultConfigInventario);
    const configFactura = parseConfiguracion(configuracion.configuracionFactura, defaultConfigFactura);

    // Formatear respuesta
    const response = {
      empresaId: configuracion.empresaId,
      funcionalidades: {
        servicios: configuracion.habilitarServicios,
        citas: configuracion.habilitarCitas,
        variantes: configuracion.habilitarVariantes,
        recetas: configuracion.habilitarRecetas,
        lotes: configuracion.habilitarLotes,
        vencimientos: configuracion.habilitarVencimientos,
        mascotas: true, // Siempre disponible
        empleadosEspecializados: true, // Por defecto habilitado
        inventarioAvanzado: configInventario.inventarioAvanzado || configuracion.habilitarInventarioAvanzado || false,
        facturacionElectronica: configFactura.incluirImpuestos || false,
      },
      configuracionPOS: {
        mostrarStock: configPos.mostrarStock,
        permitirVentaSinStock: configPos.permitirVentaSinStock,
        ventaPorPeso: configPos.ventaPorPeso || false,
        ventaPorMedida: configPos.ventaPorMedida || false,
        requiereCliente: configPos.requiereCliente || false,
        permitirDescuentos: configPos.permitirDescuentos || true,
        limiteDescuento: configPos.limiteDescuento || 20,
        alertaStockMinimo: configPos.alertaStockMinimo || 10,
      },
      limitesOperacionales: {
        maxProductos: 10000,
        maxUsuarios: 50,
        maxTerminales: 10,
        maxVentasDiarias: 1000,
      },
      configuracionAvanzada: {
        modoDepuracion: false,
        logDetallado: false,
        backupAutomatico: true,
        notificacionesEmail: true,
        integracionContable: false,
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error obteniendo configuración avanzada:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que sea administrador o SUPERADMIN
    if (!["ADMINISTRADOR", "SUPERADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const configuracionData = await request.json();
    const empresaId = session.user.empresaId;

    // Validar datos de entrada
    if (!configuracionData.funcionalidades || !configuracionData.configuracionPOS) {
      return NextResponse.json(
        { error: "Datos de configuración incompletos" },
        { status: 400 }
      );
    }

    // Preparar datos de configuración como objetos planos
    const nuevaConfigPos = {
      mostrarStock: configuracionData.configuracionPOS.mostrarStock ?? true,
      permitirVentaSinStock: configuracionData.configuracionPOS.permitirVentaSinStock ?? false,
      impresionAutomatica: true,
      formatoTicket: "58mm",
      mostrarLogos: true,
      sonidoVenta: false,
      ventaPorPeso: configuracionData.configuracionPOS.ventaPorPeso ?? false,
      ventaPorMedida: configuracionData.configuracionPOS.ventaPorMedida ?? false,
      requiereCliente: configuracionData.configuracionPOS.requiereCliente ?? false,
      permitirDescuentos: configuracionData.configuracionPOS.permitirDescuentos ?? true,
      limiteDescuento: configuracionData.configuracionPOS.limiteDescuento ?? 20,
      alertaStockMinimo: configuracionData.configuracionPOS.alertaStockMinimo ?? 10
    };

    const nuevaConfigInventario = {
      alertaStockMinimo: (configuracionData.configuracionPOS.alertaStockMinimo || 0) > 0,
      actualizacionAutomatica: true,
      permitirStockNegativo: configuracionData.configuracionPOS.permitirVentaSinStock ?? false,
      metodoValoracion: "FIFO",
      inventarioAvanzado: configuracionData.funcionalidades.inventarioAvanzado || false,
      manejarLotes: configuracionData.funcionalidades.lotes || false,
      manejarVencimientos: configuracionData.funcionalidades.vencimientos || false
    };

    const nuevaConfigFactura = {
      numeracionAutomatica: true,
      prefijo: "F",
      siguienteNumero: 1,
      incluirImpuestos: configuracionData.funcionalidades.facturacionElectronica || false,
      porcentajeImpuesto: configuracionData.funcionalidades.facturacionElectronica ? 19 : 0
    };

    // Actualizar configuración existente o crear nueva
    const configuracionActualizada = await db.configuracionEmpresa.upsert({
      where: { empresaId },
      update: {
        habilitarServicios: configuracionData.funcionalidades.servicios || false,
        habilitarCitas: configuracionData.funcionalidades.citas || false,
        habilitarVariantes: configuracionData.funcionalidades.variantes || false,
        habilitarRecetas: configuracionData.funcionalidades.recetas || false,
        habilitarLotes: configuracionData.funcionalidades.lotes || false,
        habilitarVencimientos: configuracionData.funcionalidades.vencimientos || false,
        habilitarInventarioAvanzado: configuracionData.funcionalidades.inventarioAvanzado || false,
        habilitarReportes: true, // Siempre habilitado
        habilitarMultiUsuarios: true, // Siempre habilitado
        configuracionPos: nuevaConfigPos as any,
        configuracionInventario: nuevaConfigInventario as any,
        configuracionFactura: nuevaConfigFactura as any
      },
      create: {
        empresaId,
        tipoNegocio: "OTRO",
        habilitarServicios: configuracionData.funcionalidades.servicios || false,
        habilitarCitas: configuracionData.funcionalidades.citas || false,
        habilitarVariantes: configuracionData.funcionalidades.variantes || false,
        habilitarRecetas: configuracionData.funcionalidades.recetas || false,
        habilitarLotes: configuracionData.funcionalidades.lotes || false,
        habilitarVencimientos: configuracionData.funcionalidades.vencimientos || false,
        habilitarInventarioAvanzado: configuracionData.funcionalidades.inventarioAvanzado || false,
        habilitarReportes: true,
        habilitarMultiUsuarios: true,
        configuracionPos: nuevaConfigPos as any,
        configuracionFactura: nuevaConfigFactura as any,
        configuracionInventario: nuevaConfigInventario as any
      },
      include: {
        empresa: true
      }
    });

    // Registrar auditoría de cambios
    try {
      await db.auditoriaLog.create({
        data: {
          tabla: "ConfiguracionEmpresa",
          registroId: configuracionActualizada.id,
          accion: "ACTUALIZAR",
          datosNuevos: {
            funcionalidades: configuracionData.funcionalidades,
            configuracionPOS: configuracionData.configuracionPOS,
            timestamp: new Date()
          },
          usuarioId: session.user.id,
          usuarioEmail: session.user.email || "",
          usuarioRol: session.user.role,
          empresaId,
          notas: "Actualización de configuración avanzada"
        }
      });
    } catch (auditError) {
    }

    return NextResponse.json({
      success: true,
      message: "Configuración actualizada exitosamente",
      configuracion: configuracionActualizada
    });

  } catch (error) {
    console.error("Error actualizando configuración avanzada:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo SUPERADMIN puede eliminar configuraciones
    if (session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const empresaId = session.user.empresaId;

    // Resetear configuración a valores por defecto
    const defaultConfigPos = {
      mostrarStock: true,
      permitirVentaSinStock: false,
      impresionAutomatica: false,
      formatoTicket: "58mm",
      mostrarLogos: true,
      sonidoVenta: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      limiteDescuento: 0,
      alertaStockMinimo: 5
    };

    const defaultConfigInventario = {
      alertaStockMinimo: true,
      actualizacionAutomatica: true,
      permitirStockNegativo: false,
      metodoValoracion: "FIFO",
      inventarioAvanzado: false,
      manejarLotes: false,
      manejarVencimientos: false
    };

    const defaultConfigFactura = {
      numeracionAutomatica: true,
      prefijo: "",
      siguienteNumero: 1,
      incluirImpuestos: false,
      porcentajeImpuesto: 0
    };

    await db.configuracionEmpresa.update({
      where: { empresaId },
      data: {
        habilitarServicios: false,
        habilitarCitas: false,
        habilitarVariantes: false,
        habilitarRecetas: false,
        habilitarLotes: false,
        habilitarVencimientos: false,
        habilitarInventarioAvanzado: false,
        configuracionPos: defaultConfigPos as any,
        configuracionInventario: defaultConfigInventario as any,
        configuracionFactura: defaultConfigFactura as any
      }
    });

    // Registrar auditoría
    try {
      await db.auditoriaLog.create({
        data: {
          tabla: "ConfiguracionEmpresa",
          registroId: empresaId,
          accion: "ACTUALIZAR",
          datosNuevos: { resetToDefaults: true },
          usuarioId: session.user.id,
          usuarioEmail: session.user.email || "",
          usuarioRol: session.user.role,
          empresaId,
          notas: "Reseteo de configuración a valores por defecto por SUPERADMIN"
        }
      });
    } catch (auditError) {
    }

    return NextResponse.json({
      success: true,
      message: "Configuración reseteada exitosamente"
    });

  } catch (error) {
    console.error("Error reseteando configuración:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}