import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues, Categoria } from "@/types/producto";

interface Proveedor {
  id: string;
  nombre: string;
  empresa?: string | null;
}

interface GeneralTabProps {
  form: UseFormReturn<ProductoFormValues>;
  categorias: Categoria[];
  proveedores: Proveedor[];
}

export function GeneralTab({ form, categorias, proveedores }: GeneralTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <FormField
        control={form.control}
        name="nombre"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="text-base font-medium text-foreground">
              Nombre del Producto *
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="Ingresa el nombre del producto" 
                className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="descripcion"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="text-base font-medium text-foreground">
              Descripción
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descripción detallada del producto (opcional)"
                className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-sm text-muted-foreground">
              Información adicional que ayude a identificar el producto
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="categoriaId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium text-foreground">
              Categoría
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "sin-categoria"}
            >
              <FormControl>
                <SelectTrigger className="h-11 bg-background border-input focus:border-ring transition-colors duration-200">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sin-categoria">Sin categoría</SelectItem>
                {categorias?.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="proveedorId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium text-foreground">
              Proveedor
            </FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "sin-proveedor"}
            >
              <FormControl>
                <SelectTrigger className="h-11 bg-background border-input focus:border-ring transition-colors duration-200">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="sin-proveedor">Sin proveedor</SelectItem>
                {proveedores?.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                    {proveedor.empresa && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({proveedor.empresa})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-sm text-muted-foreground">
              Selecciona el proveedor de este producto
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="imagen"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="text-base font-medium text-foreground">
              URL de Imagen
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="https://ejemplo.com/imagen.jpg" 
                className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-sm text-muted-foreground">
              URL de una imagen para mostrar el producto
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}