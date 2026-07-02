import { useState } from "react";
import Link from "next/link";
import { Save, X, Layers } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GeneralTab } from "./GeneralTab";
import { UnitsTab } from "./tabs/UnitsTab";
import { InventoryTab } from "./tabs/InventoryTab";
import { AdditionalTab } from "./tabs/AdditionalTab";
import { VariantesManager } from "./VariantesManager";
import { useConfiguracionEmpresa } from "@/hooks/use-configuracion-empresa";
import type { UseFormReturn } from "react-hook-form";
import type { ProductoFormValues, Categoria, Proveedor } from "@/types/producto";

interface ProductFormProps {
  form: UseFormReturn<ProductoFormValues>;
  categorias: Categoria[];
  proveedores: Proveedor[];
  onSubmit: (data: ProductoFormValues) => Promise<void>;
  isSubmitting: boolean;
  isEditing?: boolean;
  productoId?: string;
}

export function ProductForm({ form, categorias, proveedores, onSubmit, isSubmitting, isEditing = false, productoId }: ProductFormProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");
  const { configuracion } = useConfiguracionEmpresa();
  const habilitarVariantes = configuracion?.habilitarVariantes ?? false;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`w-full grid h-auto p-1 bg-muted/50 gap-1 ${
            habilitarVariantes ? "grid-cols-2 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-4"
          }`}>
            <TabsTrigger value="general" className="py-2 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium text-sm whitespace-normal h-auto min-h-[44px] text-center transition-all">
              Información General
            </TabsTrigger>
            <TabsTrigger value="unidades" className="py-2 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium text-sm whitespace-normal h-auto min-h-[44px] text-center transition-all">
              Unidades y Medidas
            </TabsTrigger>
            <TabsTrigger value="inventario" className="py-2 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium text-sm whitespace-normal h-auto min-h-[44px] text-center transition-all">
              Inventario y Precios
            </TabsTrigger>
            <TabsTrigger value="adicional" className="py-2 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium text-sm whitespace-normal h-auto min-h-[44px] text-center transition-all">
              Códigos e Imágenes
            </TabsTrigger>
            {habilitarVariantes && (
              <TabsTrigger value="variantes" className="py-2 px-2 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md font-medium flex flex-col sm:flex-row items-center justify-center gap-1 text-sm whitespace-normal h-auto min-h-[44px] text-center transition-all">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Variantes</span>
                </div>
                {!isEditing && (
                  <Badge variant="secondary" className="text-[9px] leading-tight px-1.5 py-0 h-4 bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-500/15 data-[state=active]:text-orange-100">
                    Guardar antes
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-8">
            <GeneralTab 
              form={form} 
              categorias={categorias} 
              proveedores={proveedores}
            />
          </TabsContent>

          <TabsContent value="unidades" className="space-y-6 mt-8">
            <UnitsTab form={form} />
          </TabsContent>

          <TabsContent value="inventario" className="space-y-6 mt-8">
            <InventoryTab form={form} />
          </TabsContent>

          <TabsContent value="adicional" className="space-y-6 mt-8">
            <AdditionalTab form={form} isEditing={isEditing} />
          </TabsContent>

          {habilitarVariantes && (
            <TabsContent value="variantes" className="mt-8">
              {productoId ? (
                <VariantesManager productoId={productoId} producto={{ id: productoId, nombre: form.getValues("nombre") || "", tipoVenta: (form.getValues("tipoVenta") as any) || "UNIDAD" }} />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 mt-4 text-center border-2 border-dashed rounded-lg bg-muted/50/50">
                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground">Guarda el producto primero</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                    Para poder crear y gestionar variantes (como tallas, colores o medidas), primero debes guardar la información general del producto.
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="mt-6 border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 hover:text-orange-800 dark:text-orange-300"
                    onClick={() => form.handleSubmit(onSubmit)()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Producto Ahora
                  </Button>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        <Separator />

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <Link href="/dashboard/productos">
            <Button 
              variant="outline" 
              type="button"
              className="w-full sm:w-auto h-11 px-8 border-input hover:bg-muted transition-all duration-200"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-11 px-8"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {isEditing ? "Actualizando Producto..." : "Creando Producto..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isEditing ? "Actualizar Producto" : "Crear Producto"}
              </div>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}