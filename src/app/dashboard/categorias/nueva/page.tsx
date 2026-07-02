"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Save, X } from "lucide-react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Esquema de validación para el formulario
const categoriaFormSchema = z.object({
  nombre: z
    .string()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(50, { message: "El nombre no puede tener más de 50 caracteres" }),
  descripcion: z
    .string()
    .max(200, { message: "La descripción no puede tener más de 200 caracteres" })
    .optional()
    .or(z.literal("")),
});

type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;

export default function NuevaCategoriaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Definir valores por defecto para el formulario
  const defaultValues: Partial<CategoriaFormValues> = {
    nombre: "",
    descripcion: "",
  };

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues,
  });

  // Verificar autenticación y empresa
  useEffect(() => {
    if (status === "loading") return; // Aún cargando
    
    if (status === "unauthenticated") {
      router.push("/iniciar-sesion");
      return;
    }

    if (session && !session.user?.empresaId) {
      toast({
        title: "Error de configuración",
        description: "No se pudo identificar su empresa. Contacte al administrador.",
        variant: "destructive",
      });
      router.push("/dashboard/empresas");
      return;
    }
  }, [session, status, router, toast]);

  async function onSubmit(data: CategoriaFormValues) {
    // Verificación adicional antes del envío
    if (!session?.user?.empresaId) {
      toast({
        title: "Error de sesión",
        description: "No se pudo identificar su empresa. Inicie sesión nuevamente.",
        variant: "destructive",
      });
      router.push("/iniciar-sesion");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/categorias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: data.nombre.trim(),
          descripcion: data.descripcion?.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || "Error al crear la categoría");
      }

      const categoria = await response.json();
      
      toast({
        title: "¡Categoría creada exitosamente!",
        description: `La categoría "${categoria.nombre}" ha sido creada correctamente`,
      });

      // Redireccionar al listado de categorías
      router.push("/dashboard/categorias");
      router.refresh();
    
    } finally {
      setIsSubmitting(false);
    }
  }

  // Mostrar loading mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // No mostrar el formulario si no hay sesión válida
  if (status === "unauthenticated" || !session?.user?.empresaId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/categorias">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:bg-muted transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Nueva Categoría</h1>
            <p className="text-muted-foreground">
              Crea una nueva categoría para organizar tus productos
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="border border-border shadow-sm bg-card">
        <CardHeader className="pb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Save className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold text-card-foreground">
                Información de la Categoría
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground mt-1">
                Completa los campos a continuación para crear una nueva categoría
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <Separator className="mx-6" />

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground">
                        Nombre de la Categoría *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Electrónicos, Ropa, Hogar..."
                          className="h-11 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Este será el nombre visible para organizar tus productos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-foreground">
                        Descripción
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe brevemente qué tipo de productos incluirá esta categoría (opcional)"
                          className="resize-none h-24 bg-background border-input focus:border-ring transition-colors duration-200"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Información adicional que ayude a identificar el propósito de la categoría
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <Link href="/dashboard/categorias">
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
                  className="w-full sm:w-auto h-11 px-8 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Crear Categoría
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-500/10/50 border-blue-500/30/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Consejo
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Crea categorías específicas pero no demasiado granulares. Por ejemplo, "Electrónicos" 
                es mejor que "Smartphones Samsung Galaxy".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}