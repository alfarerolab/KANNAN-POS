"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Beer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ComboForm } from "@/components/productos/ComboForm";
import { useCategories } from "@/hooks/useCategories";

export default function NuevoComboPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { categorias } = useCategories();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Formatear data de combo para el backend
      const payload = {
        ...data,
        esCombo: true,
        precioCosto: 0, // Ignoramos el costo base
        enStock: 0, // En combos el stock se calcula por sus componentes,
        stockMinimo: 0,
        tipoVenta: "UNIDAD",
      };

      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || "Error al crear el combo");
      }

      toast({
        title: "¡Éxito!",
        description: "El combo ha sido creado correctamente.",
      });
      
      router.push("/dashboard/productos");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error inesperado al crear el combo";
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
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nuevo Combo</h1>
            <p className="text-muted-foreground">
              Arma un paquete o promoción con productos existentes
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="product-form border border-orange-500/30 shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-sm">
              <Beer className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Configuración del Combo
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Nombra tu combo, asígnale un precio y selecciona sus componentes
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6 border-orange-100" />

        <CardContent className="pt-6">
          <ComboForm
            categorias={categorias}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
