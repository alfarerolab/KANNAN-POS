"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { CONFIGURACIONES_NEGOCIO } from "@/lib/configuracion-negocio";

// Tipos habilitados (tienen soporte completo en la app)
const TIPOS_HABILITADOS = new Set([
  'TIENDA_BARRIO', 'FARMACIA', 'RESTAURANTE', 'BAR', 'CAFETERIA',
  'SALON_BELLEZA', 'PELUQUERIA', 'VETERINARIA', 'FERRETERIA',
  'ROPA', 'MIXTO', 'PERSONALIZADO', 'OTRO'
]);

// Colores por tipo de negocio
const COLORES_TIPO: Record<string, string> = {
  TIENDA_BARRIO: "bg-blue-500/10 border-blue-500/30",
  SALON_BELLEZA: "bg-pink-500/10 border-pink-500/30",
  PELUQUERIA: "bg-pink-500/10 border-pink-500/30",
  RESTAURANTE: "bg-orange-500/10 border-orange-500/30",
  BAR: "bg-violet-500/10 border-violet-500/30",
  CAFETERIA: "bg-amber-500/10 border-amber-500/30",
  FARMACIA: "bg-destructive/10 border-destructive/30",
  VETERINARIA: "bg-emerald-500/10 border-emerald-500/30",
  ROPA: "bg-purple-500/10 border-purple-500/30",
  FERRETERIA: "bg-muted/50 border-border",
  PROFESIONAL: "bg-cyan-500/10 border-cyan-500/30",
  MIXTO: "bg-indigo-500/10 border-indigo-500/30",
  PERSONALIZADO: "bg-muted/50 border-border",
  OTRO: "bg-muted/50 border-border",
  TIENDA_COMIDA: "bg-amber-500/10 border-amber-500/30",
  LIBRERIA: "bg-teal-500/10 border-teal-500/30",
  ELECTRONICA: "bg-violet-500/10 border-violet-500/30",
  SUPERMERCADO: "bg-emerald-500/10 border-emerald-500/30",
  SERVICIOS: "bg-sky-500/10 border-sky-500/30",
  SALUD: "bg-rose-500/10 border-rose-500/30",
};

// Ejemplos por tipo
const EJEMPLOS_TIPO: Record<string, string[]> = {
  TIENDA_BARRIO: ["Minimarket", "Tienda de conveniencia", "Abarrotes"],
  SALON_BELLEZA: ["Peluqueria", "Spa", "Centro de estetica"],
  PELUQUERIA: ["Barberia", "Peluqueria", "Estilista"],
  RESTAURANTE: ["Restaurante", "Food truck", "Comida rapida"],
  BAR: ["Bar", "Gastrobar", "Cantina", "Discoteca", "Karaoke"],
  CAFETERIA: ["Cafe", "Pasteleria", "Jugos"],
  FARMACIA: ["Farmacia", "Drogueria"],
  VETERINARIA: ["Clinica veterinaria", "Pet shop"],
  ROPA: ["Boutique", "Tienda de ropa", "Zapateria"],
  FERRETERIA: ["Ferreteria", "Materiales de construccion"],
  PROFESIONAL: ["Abogado", "Contador", "Consultor"],
  MIXTO: ["Tienda con taller", "Ferreteria con instalacion"],
  PERSONALIZADO: ["Configuracion desde cero"],
  OTRO: ["Cualquier tipo de negocio"],
  TIENDA_COMIDA: ["Salsamentaria", "Carniceria", "Panaderia"],
  LIBRERIA: ["Papeleria", "Libreria"],
  ELECTRONICA: ["Celulares", "Computadores", "Electronica"],
  SUPERMERCADO: ["Supermercado", "Autoservicio"],
  SERVICIOS: ["Lavanderia", "Cerrajeria", "Taller"],
  SALUD: ["Consultorio medico", "Laboratorio", "Optica"],
};

// Orden de tipos para mostrar
const ORDEN_TIPOS = [
  'TIENDA_BARRIO', 'RESTAURANTE', 'BAR', 'CAFETERIA', 'FARMACIA',
  'SALON_BELLEZA', 'PELUQUERIA', 'VETERINARIA', 'FERRETERIA',
  'ROPA', 'MIXTO', 'PERSONALIZADO', 'OTRO',
  'TIENDA_COMIDA', 'SUPERMERCADO', 'LIBRERIA', 'ELECTRONICA',
  'SERVICIOS', 'SALUD', 'PROFESIONAL'
];

