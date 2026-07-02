"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { obtenerTiposNegocio, type ConfiguracionNegocio } from "@/lib/configuracion-negocio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Shield,
  BarChart3,
  Users,
  Building,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Zap,
  Database,
  Lock,
  Unlock
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface ConfiguracionPersonalizada {
  empresaId: string;
  funcionalidades: {
    servicios: boolean;
    citas: boolean;
    variantes: boolean;
    recetas: boolean;
    lotes: boolean;
    vencimientos: boolean;
    mascotas: boolean;
    empleadosEspecializados: boolean;
    inventarioAvanzado: boolean;
    facturacionElectronica: boolean;
  };
  configuracionPOS: {
    mostrarStock: boolean;
    permitirVentaSinStock: boolean;
    ventaPorPeso: boolean;
    ventaPorMedida: boolean;
    requiereCliente: boolean;
    permitirDescuentos: boolean;
    limiteDescuento: number;
    alertaStockMinimo: number;
  };
  limitesOperacionales: {
    maxProductos: number;
    maxUsuarios: number;
    maxTerminales: number;
    maxVentasDiarias: number;
  };
  configuracionAvanzada: {
    modoDepuracion: boolean;
    logDetallado: boolean;
    backupAutomatico: boolean;
    notificacionesEmail: boolean;
    integracionContable: boolean;
  };
}

