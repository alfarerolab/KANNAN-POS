"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ProductForm } from "@/components/productos/ProductoForm";
import { HelpSection } from "@/components/productos/HelpSection";
import { useProductForm } from "@/hooks/useProductForm";
import { useCategories } from "@/hooks/useCategories";
import type { ProductoFormValues } from "@/types/producto";
import { useProveedores } from "@/hooks/useProveedores";

interface Categoria {
  id: string;
  nombre: string;
}

export default function NuevoProductoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { categorias } = useCategories();
  const { proveedores } = useProveedores();
  const { form, onSubmit: handleFormSubmit } = useProductForm();

  const onSubmit = async (data: ProductoFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await handleFormSubmit(data);
      toast({
        title: "¡Éxito!",
        description: "El producto ha sido creado correctamente. Ahora puedes agregar variantes.",
      });
      // Redirigir a la vista de edición para poder agregar variantes y más detalles
      // @ts-expect-error Mismatch de tipos Prisma u obj temporal
      router.push(`/dashboard/productos/${result.id}?tab=variantes`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error inesperado al crear el producto";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/productos">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuevo Producto</h1>
            <p className="text-muted-foreground">
              Crea un nuevo producto para tu inventario
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="product-form border border-border shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Información del Producto
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Completa la información para crear un nuevo producto
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <ProductForm
            form={form}
            categorias={categorias}
            proveedores={proveedores}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>

      <HelpSection />
    </div>
  );
}
