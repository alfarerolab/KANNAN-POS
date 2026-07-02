import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertCircle, Weight, Package, Ruler, Droplets } from "lucide-react";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues } from "@/types/producto";
import { VencimientosManager } from "../VencimientosManager";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";

interface InventoryTabProps {
  form: UseFormReturn<ProductoFormValues>;
}

export function InventoryTab({ form }: InventoryTabProps) {
  const precio = form.watch("precio");
  const precioCosto = form.watch("precioCosto");
  const margenGanancia = form.watch("margenGanancia");
  const tieneIva = form.watch("tieneIva");
  const tarifaIva = form.watch("tarifaIva");
  const tipoVenta = form.watch("tipoVenta");
  const precioSugerido = form.watch("precioSugerido");
  const precioPorKilo = form.watch("precioPorKilo");
  const precioPorMetro = form.watch("precioPorMetro");
  const precioPorLitro = form.watch("precioPorLitro");

  const [precioCostoTouched, setPrecioCostoTouched] = useState(false);

  // Obtener configuración de la empresa
  const { tieneVencimientos } = useConfiguracionEmpresa();

  const esPrecioLibre = tipoVenta === "PRECIO_LIBRE";
  const esPorPeso = tipoVenta === "PESO";
  const esPorMetro = tipoVenta === "METRO";
  const esPorLitro = tipoVenta === "LITRO";

  // Calcular precio automáticamente SOLO cuando hay margen de ganancia
  useEffect(() => {
    // SOLO calcular si hay margen Y costo (no cuando solo hay costo)
    if (precioCosto && margenGanancia && margenGanancia.trim() !== "") {
      const costoNum = Number.parseFloat(precioCosto);
      const margenNum = Number.parseFloat(margenGanancia);

      if (!isNaN(costoNum) && !isNaN(margenNum) && costoNum > 0 && margenNum >= 0) {
        const precioCalculado = costoNum * (1 + margenNum / 100);

        // Para productos por peso, el precio calculado es el precio por kilo
        if (esPorPeso) {
          form.setValue("precioPorKilo", precioCalculado.toFixed(2));
        } else if (esPorMetro) {
          // Para productos por metro, el precio calculado es el precio por metro
          form.setValue("precioPorMetro", precioCalculado.toFixed(2));
        } else if (esPorLitro) {
          // Para productos por litro, el precio calculado es el precio por litro
          form.setValue("precioPorLitro", precioCalculado.toFixed(2));
        } else if (esPrecioLibre) {
          // Para precio libre, calculamos el precio sugerido
          form.setValue("precioSugerido", precioCalculado.toFixed(2));
        } else {
          // Para otros tipos, calculamos el precio normal
          form.setValue("precio", precioCalculado.toFixed(2));
        }
      }
    }
    // NO hacemos nada si el margen está vacío - dejamos que el usuario ingrese el precio manualmente
  }, [precioCosto, margenGanancia, form, esPrecioLibre, esPorPeso, esPorMetro, esPorLitro]);

  // Función para calcular el margen actual
  const calcularMargenActual = () => {
    // Para precio libre, usar precio sugerido si está disponible
    let precioParaCalculo = null;

    if (esPrecioLibre) {
      precioParaCalculo = (precioSugerido && precioSugerido !== "" ? Number.parseFloat(precioSugerido) : null);
    } else if (esPorPeso) {
      precioParaCalculo = (precioPorKilo && precioPorKilo !== "" ? Number.parseFloat(precioPorKilo) : null);
    } else if (esPorMetro) {
      precioParaCalculo = (precioPorMetro && precioPorMetro !== "" ? Number.parseFloat(precioPorMetro) : null);
    } else if (esPorLitro) {
      precioParaCalculo = (precioPorLitro && precioPorLitro !== "" ? Number.parseFloat(precioPorLitro) : null);
    } else {
      precioParaCalculo = (precio && precio !== "" ? Number.parseFloat(precio) : null);
    }

    const costoNum = Number.parseFloat(precioCosto || "0");

    if (costoNum > 0 && precioParaCalculo && precioParaCalculo > 0) {
      // CORREGIDO: Margen = ((Precio - Costo) / Costo) * 100
      const margen = ((precioParaCalculo - costoNum) / costoNum) * 100;
      return margen.toFixed(2);
    }
    return null;
  };

  const margenCalculado = calcularMargenActual();

  // Función para obtener el tipo de unidad de medida
  const getUnidadMedida = () => {
    if (esPorPeso) return { label: "kg", icon: Weight };
    if (esPorMetro) return { label: "m", icon: Ruler };
    if (esPorLitro) return { label: "L", icon: Droplets };
    return { label: "unidad", icon: Package };
  };

  const unidadInfo = getUnidadMedida();
  const IconoUnidad = unidadInfo.icon;

  return (
    <div className="space-y-6">
      {/* Alerta para precio libre - SOLO si es precio libre */}
      {esPrecioLibre && (
        <Alert className="bg-orange-500/10 border-orange-500/30">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            <strong>Producto de precio libre:</strong> El precio de venta se definirá en el momento de la venta.
            Solo es obligatorio el <strong>precio de costo</strong>. El precio sugerido y margen son opcionales y servirán como referencia.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta para productos por peso - SOLO si es por peso */}
      {esPorPeso && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30">
          <Weight className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            <strong>Producto por peso:</strong> El stock se maneja en <strong>kilogramos (kg)</strong>.
            El precio de venta es <strong>por kilo</strong> y se calculará automáticamente según el peso vendido.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta para productos por metro - SOLO si es por metro */}
      {esPorMetro && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30">
          <Ruler className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            <strong>Producto por metro:</strong> El stock se maneja en <strong>metros</strong>.
            El precio de venta es <strong>por metro</strong> y se calculará automáticamente según los metros vendidos.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta para productos por litro - SOLO si es por litro */}
      {esPorLitro && (
        <Alert className="bg-purple-500/10 border-purple-500/30">
          <Droplets className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-800">
            <strong>Producto por litro:</strong> El stock se maneja en <strong>litros</strong>.
            El precio de venta es <strong>por litro</strong> y se calculará automáticamente según los litros vendidos.
          </AlertDescription>
        </Alert>
      )}

      {/* Sección de costo y margen */}
      <div className="p-6 bg-blue-500/10/50 rounded-lg border border-blue-500/30/50 space-y-4">
        <h4 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {esPrecioLibre ? "Precio de Costo (Obligatorio)" : "Costo y Margen de Ganancia"}
        </h4>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="precioCosto"
            render={({ field }) => (
              <FormItem className={esPrecioLibre ? "md:col-span-2" : ""}>
                <FormLabel className="text-base font-medium text-foreground">
                  Precio de Costo {(esPrecioLibre || esPorPeso || esPorMetro || esPorLitro) ? "*" : ""}
                  {esPorPeso && " (por kg)"}
                  {esPorMetro && " (por metro)"}
                  {esPorLitro && " (por litro)"}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="pl-7 h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        setPrecioCostoTouched(true);
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription className={(esPrecioLibre || esPorPeso || esPorMetro || esPorLitro) && (!precioCosto || precioCosto.trim() === "") && precioCostoTouched ? "text-orange-700 dark:text-orange-400 font-medium" : "text-sm text-muted-foreground"}>
                  {esPorPeso
                    ? ((!precioCosto || precioCosto.trim() === "") && precioCostoTouched
                        ? "⚠️ Campo obligatorio - Costo por kilogramo del producto"
                        : "Costo por kilogramo del producto")
                    : esPorMetro
                      ? ((!precioCosto || precioCosto.trim() === "") && precioCostoTouched
                          ? "⚠️ Campo obligatorio - Costo por metro del producto"
                          : "Costo por metro del producto")
                      : esPorLitro
                        ? ((!precioCosto || precioCosto.trim() === "") && precioCostoTouched
                            ? "⚠️ Campo obligatorio - Costo por litro del producto"
                            : "Costo por litro del producto")
                        : esPrecioLibre
                          ? ((!precioCosto || precioCosto.trim() === "") && precioCostoTouched
                              ? "⚠️ Campo obligatorio - Costo de adquisición del producto"
                              : "Costo de adquisición del producto")
                          : "Costo del producto para calcular margen de ganancia"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {!esPrecioLibre && precioCosto && Number.parseFloat(precioCosto) > 0 && (
            <FormField
              control={form.control}
              name="margenGanancia"
              render={({ field }) => (
                <FormItem className={esPrecioLibre ? "md:col-span-2" : ""}>
                  <FormLabel className="text-base font-medium text-foreground">
                    Margen de Ganancia (%) {esPrecioLibre && "- Opcional"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.0"
                      className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                      {...field}
                      onChange={(e) => {
                        // Permitir borrar el campo completamente
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground">
                    {esPorPeso
                      ? "Al escribir un margen, se calculará automáticamente el precio por kilo"
                      : esPorMetro
                        ? "Al escribir un margen, se calculará automáticamente el precio por metro"
                        : esPorLitro
                          ? "Al escribir un margen, se calculará automáticamente el precio por litro"
                          : esPrecioLibre
                            ? "Opcional: Al ingresar un margen, se calculará automáticamente el precio sugerido"
                            : "Al escribir un margen, se calculará automáticamente el precio de venta"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Mostrar margen actual si hay datos */}
        {margenCalculado && (
          <Alert className="bg-emerald-500/10 border-emerald-500/30">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300 flex items-center gap-2">
              <span className="font-medium">Margen de ganancia {esPrecioLibre ? "sugerido" : "actual"}:</span>
              <Badge variant="secondary" className="bg-emerald-500/15 text-green-800 dark:text-green-300">
                {margenCalculado}%
              </Badge>
              {esPrecioLibre && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  (calculado con precio sugerido)
                </span>
              )}
              {esPorPeso && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  (sobre precio por kilo)
                </span>
              )}
              {esPorMetro && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  (sobre precio por metro)
                </span>
              )}
              {esPorLitro && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                  (sobre precio por litro)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Precio por kilo - SOLO para productos por PESO */}
      {esPorPeso && (
        <FormField
          control={form.control}
          name="precioPorKilo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                <Weight className="h-4 w-4 text-emerald-600" />
                Precio por Kilogramo *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 h-11 bg-emerald-500/10 border-emerald-500/30 focus:border-emerald-500 transition-colors duration-200"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-sm text-muted-foreground">
                {margenGanancia && margenGanancia.trim() !== "" && precioCosto ?
                  "Precio calculado automáticamente por kilo. Puedes editarlo manualmente si es necesario." :
                  "Precio de venta por kilogramo - se multiplicará por el peso vendido"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Precio por metro - SOLO para productos por METRO */}
      {esPorMetro && (
        <FormField
          control={form.control}
          name="precioPorMetro"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                <Ruler className="h-4 w-4 text-green-600 dark:text-green-400" />
                Precio por Metro *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 h-11 bg-emerald-500/10 border-emerald-500/30 focus:border-green-500 transition-colors duration-200"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-sm text-muted-foreground">
                {margenGanancia && margenGanancia.trim() !== "" && precioCosto ?
                  "Precio calculado automáticamente por metro. Puedes editarlo manualmente si es necesario." :
                  "Precio de venta por metro - se multiplicará por los metros vendidos"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Precio por litro - SOLO para productos por LITRO */}
      {esPorLitro && (
        <FormField
          control={form.control}
          name="precioPorLitro"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground flex items-center gap-2">
                <Droplets className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Precio por Litro *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 h-11 bg-purple-500/10 border-purple-500/30 focus:border-purple-500 transition-colors duration-200"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-sm text-muted-foreground">
                {margenGanancia && margenGanancia.trim() !== "" && precioCosto ?
                  "Precio calculado automáticamente por litro. Puedes editarlo manualmente si es necesario." :
                  "Precio de venta por litro - se multiplicará por los litros vendidos"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Precio de venta - SOLO para productos normales (NO peso, NO metro, NO litro, NO precio libre) */}
      {!esPrecioLibre && !esPorPeso && !esPorMetro && !esPorLitro && (
        <FormField
          control={form.control}
          name="precio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground">
                Precio de Venta *
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-sm text-muted-foreground">
                {margenGanancia && margenGanancia.trim() !== "" && precioCosto ?
                  "Precio calculado automáticamente. Puedes editarlo manualmente si es necesario." :
                  "Precio de venta al público"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Precio sugerido - SOLO para precio libre */}
      {esPrecioLibre && (
        <FormField
          control={form.control}
          name="precioSugerido"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium text-foreground">
                Precio Sugerido (Opcional)
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7 h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-sm text-muted-foreground">
                Precio de referencia que se mostrará al vendedor en el POS (no obligatorio)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Configuración de IVA */}
      <div className="p-6 bg-orange-500/10/50 rounded-lg border border-orange-500/30/50 space-y-4">
        <h4 className="text-base font-semibold text-orange-900 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Configuración de IVA
        </h4>

        {/* Switch ¿El producto tiene IVA? */}
        <FormField
          control={form.control}
          name="tieneIva"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
              <div className="space-y-0.5">
                <FormLabel className="text-base font-medium text-foreground">
                  ¿El producto tiene IVA?
                </FormLabel>
                <FormDescription className="text-sm text-muted-foreground">
                  Activa esta opción si el producto debe incluir IVA
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    if (!value) {
                      form.setValue("tarifaIva", "");
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Input manual de tarifa IVA */}
        {tieneIva && (
          <FormField
            control={form.control}
            name="tarifaIva"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  Tarifa de IVA (%)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Ej: 19, 5, 0"
                    className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-sm text-muted-foreground">
                  Ingresa la tarifa de IVA manualmente (Ej: 19 para 19%, 5 para 5%, 0 para exento)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Stock */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
            <IconoUnidad className={`h-5 w-5 ${
              esPorPeso ? 'text-emerald-600' :
              esPorMetro ? 'text-green-600 dark:text-green-400' :
              esPorLitro ? 'text-purple-600 dark:text-purple-400' : ''
            }`} />
            Control de Inventario
            {esPorPeso && " (en kilogramos)"}
            {esPorMetro && " (en metros)"}
            {esPorLitro && " (en litros)"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {esPorPeso
              ? "Gestiona el peso disponible del producto en kilogramos"
              : esPorMetro
                ? "Gestiona los metros disponibles del producto"
                : esPorLitro
                  ? "Gestiona los litros disponibles del producto"
                  : "Gestiona las cantidades disponibles del producto"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="enStock"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  {esPorPeso ? "Stock Actual (kg) *" :
                   esPorMetro ? "Stock Actual (m) *" :
                   esPorLitro ? "Stock Actual (L) *" :
                   "Stock Actual *" }
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step={(esPorPeso || esPorMetro || esPorLitro) ? "0.001" : "1"}
                      placeholder={(esPorPeso || esPorMetro || esPorLitro) ? "0.000" : "0"}
                      className={`h-11 bg-background border-input focus:border-ring transition-colors duration-200 ${(esPorPeso || esPorMetro || esPorLitro) ? 'pr-12' : ''}`}
                      {...field}
                    />
                    {(esPorPeso || esPorMetro || esPorLitro) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {unidadInfo.label}
                      </span>
                    )}
                  </div>
                </FormControl>
                <FormDescription className="text-sm text-muted-foreground">
                  {esPorPeso
                    ? "Peso disponible en inventario (kilogramos con hasta 3 decimales)"
                    : esPorMetro
                      ? "Metros disponibles en inventario (con hasta 3 decimales)"
                      : esPorLitro
                        ? "Litros disponibles en inventario (con hasta 3 decimales)"
                        : "Cantidad disponible en inventario"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stockMinimo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  {esPorPeso ? "Stock Mínimo (kg) *" :
                   esPorMetro ? "Stock Mínimo (m) *" :
                   esPorLitro ? "Stock Mínimo (L) *" :
                   "Stock Mínimo *" }
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step={(esPorPeso || esPorMetro || esPorLitro) ? "0.001" : "1"}
                      placeholder={(esPorPeso || esPorMetro || esPorLitro) ? "5.000" : "5"}
                      className={`h-11 bg-background border-input focus:border-ring transition-colors duration-200 ${(esPorPeso || esPorMetro || esPorLitro) ? 'pr-12' : ''}`}
                      {...field}
                    />
                    {(esPorPeso || esPorMetro || esPorLitro) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {unidadInfo.label}
                      </span>
                    )}
                  </div>
                </FormControl>
                <FormDescription className="text-sm text-muted-foreground">
                  {esPorPeso
                    ? "Recibirás alertas cuando el peso sea menor a este valor"
                    : esPorMetro
                      ? "Recibirás alertas cuando los metros sean menores a este valor"
                      : esPorLitro
                        ? "Recibirás alertas cuando los litros sean menores a este valor"
                        : "Recibirás alertas cuando el stock sea menor a este valor"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Información adicional para productos por unidades de medida */}
        {(esPorPeso || esPorMetro || esPorLitro) && (
          <Alert className={
            esPorPeso ? "bg-blue-500/10 border-blue-500/30" :
            esPorMetro ? "bg-emerald-500/10 border-emerald-500/30" :
            "bg-purple-500/10 border-purple-500/30"
          }>
            <AlertCircle className={`h-4 w-4 ${
              esPorPeso ? "text-blue-600 dark:text-blue-400" :
              esPorMetro ? "text-green-600 dark:text-green-400" :
              "text-purple-600 dark:text-purple-400"
            }`} />
            <AlertDescription className={
              esPorPeso ? "text-blue-800 dark:text-blue-300" :
              esPorMetro ? "text-green-800 dark:text-green-300" :
              "text-purple-800"
            }>
              <strong>Nota importante:</strong> El stock se descuenta automáticamente según {
                esPorPeso ? "el peso vendido. Por ejemplo, si vendes 2.5 kg, el stock se reduce en 2.5 kg." :
                esPorMetro ? "los metros vendidos. Por ejemplo, si vendes 3.5 m, el stock se reduce en 3.5 m." :
                "los litros vendidos. Por ejemplo, si vendes 1.5 L, el stock se reduce en 1.5 L."
              }
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Sección de Gestión de Vencimientos */}
      <div className="p-6 bg-emerald-500/10/50 rounded-lg border border-emerald-500/30/50">
        <VencimientosManager
          form={form}
          habilitado={tieneVencimientos()}
        />
      </div>
    </div>
  );
}