export default function PanelConfiguracionAvanzada() {
  const { data: session } = useSession();
  const { configuracion, obtenerTema } = useConfiguracionEmpresa();
  const [configuracionActual, setConfiguracionActual] = useState<ConfiguracionPersonalizada | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tabActiva, setTabActiva] = useState("funcionalidades");
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  const tema = obtenerTema();
  const tiposNegocio = obtenerTiposNegocio();

  // Verificar permisos de administrador
  const esAdministrador = session?.user?.role === "ADMINISTRADOR" || session?.user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!esAdministrador) return;
    cargarConfiguracion();
  }, [esAdministrador]);

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/configuracion/avanzada");
      if (response.ok) {
        const data = await response.json();
        setConfiguracionActual(data);
      } else {
        // Configuración por defecto si no existe
        setConfiguracionActual(crearConfiguracionPorDefecto());
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
      setConfiguracionActual(crearConfiguracionPorDefecto());
    } finally {
      setCargando(false);
    }
  };

  const crearConfiguracionPorDefecto = (): ConfiguracionPersonalizada => ({
    empresaId: session?.user?.empresaId || "",
    funcionalidades: {
      servicios: configuracion?.habilitarServicios ?? false,
      citas: configuracion?.habilitarCitas ?? false,
      variantes: configuracion?.habilitarVariantes ?? false,
      recetas: configuracion?.habilitarRecetas ?? false,
      lotes: configuracion?.habilitarLotes ?? false,
      vencimientos: configuracion?.habilitarVencimientos ?? false,
      mascotas: configuracion?.habilitarMascotas ?? false,
      empleadosEspecializados: true,
      inventarioAvanzado: true,
      facturacionElectronica: true,
    },
    configuracionPOS: {
      mostrarStock: true,
      permitirVentaSinStock: false,
      ventaPorPeso: false,
      ventaPorMedida: false,
      requiereCliente: false,
      permitirDescuentos: true,
      limiteDescuento: 20,
      alertaStockMinimo: 10,
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
  });

  const actualizarConfiguracion = (
  seccion: keyof Omit<ConfiguracionPersonalizada, "empresaId">,
  campo: string,
  valor: any
) => {
  if (!configuracionActual) return;

  setConfiguracionActual(prev => ({
    ...prev!,
    [seccion]: {
      ...(prev![seccion] ?? {}), // <- ✅ Aquí aplicamos solución
      [campo]: valor
    }
  }));

  setCambiosPendientes(true);
};

  const guardarConfiguracion = async () => {
    if (!configuracionActual) return;

    try {
      setGuardando(true);
      const response = await fetch("/api/configuracion/avanzada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configuracionActual)
      });

      if (response.ok) {
        setCambiosPendientes(false);
        // Recargar configuración
        window.location.reload();
      } else {
        throw new Error("Error guardando configuración");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setGuardando(false);
    }
  };

  const resetearConfiguracion = () => {
    const tipoNegocio = configuracion?.tipoNegocio || configuracion?.empresa?.tipoNegocio;
    const configTipo = tiposNegocio.find(t => t.tipo === tipoNegocio);

    if (configTipo) {
      setConfiguracionActual(prev => ({
        ...prev!,
        funcionalidades: { ...configTipo.funcionalidades },
        configuracionPOS: { ...configTipo.camposPOS, limiteDescuento: 20, alertaStockMinimo: 10 }
      }));
      setCambiosPendientes(true);
    }
  };

  if (!esAdministrador) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Acceso Restringido</AlertTitle>
            <AlertDescription>
              Solo los administradores pueden acceder al panel de configuración avanzada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (cargando || !configuracionActual) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando configuración avanzada...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Panel de Configuración Avanzada
          </h1>
          <p className="text-muted-foreground">
            Gestión granular de funcionalidades y configuraciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setMostrarAvanzado(!mostrarAvanzado)}
          >
            {mostrarAvanzado ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {mostrarAvanzado ? "Ocultar Avanzado" : "Mostrar Avanzado"}
          </Button>
          {cambiosPendientes && (
            <Button
              onClick={guardarConfiguracion}
              disabled={guardando}
              className={`${tema.accent} hover:bg-primary/90`}
            >
              {guardando ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Cambios
            </Button>
          )}
        </div>
      </div>

      {/* Alertas */}
      {cambiosPendientes && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cambios Pendientes</AlertTitle>
          <AlertDescription>
            Tienes cambios sin guardar. Asegúrate de guardar antes de salir.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Principal */}
      <Tabs value={tabActiva} onValueChange={setTabActiva}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
          <TabsTrigger value="pos">Configuración POS</TabsTrigger>
          <TabsTrigger value="limites">Límites Operacionales</TabsTrigger>
          <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
        </TabsList>

        {/* Tab Funcionalidades */}
        <TabsContent value="funcionalidades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Gestión de Funcionalidades
              </CardTitle>
              <CardDescription>
                Habilita o deshabilita funcionalidades específicas para tu empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Funcionalidades Principales */}
              <div>
                <h3 className="font-semibold mb-4">Funcionalidades Principales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    servicios: { label: "Servicios", desc: "Gestión de servicios ofrecidos" },
                    citas: { label: "Citas", desc: "Sistema de reservas y programación" },
                    mascotas: { label: "Mascotas", desc: "Registro de mascotas (veterinarias)" },
                    variantes: { label: "Variantes", desc: "Productos con tallas, colores, etc." },
                  }).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-sm text-muted-foreground">{info.desc}</div>
                      </div>
                      <Switch
                        checked={configuracionActual.funcionalidades[key as keyof typeof configuracionActual.funcionalidades]}
                        onCheckedChange={(checked) => actualizarConfiguracion("funcionalidades", key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Funcionalidades Especializadas */}
              <div>
                <h3 className="font-semibold mb-4">Funcionalidades Especializadas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries({
                    recetas: { label: "Recetas", desc: "Gestión de recetas médicas" },
                    lotes: { label: "Lotes", desc: "Control de lotes de productos" },
                    vencimientos: { label: "Vencimientos", desc: "Control de fechas de vencimiento" },
                    inventarioAvanzado: { label: "Inventario Avanzado", desc: "Funciones avanzadas de inventario" },
                  }).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-sm text-muted-foreground">{info.desc}</div>
                      </div>
                      <Switch
                        checked={configuracionActual.funcionalidades[key as keyof typeof configuracionActual.funcionalidades]}
                        onCheckedChange={(checked) => actualizarConfiguracion("funcionalidades", key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={resetearConfiguracion}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resetear a Valores por Defecto
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Configuración POS */}
        <TabsContent value="pos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuración del Punto de Venta
              </CardTitle>
              <CardDescription>
                Personaliza el comportamiento del sistema POS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuraciones de Visualización */}
              <div>
                <h3 className="font-semibold mb-4">Visualización y Comportamiento</h3>
                <div className="space-y-4">
                  {Object.entries({
                    mostrarStock: { label: "Mostrar Stock", desc: "Mostrar cantidad disponible en POS" },
                    permitirVentaSinStock: { label: "Permitir Venta Sin Stock", desc: "Permitir ventas con stock negativo" },
                    ventaPorPeso: { label: "Venta por Peso", desc: "Habilitar venta de productos por peso" },
                    ventaPorMedida: { label: "Venta por Medida", desc: "Habilitar venta por metros, litros, etc." },
                    requiereCliente: { label: "Requiere Cliente", desc: "Obligar selección de cliente para ventas" },
                    permitirDescuentos: { label: "Permitir Descuentos", desc: "Habilitar aplicación de descuentos" },
                  }).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{info.label}</div>
                        <div className="text-sm text-muted-foreground">{info.desc}</div>
                      </div>
                      <Switch
                        checked={configuracionActual.configuracionPOS[key as keyof typeof configuracionActual.configuracionPOS] as boolean}
                        onCheckedChange={(checked) => actualizarConfiguracion("configuracionPOS", key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Configuraciones Numéricas */}
              <div>
                <h3 className="font-semibold mb-4">Parámetros Numéricos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Límite de Descuento (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={configuracionActual.configuracionPOS.limiteDescuento}
                      onChange={(e) => actualizarConfiguracion("configuracionPOS", "limiteDescuento", Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alerta Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={configuracionActual.configuracionPOS.alertaStockMinimo}
                      onChange={(e) => actualizarConfiguracion("configuracionPOS", "alertaStockMinimo", Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Límites Operacionales */}
        <TabsContent value="limites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Límites Operacionales
              </CardTitle>
              <CardDescription>
                Define límites para proteger el rendimiento del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries({
                  maxProductos: { label: "Máximo Productos", desc: "Número máximo de productos" },
                  maxUsuarios: { label: "Máximo Usuarios", desc: "Número máximo de usuarios" },
                  maxTerminales: { label: "Máximo Terminales", desc: "Número máximo de terminales POS" },
                  maxVentasDiarias: { label: "Máximo Ventas Diarias", desc: "Límite de ventas por día" },
                }).map(([key, info]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium">{info.label}</label>
                    <input
                      type="number"
                      min="1"
                      value={configuracionActual.limitesOperacionales[key as keyof typeof configuracionActual.limitesOperacionales]}
                      onChange={(e) => actualizarConfiguracion("limitesOperacionales", key, Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                    <p className="text-xs text-muted-foreground">{info.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Avanzado */}
        <TabsContent value="avanzado">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Configuración Avanzada
              </CardTitle>
              <CardDescription>
                Configuraciones técnicas y de sistema (usar con precaución)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mostrarAvanzado ? (
                <div className="space-y-6">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>¡Precaución!</AlertTitle>
                    <AlertDescription>
                      Estas configuraciones pueden afectar el rendimiento y la estabilidad del sistema.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {Object.entries({
                      modoDepuracion: { label: "Modo Depuración", desc: "Habilitar logs detallados (reduce rendimiento)" },
                      logDetallado: { label: "Log Detallado", desc: "Registrar todas las operaciones" },
                      backupAutomatico: { label: "Backup Automático", desc: "Realizar respaldos automáticos diarios" },
                      notificacionesEmail: { label: "Notificaciones Email", desc: "Enviar notificaciones por correo" },
                      integracionContable: { label: "Integración Contable", desc: "Sincronizar con sistemas contables" },
                    }).map(([key, info]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{info.label}</div>
                          <div className="text-sm text-muted-foreground">{info.desc}</div>
                        </div>
                        <Switch
                          checked={configuracionActual.configuracionAvanzada[key as keyof typeof configuracionActual.configuracionAvanzada]}
                          onCheckedChange={(checked) => actualizarConfiguracion("configuracionAvanzada", key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Configuraciones avanzadas ocultas por seguridad.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setMostrarAvanzado(true)}
                    className="mt-4"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Mostrar Configuraciones Avanzadas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
