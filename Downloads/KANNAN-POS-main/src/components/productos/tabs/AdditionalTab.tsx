import { useState, useCallback, useEffect } from "react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { BarChart3, QrCode, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues } from "@/types/producto";

interface AdditionalTabProps {
  form: UseFormReturn<ProductoFormValues>;
  isEditing?: boolean;
}

export function AdditionalTab({ form, isEditing = false }: AdditionalTabProps) {
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);
  const { toast } = useToast();

  const watchedCodigoBarras = form.watch("codigoBarras");
  const watchedImagenCodigoBarras = form.watch("imagenCodigoBarras");

  // Generar imagen del código de barras existente al cargar (solo en modo edición)
  useEffect(() => {
    if (isEditing && watchedCodigoBarras && !watchedImagenCodigoBarras) {
      // Si existe código de barras pero no imagen, generarla
      generateBarcodeImage(watchedCodigoBarras).then((image) => {
        form.setValue("imagenCodigoBarras", image, { shouldDirty: false });
      }).catch((error) => {
        console.error('Error al generar imagen del código existente:', error);
      });
    }
  }, [isEditing, watchedCodigoBarras, watchedImagenCodigoBarras]);

  // Función para generar código de barras EAN-13
  const generateEAN13 = useCallback(() => {
    // Generar 12 dígitos aleatorios
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    // Calcular dígito de control
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }, []);

  // Función mejorada para generar imagen del código de barras EAN-13
  const generateBarcodeImage = useCallback(async (barcode: string) => {
    if (!barcode || barcode.length !== 13) {
      throw new Error('El código de barras debe tener 13 dígitos');
    }

    setIsGeneratingBarcode(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo crear el contexto del canvas');

      // Configurar canvas con dimensiones apropiadas para EAN-13
      canvas.width = 260;
      canvas.height = 120;
      
      // Fondo blanco
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Patrones de codificación EAN-13 (simplificado)
      const leftPattern = ['0001101', '0011001', '0010011', '0111101', '0100011', 
                          '0110001', '0101111', '0111011', '0110111', '0001011'];
      const rightPattern = ['1110010', '1100110', '1101100', '1000010', '1011100',
                           '1001110', '1010000', '1000100', '1001000', '1110100'];

      // Dibujar las barras
      const barWidth = 2;
      const barHeight = 70;
      const startX = 20;
      const startY = 10;
      let x = startX;

      // Guard bars iniciales (101)
      ctx.fillStyle = 'black';
      ctx.fillRect(x, startY, barWidth, barHeight);
      x += barWidth * 2;
      ctx.fillRect(x, startY, barWidth, barHeight);
      x += barWidth * 2;

      // Primera mitad (6 dígitos)
      for (let i = 0; i < 6; i++) {
        const digit = parseInt(barcode[i]);
        const pattern = leftPattern[digit];
        
        for (const bit of pattern) {
          if (bit === '1') {
            ctx.fillRect(x, startY, barWidth, barHeight);
          }
          x += barWidth;
        }
      }

      // Guard bars centrales (01010)
      x += barWidth;
      ctx.fillRect(x, startY, barWidth, barHeight);
      x += barWidth * 2;
      ctx.fillRect(x, startY, barWidth, barHeight);
      x += barWidth * 2;

      // Segunda mitad (6 dígitos)
      for (let i = 6; i < 12; i++) {
        const digit = parseInt(barcode[i]);
        const pattern = rightPattern[digit];
        
        for (const bit of pattern) {
          if (bit === '1') {
            ctx.fillRect(x, startY, barWidth, barHeight);
          }
          x += barWidth;
        }
      }

      // Dígito de control
      const digit = parseInt(barcode[12]);
      const pattern = rightPattern[digit];
      for (const bit of pattern) {
        if (bit === '1') {
          ctx.fillRect(x, startY, barWidth, barHeight);
        }
        x += barWidth;
      }

      // Guard bars finales (101)
      x += barWidth;
      ctx.fillRect(x, startY, barWidth, barHeight);
      x += barWidth * 2;
      ctx.fillRect(x, startY, barWidth, barHeight);

      // Agregar el texto del código
      ctx.fillStyle = 'black';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(barcode, canvas.width / 2, startY + barHeight + 25);

      // Convertir a base64
      const imageData = canvas.toDataURL('image/png');
      return imageData;
    } catch (error) {
      console.error('Error generando imagen del código de barras:', error);
      throw error;
    } finally {
      setIsGeneratingBarcode(false);
    }
  }, []);

  // Función para generar nuevo código de barras
  const handleGenerateBarcode = async () => {
    try {
      const newBarcode = generateEAN13();
      
      // Generar la imagen
      const barcodeImage = await generateBarcodeImage(newBarcode);
      
      // Establecer ambos valores en el formulario
      form.setValue("codigoBarras", newBarcode, { shouldValidate: true, shouldDirty: true });
      form.setValue("imagenCodigoBarras", barcodeImage, { shouldValidate: true, shouldDirty: true });
      
      toast({
        title: "Código de barras generado",
        description: `Código EAN-13: ${newBarcode}`,
      });
    } catch (error) {
      console.error('Error completo:', error);
      toast({
        title: "Error",
        description: "Error al generar el código de barras",
        variant: "destructive",
      });
    }
  };

  // Función para regenerar imagen del código actual
  const handleRegenerateImage = async () => {
    const currentBarcode = form.getValues("codigoBarras");
    
    if (!currentBarcode) {
      toast({
        title: "Error",
        description: "No hay código de barras para regenerar",
        variant: "destructive",
      });
      return;
    }

    if (currentBarcode.length !== 13) {
      toast({
        title: "Error",
        description: "El código de barras debe tener 13 dígitos",
        variant: "destructive",
      });
      return;
    }

    try {
      const barcodeImage = await generateBarcodeImage(currentBarcode);
      form.setValue("imagenCodigoBarras", barcodeImage, { shouldValidate: true, shouldDirty: true });
      
      toast({
        title: "Imagen regenerada",
        description: "La imagen del código de barras se ha regenerado correctamente",
      });
    } catch (error) {
      console.error('Error completo:', error);
      toast({
        title: "Error",
        description: "Error al regenerar la imagen del código de barras",
        variant: "destructive",
      });
    }
  };

  // Función para descargar imagen del código de barras
  const handleDownloadBarcode = () => {
    const imagenCodigoBarras = form.getValues("imagenCodigoBarras");
    const codigoBarras = form.getValues("codigoBarras");
    const productName = form.getValues("nombre") || "producto";
    
    if (imagenCodigoBarras) {
      const link = document.createElement('a');
      link.download = `codigo_barras_${codigoBarras || productName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = imagenCodigoBarras;
      link.click();
      
      toast({
        title: "Descarga iniciada",
        description: "El código de barras se está descargando",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Sección SKU */}
      <div className="p-6 bg-blue-500/10/50 rounded-lg border border-blue-500/30/50">
        <h4 className="text-base font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Código SKU (Generado Automáticamente)
        </h4>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  SKU *
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SKU único del producto" 
                    className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                    readOnly
                    {...field} 
                  />
                </FormControl>
                <FormDescription className="text-sm text-muted-foreground">
                  Código único generado automáticamente basado en el nombre del producto
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Sección Código de Barras */}
      <div className="p-6 bg-emerald-500/10/50 rounded-lg border border-emerald-500/30/50">
        <h4 className="text-base font-semibold text-green-900 mb-4 flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Código de Barras EAN-13
        </h4>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="codigoBarras"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium text-foreground">
                  Código de Barras
                </FormLabel>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Input 
                      placeholder="Código de barras (opcional)" 
                      className="h-11 bg-background border-input focus:border-ring transition-colors duration-200 flex-1"
                      maxLength={13}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      {...field} 
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateBarcode}
                    disabled={isGeneratingBarcode}
                    className="h-11 px-6 bg-background hover:bg-muted transition-colors duration-200 whitespace-nowrap"
                  >
                    {isGeneratingBarcode ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        Generando...
                      </div>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        {isEditing ? "Generar Nuevo" : "Generar Código"}
                      </>
                    )}
                  </Button>
                </div>
                <FormDescription className="text-sm text-muted-foreground">
                  Código EAN-13 estándar de 13 dígitos para identificación del producto
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mostrar imagen del código de barras si existe */}
          {watchedImagenCodigoBarras && (
            <div className="mt-4 p-4 bg-card dark:bg-background rounded-lg border border-emerald-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-green-900">
                  Vista previa del código de barras:
                </span>
                <div className="flex gap-2">
                  {watchedCodigoBarras && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRegenerateImage}
                      disabled={isGeneratingBarcode}
                      className="h-8 px-3 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Regenerar Imagen
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadBarcode}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Descargar
                  </Button>
                </div>
              </div>
              <div className="flex justify-center p-4 bg-muted/50 rounded">
                <img
                  src={watchedImagenCodigoBarras}
                  alt="Código de barras generado"
                  className="max-w-full h-auto"
                />
              </div>
              {watchedCodigoBarras && (
                <p className="text-center mt-2 text-sm text-muted-foreground font-mono">
                  {watchedCodigoBarras}
                </p>
              )}
            </div>
          )}

          {!watchedCodigoBarras && (
            <div className="text-center p-4 bg-card dark:bg-background rounded-lg border border-emerald-500/30">
              <QrCode className="h-12 w-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-700 dark:text-green-400 mb-2 font-medium">
                ¿No tienes código de barras?
              </p>
              <p className="text-xs text-muted-foreground">
                Genera un código EAN-13 válido automáticamente haciendo clic en "Generar Código"
              </p>
            </div>
          )}
        </div>

        {/* Campo oculto para la imagen del código de barras */}
        <FormField
          control={form.control}
          name="imagenCodigoBarras"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input type="hidden" {...field} value={field.value || ""} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Estado del producto */}
      <FormField
        control={form.control}
        name="activo"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/50">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium text-foreground">
                Producto Activo
              </FormLabel>
              <FormDescription className="text-sm text-muted-foreground">
                Los productos inactivos no aparecerán en el punto de venta
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}