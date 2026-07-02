"use client";

import { useState } from "react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Plus, Trash2, AlertCircle, Package } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues, FechaVencimiento } from "@/types/producto";

interface VencimientosManagerProps {
  form: UseFormReturn<ProductoFormValues>;
  habilitado: boolean;
}

export function VencimientosManager({ form, habilitado }: VencimientosManagerProps) {
  const manejaVencimiento = form.watch("manejaVencimiento");
  const fechasVencimiento = form.watch("fechasVencimiento") || [];

  // Si la funcionalidad está deshabilitada en la configuración, mostrar alerta
  if (!habilitado) {
    return (
      <Alert className="bg-muted/50 border-border dark:border-border">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-foreground dark:text-muted-foreground/40">
          <strong>Vencimientos deshabilitados:</strong> Esta funcionalidad está deshabilitada en la configuración general del sistema.
          Para activarla, ve a <strong>Configuración → Funcionalidades</strong> y activa "Control de Vencimientos".
        </AlertDescription>
      </Alert>
    );
  }

  const agregarFechaVencimiento = () => {
    const fechasActuales = form.getValues("fechasVencimiento") || [];
    const nuevaFecha: FechaVencimiento = {
      fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
      cantidad: 0,
      lote: "",
    };
    form.setValue("fechasVencimiento", [...fechasActuales, nuevaFecha]);
  };

  const eliminarFechaVencimiento = (index: number) => {
    const fechasActuales = form.getValues("fechasVencimiento") || [];
    const nuevasFechas = fechasActuales.filter((_, i) => i !== index);
    form.setValue("fechasVencimiento", nuevasFechas);
  };

  const actualizarFechaVencimiento = (index: number, campo: keyof FechaVencimiento, valor: string | number) => {
    const fechasActuales = form.getValues("fechasVencimiento") || [];
    const nuevasFechas = [...fechasActuales];
    nuevasFechas[index] = { ...nuevasFechas[index], [campo]: valor };
    form.setValue("fechasVencimiento", nuevasFechas);
  };

  return (
    <div className="space-y-6">
      {/* Switch para activar/desactivar vencimientos */}
      <FormField
        control={form.control}
        name="manejaVencimiento"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-blue-500/10/50 border-blue-500/30">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ¿Este producto maneja fechas de vencimiento?
              </FormLabel>
              <FormDescription className="text-sm text-muted-foreground">
                Activa esta opción si deseas registrar y controlar las fechas de vencimiento del producto
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={(value) => {
                  field.onChange(value);
                  if (!value) {
                    form.setValue("fechasVencimiento", []);
                  }
                }}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Sección de fechas de vencimiento - Solo visible si está activado */}
      {manejaVencimiento && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Lotes y Fechas de Vencimiento
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Registra las diferentes fechas de vencimiento y cantidades por lote
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={agregarFechaVencimiento}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar Lote
            </Button>
          </div>

          {fechasVencimiento.length === 0 ? (
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-300">
                No hay lotes registrados. Haz clic en "Agregar Lote" para registrar las fechas de vencimiento del producto.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {fechasVencimiento.map((vencimiento, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-background space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-medium">
                      Lote {index + 1}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarFechaVencimiento(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Fecha de vencimiento */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Fecha de Vencimiento *
                      </label>
                      <Input
                        type="date"
                        value={vencimiento.fecha}
                        onChange={(e) => actualizarFechaVencimiento(index, 'fecha', e.target.value)}
                        className="h-10"
                      />
                    </div>

                    {/* Cantidad */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Cantidad *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={vencimiento.cantidad}
                        onChange={(e) => actualizarFechaVencimiento(index, 'cantidad', Number.parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10"
                      />
                    </div>

                    {/* Lote (opcional) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Número de Lote (Opcional)
                      </label>
                      <Input
                        type="text"
                        value={vencimiento.lote || ""}
                        onChange={(e) => actualizarFechaVencimiento(index, 'lote', e.target.value)}
                        placeholder="Ej: L001"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Información adicional */}
          {fechasVencimiento.length > 0 && (
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                <strong>Total de lotes:</strong> {fechasVencimiento.length} |
                <strong className="ml-2">Cantidad total:</strong>{" "}
                {fechasVencimiento.reduce((sum, v) => sum + (v.cantidad || 0), 0).toFixed(2)} unidades
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