// Generar BUSINESS_TYPES desde configuracion-negocio
const BUSINESS_TYPES = Object.fromEntries(
  ORDEN_TIPOS
    .filter(id => CONFIGURACIONES_NEGOCIO[id])
    .map(id => {
      const cfg = CONFIGURACIONES_NEGOCIO[id];
      const funcionalidades: string[] = [];
      if (cfg.funcionalidades.servicios) funcionalidades.push("Servicios");
      if (cfg.funcionalidades.citas) funcionalidades.push("Citas");
      if (cfg.funcionalidades.variantes) funcionalidades.push("Variantes");
      if (cfg.funcionalidades.inventarioAvanzado) funcionalidades.push("Inventario");
      if (cfg.funcionalidades.vencimientos) funcionalidades.push("Vencimientos");
      if (cfg.funcionalidades.reportesAvanzados) funcionalidades.push("Reportes");
      if (cfg.navegacion?.mostrarMesas) funcionalidades.push("Mesas");
      if (cfg.navegacion?.mostrarMascotas) funcionalidades.push("Mascotas");

      return [id, {
        nombre: cfg.nombre,
        descripcion: cfg.descripcion || '',
        icon: cfg.icono,
        color: COLORES_TIPO[id] || "bg-muted/50 border-border",
        examples: EJEMPLOS_TIPO[id] || [],
        commonFeatures: funcionalidades.length > 0 ? funcionalidades : ["Ventas", "POS"],
        backendValue: id,
        habilitado: TIPOS_HABILITADOS.has(id),
        defaultConfig: {
          habilitarServicios: cfg.funcionalidades.servicios,
          habilitarCitas: cfg.funcionalidades.citas,
          habilitarVariantes: cfg.funcionalidades.variantes,
          habilitarRecetas: cfg.funcionalidades.recetas,
          habilitarLotes: cfg.funcionalidades.lotes,
          habilitarVencimientos: cfg.funcionalidades.vencimientos,
          habilitarInventarioAvanzado: cfg.funcionalidades.inventarioAvanzado,
          habilitarReportes: cfg.funcionalidades.reportesAvanzados,
          habilitarMultiUsuarios: cfg.funcionalidades.empleadosEspecializados
        }
      }];
    })
);

interface BusinessTypeSelectorProps {
  selectedType: string | null;
  onTypeChange: (type: string) => void;
}

export function BusinessTypeSelector({ selectedType, onTypeChange }: BusinessTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Que tipo de negocio tienes?</CardTitle>
        <CardDescription>
          Selecciona la categoria que mejor describa tu negocio. Esto nos ayudara a sugerirte las mejores funcionalidades.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedType || ""}
          onValueChange={(value) => {
            const tipo = BUSINESS_TYPES[value];
            if (tipo && tipo.habilitado) {
              onTypeChange(value);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(BUSINESS_TYPES).map(([key, type]) => {
              const esProximamente = !type.habilitado;

              return (
                <div key={key} className="relative">
                  <RadioGroupItem
                    value={key}
                    id={key}
                    className="peer sr-only"
                    disabled={esProximamente}
                  />
                  <Label
                    htmlFor={key}
                    className={`flex flex-col p-4 rounded-lg border-2 transition-all ${
                      esProximamente
                        ? 'opacity-50 cursor-not-allowed bg-muted border-border'
                        : `cursor-pointer peer-checked:border-blue-600 peer-checked:shadow-md hover:border-blue-500/40 ${type.color}`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-2xl">{type.icon}</div>
                      {esProximamente ? (
                        <Badge variant="secondary" className="bg-muted text-foreground/80 text-xs flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Proximamente
                        </Badge>
                      ) : selectedType === key ? (
                        <Badge variant="default" className="bg-blue-600">Seleccionado</Badge>
                      ) : null}
                    </div>

                    <div className="font-semibold text-foreground dark:text-foreground mb-1">{type.nombre}</div>
                    <div className="text-sm text-muted-foreground mb-3">{type.descripcion}</div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-foreground/80">Ejemplos:</div>
                      <div className="flex flex-wrap gap-1">
                        {type.examples.map((example: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>

                      <div className="text-xs font-medium text-foreground/80 mt-2">Funcionalidades comunes:</div>
                      <div className="text-xs text-muted-foreground">
                        {type.commonFeatures.join(" - ")}
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

export { BUSINESS_TYPES };
