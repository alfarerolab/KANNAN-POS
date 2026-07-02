import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Weight, Ruler, Droplets, DollarSign, Package, Calculator, ArrowRight, Scale, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues } from "@/types/producto";

interface UnitsTabProps {
  form: UseFormReturn<ProductoFormValues>;
}

export function UnitsTab({ form }: UnitsTabProps) {
  const tipoVenta = form.watch("tipoVenta");
  const unidadBase = form.watch("unidadBase");
  const unidadVenta = form.watch("unidadVenta");
  const factorConversion = form.watch("factorConversion");
  const precioCosto = form.watch("precioCosto");

  // Limpiar campos no necesarios según el tipo de venta
  useEffect(() => {
    if (tipoVenta === "PESO") {
      // Para PESO: limpiar precio normal y usar precioPorKilo
      form.setValue("precio", "");
      form.setValue("precioPorMetro", "");
      form.setValue("precioPorLitro", "");
      form.setValue("precioSugerido", "");
    } else if (tipoVenta === "UNIDAD") {
      // Para UNIDAD: limpiar otros precios
      form.setValue("precioPorKilo", "");
      form.setValue("precioPorMetro", "");
      form.setValue("precioPorLitro", "");
      form.setValue("precioSugerido", "");
    } else if (tipoVenta === "METRO") {
      // Para METRO
      form.setValue("precio", "");
      form.setValue("precioPorKilo", "");
      form.setValue("precioPorLitro", "");
      form.setValue("precioSugerido", "");
    } else if (tipoVenta === "LITRO") {
      // Para LITRO
      form.setValue("precio", "");
      form.setValue("precioPorKilo", "");
      form.setValue("precioPorMetro", "");
      form.setValue("precioSugerido", "");
    } else if (tipoVenta === "PRECIO_LIBRE") {
      // Para PRECIO_LIBRE
      form.setValue("precio", "");
      form.setValue("precioPorKilo", "");
      form.setValue("precioPorMetro", "");
      form.setValue("precioPorLitro", "");
    }
  }, [tipoVenta, form]);

  // Calcular costo unitario basado en factor de conversión
  const calcularCostoUnitario = () => {
    const costoNum = Number.parseFloat(precioCosto || "0");
    const factorNum = Number.parseFloat(factorConversion || "0");

    if (costoNum > 0 && factorNum > 0) {
      const costoUnitario = costoNum / factorNum;
      return costoUnitario.toFixed(4);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Tipo de venta */}
      <FormField
        control={form.control}
        name="tipoVenta"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium text-foreground">
              Tipo de Venta *
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="h-11 bg-background border-input focus:border-ring transition-colors duration-200">
                  <SelectValue placeholder="Selecciona el tipo de venta" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="UNIDAD">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Por Unidad</span>
                  </div>
                </SelectItem>
                <SelectItem value="PESO">
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4" />
                    <span>Por Peso (kg)</span>
                  </div>
                </SelectItem>
                <SelectItem value="METRO">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    <span>Por Metro</span>
                  </div>
                </SelectItem>
                <SelectItem value="LITRO">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    <span>Por Litro</span>
                  </div>
                </SelectItem>
                <SelectItem value="PRECIO_LIBRE">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Precio Libre</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormDescription className="text-sm text-muted-foreground">
              Define cómo se vende este producto: por unidad, peso, medida o precio libre
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Configuración de conversión de unidades para UNIDAD */}
      {tipoVenta === "UNIDAD" && (
        <div className="p-6 bg-blue-500/10/50 rounded-lg border border-blue-500/30/50 space-y-4">
          <h4 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Configuración de Unidades de Venta
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
            Configura si vendes en una unidad diferente a la que compras. Ejemplo: Compras por cajas pero vendes por tabletas.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="unidadBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-foreground">
                    Unidad de Compra (Base)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: caja, paquete, rollo"
                      className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    La unidad en la que compras el producto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unidadVenta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium text-foreground">
                    Unidad de Venta
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: tableta, pieza, metro"
                      className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    La unidad en la que vendes el producto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {unidadBase && unidadVenta && (
              <FormField
                control={form.control}
                name="factorConversion"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-base font-medium text-foreground">
                      Factor de Conversión
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ej: 10 si 1 caja = 10 tabletas"
                        className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      Cuántas {unidadVenta}s hay en 1 {unidadBase}. Ejemplo: Si 1 caja tiene 10 tabletas, escribe 10
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Mostrar conversión visual */}
          {unidadBase && unidadVenta && factorConversion && Number.parseFloat(factorConversion) > 0 && (
            <div className="p-4 bg-card dark:bg-background rounded-lg border border-blue-500/30">
              <h5 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Conversión Configurada:
              </h5>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="bg-blue-500/15 text-blue-800 dark:text-blue-300">
                  1 {unidadBase}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
                <Badge variant="secondary" className="bg-emerald-500/15 text-green-800 dark:text-green-300">
                  {factorConversion} {unidadVenta}s
                </Badge>
              </div>

              {/* Mostrar costo unitario si hay precio de costo */}
              {precioCosto && Number.parseFloat(precioCosto) > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-500/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Costo por {unidadBase}:</span>
                      <span className="ml-2 font-medium">${Number.parseFloat(precioCosto).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costo por {unidadVenta}:</span>
                      <span className="ml-2 font-medium">${calcularCostoUnitario()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Configuraciones específicas por tipo de venta */}
      {tipoVenta === "PESO" && (
        <div className="p-6 bg-emerald-500/10/50 rounded-lg border border-emerald-500/30/50 space-y-4">
          <h4 className="text-base font-semibold text-emerald-900 mb-2 flex items-center gap-2">
            <Weight className="h-5 w-5" />
            Configuración de Venta por Peso
          </h4>
          
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <AlertCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800 dark:text-emerald-300">
              <strong>Producto por peso:</strong> El stock se maneja en <strong>kilogramos (kg)</strong>. 
              El precio por kilo y control de stock se configuran en la pestaña de <strong>Inventario y Precios</strong>.
            </AlertDescription>
          </Alert>

          {/* Requiere Balanza */}
          <FormField
            control={form.control}
            name="requiereBalanza"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-card dark:bg-background">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-medium flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600" />
                    Requiere Balanza
                  </FormLabel>
                  <FormDescription className="text-sm text-muted-foreground">
                    Activa esta opción si necesitas usar una balanza conectada para pesar el producto en el punto de venta
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}

      {tipoVenta === "METRO" && (
        <div className="p-6 bg-emerald-500/10/50 rounded-lg border border-emerald-500/30/50 space-y-4">
          <h4 className="text-base font-semibold text-green-900 mb-2 flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Configuración de Venta por Metro
          </h4>
          
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              <strong>Producto por metro:</strong> El stock se maneja en <strong>metros</strong>. 
              El precio por metro y control de stock se configuran en la pestaña de <strong>Inventario y Precios</strong>.
            </AlertDescription>
          </Alert>

          <FormField
            control={form.control}
            name="unidadBase"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  Unidad Base (Opcional)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Selecciona unidad base" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="m">Metro (m)</SelectItem>
                    <SelectItem value="cm">Centímetro (cm)</SelectItem>
                    <SelectItem value="mm">Milímetro (mm)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-muted-foreground">
                  Selecciona la unidad de medida para referencia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {tipoVenta === "LITRO" && (
        <div className="p-6 bg-purple-500/10/50 rounded-lg border border-purple-500/30/50 space-y-4">
          <h4 className="text-base font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Configuración de Venta por Litro
          </h4>
          
          <Alert className="bg-purple-500/10 border-purple-500/30">
            <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription className="text-purple-800">
              <strong>Producto por litro:</strong> El stock se maneja en <strong>litros</strong>. 
              El precio por litro y control de stock se configuran en la pestaña de <strong>Inventario y Precios</strong>.
            </AlertDescription>
          </Alert>

          <FormField
            control={form.control}
            name="unidadBase"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  Unidad Base (Opcional)
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Selecciona unidad base" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="l">Litro (l)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="gal">Galón (gal)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-sm text-muted-foreground">
                  Selecciona la unidad de medida para referencia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {tipoVenta === "PRECIO_LIBRE" && (
        <div className="p-6 bg-orange-500/10/50 rounded-lg border border-orange-500/30/50">
          <h4 className="text-base font-semibold text-orange-900 mb-2 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuración de Precio Libre
          </h4>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Este producto permite definir el precio en el momento de la venta.
            El precio configurado en la pestaña de Inventario será el precio sugerido por defecto.
          </p>
        </div>
      )}
    </div>
  );
}