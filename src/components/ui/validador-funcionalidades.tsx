"use client";

import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Activity, Calendar, Package, Users, Receipt, Clock, PawPrint } from "lucide-react";

export default function ValidadorFuncionalidades() {
  const {
    configuracion,
    configNegocio,
    tieneServicios,
    tieneCitas,
    tieneVariantes,
    tieneRecetas,
    tieneLotes,
    tieneVencimientos,
    tieneMascotas,
    obtenerTema
  } = useConfiguracionEmpresa();

  const tema = obtenerTema();

  if (!configuracion || !configNegocio) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  const funcionalidades = [
    {
      nombre: "Servicios",
      descripcion: "Gestión de servicios ofrecidos",
      icono: Activity,
      habilitada: tieneServicios(),
      color: "blue"
    },
    {
      nombre: "Citas",
      descripcion: "Sistema de reservas y citas",
      icono: Calendar,
      habilitada: tieneCitas(),
      color: "green"
    },
    {
      nombre: "Variantes",
      descripcion: "Productos con tallas, colores, etc.",
      icono: Package,
      habilitada: tieneVariantes(),
      color: "purple"
    },
    {
      nombre: "Recetas",
      descripcion: "Gestión de recetas médicas",
      icono: Receipt,
      habilitada: tieneRecetas(),
      color: "orange"
    },
    {
      nombre: "Lotes",
      descripcion: "Control de lotes de productos",
      icono: Package,
      habilitada: tieneLotes(),
      color: "yellow"
    },
    {
      nombre: "Vencimientos",
      descripcion: "Control de fechas de vencimiento",
      icono: Clock,
      habilitada: tieneVencimientos(),
      color: "red"
    },
    {
      nombre: "Mascotas",
      descripcion: "Registro de mascotas para veterinaria",
      icono: PawPrint,
      habilitada: tieneMascotas(),
      color: "teal"
    }
  ];

  return (
    <Card className={`border-l-4 border-l-${tema.color}-500`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">{tema.icon}</span>
          Funcionalidades Habilitadas - {configNegocio.nombre}
        </CardTitle>
        <CardDescription>
          Estas son las funcionalidades disponibles para tu tipo de negocio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funcionalidades.map((func) => {
            const IconComponent = func.icono;
            return (
              <div
                key={func.nombre}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  func.habilitada
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  func.habilitada ? 'bg-emerald-500/15' : 'bg-muted'
                }`}>
                  {func.habilitada ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/70" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <span className="font-medium">{func.nombre}</span>
                    <Badge variant={func.habilitada ? "default" : "secondary"}>
                      {func.habilitada ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {func.descripcion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Información adicional del tipo de negocio */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <h4 className="font-semibold mb-2">Configuración del Tipo de Negocio</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Tipo:</span> {configNegocio.nombre}
            </div>
            <div>
              <span className="font-medium">Empleados Especializados:</span> {
                configNegocio.funcionalidades.empleadosEspecializados ? "Sí" : "No"
              }
            </div>
            <div>
              <span className="font-medium">Inventario Avanzado:</span> {
                configNegocio.funcionalidades.inventarioAvanzado ? "Sí" : "No"
              }
            </div>
            <div>
              <span className="font-medium">Facturación Electrónica:</span> {
                configNegocio.funcionalidades.facturacionElectronica ? "Sí" : "No"
              }
            </div>
          </div>
        </div>

        {/* Tips específicos */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg">
          <h4 className="font-semibold mb-2">💡 Sugerencias para tu negocio</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            {tieneServicios() && (
              <p>• Los servicios te permiten vender tiempo y especialización, no solo productos</p>
            )}
            {tieneCitas() && (
              <p>• Las citas ayudan a organizar mejor tu tiempo y el de tus clientes</p>
            )}
            {tieneVariantes() && (
              <p>• Las variantes te permiten manejar productos con diferentes características</p>
            )}
            {tieneVencimientos() && (
              <p>• El control de vencimientos es crucial para evitar pérdidas por productos caducados</p>
            )}
            {tieneMascotas() && (
              <p>• El registro de mascotas te permite ofrecer un servicio más personalizado</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
